'use client';

/**
 * Sessão do usuário — agora vinda da API.
 *
 * A INTERFACE PÚBLICA NÃO MUDOU. `useSessao()` continua devolvendo
 * `{ autenticado, perfil, tipoPerfil, usuario, entrar, sair }`, porque dezenas
 * de telas do painel desestruturam exatamente esses nomes: mudar a forma aqui
 * quebraria todas de uma vez. O que mudou é a ORIGEM — antes constante, agora
 * `localStorage` + `GET /auth/eu`.
 *
 * ─── por que há um store de módulo e não só `useState` ───────────────────
 *
 * `useSessao()` é chamado por AppHeader, ChatWidget, PainelShell e ainda pela
 * página de dentro do painel — quatro chamadas na MESMA tela. Com estado local
 * seriam quatro `GET /auth/eu` a cada navegação, e quatro respostas podendo
 * divergir. Com um store de módulo há uma requisição só e uma verdade só; o
 * React se inscreve nela por `useSyncExternalStore`, que já vem no React 18 e
 * resolve a hidratação (o snapshot do servidor é sempre o estado vazio, então
 * o HTML do servidor nunca discorda do primeiro render do cliente).
 *
 * O que depende da sessão:
 *  · Header — "Anunciar" e mensagens (logado) × "Entrar"/"Cadastrar"
 *  · ChatWidget — o balão só existe para quem está logado
 *  · Painel — menu e telas mudam conforme o TIPO de perfil
 */

import { useEffect, useSyncExternalStore } from 'react';
import api from '@/lib/api';
import { lerSessaoSalva, limparSessao, sair as sairNaApi } from '@/lib/dados/auth';
import { desconectar as desconectarSocket } from '@/lib/tempo-real';

const CHAVE_TOKEN = 'agropecas:token';
/* sobra do mock: ainda é o que `PerfilChaveta` grava ao pré-visualizar */
const CHAVE_PERFIL = 'agropecas:perfil';

/**
 * Os quatro perfis. Três vêm do documento da cliente (Maturacao/05 §2); o
 * quarto — `cliente` — não: é quem só compra, e o documento original nunca
 * previu essa pessoa porque assumia que todo cadastro ia anunciar algo.
 *
 * Os três primeiros têm **as mesmas funções** — a tabela §6 marca
 * Cadastrar/Anunciar/Buscar como "Sim" para os três. O que muda são os campos
 * do perfil e o vocabulário da tela: o produtor fala em propriedade, a loja em
 * atendimento, o prestador em serviços prestados.
 *
 * Por isso o painel é UM só, com variações — não três painéis. Três telas
 * quase idênticas divergiriam na primeira correção feita em só uma delas.
 *
 * `cliente` não entra nessa lógica: sem `exclusiva` porque não tem seção
 * própria no painel do vendedor, e sem `tipoPadrao` porque não anuncia. É por
 * isso que `PainelShell` manda esse tipo para `/conta` em vez de `/painel` —
 * ver `redirecionoDoPerfil` mais abaixo.
 *
 * Aqui ficou só o que é do TIPO de perfil (rótulo, ícone, atalhos). Os dados
 * da pessoa saíram: eles vêm de `GET /auth/eu`, e mantê-los aqui seria manter
 * um segundo lugar onde o nome do usuário existe — o que sempre acaba com a
 * tela mostrando o nome errado.
 */
export const PERFIS = {
  produtor: {
    tipo: 'produtor',
    rotulo: 'Produtor Rural',
    icone: 'tractor',
    /* o tipo que o botão já abre selecionado. Não é limite: os três perfis
       podem anunciar peça, serviço ou máquina (Maturacao/05 §6) — isto é só o
       palpite mais provável para poupar um clique */
    tipoPadrao: 'peca',
    /* seção exclusiva no menu */
    exclusiva: { href: '/painel/propriedade', rotulo: 'Minha propriedade', icone: 'leaf' },
  },

  loja: {
    tipo: 'loja',
    rotulo: 'Loja de Peças',
    icone: 'store',
    tipoPadrao: 'peca',
    exclusiva: { href: '/painel/atendimento', rotulo: 'Atendimento', icone: 'clock' },
  },

  prestador: {
    tipo: 'prestador',
    rotulo: 'Prestador de Serviços',
    icone: 'wrench',
    tipoPadrao: 'servico',
    exclusiva: { href: '/painel/servicos', rotulo: 'Meus serviços', icone: 'wrench' },
  },

  cliente: {
    tipo: 'cliente',
    rotulo: 'Cliente',
    icone: 'user',
  },
};

/**
 * Único lugar que decide "cliente vai para onde" — reaproveitado pela página
 * (redirecionar depois do login) e por qualquer componente que precise saber
 * sem repetir a comparação de string.
 */
export const rotaDaConta = (tipoPerfil) => (tipoPerfil === 'cliente' ? '/conta' : '/painel');

const PERFIL_PADRAO = 'produtor';

/**
 * Quem entra no painel administrativo. Vem de `papeis` — presente tanto em
 * `POST /auth/entrar` quanto em `GET /auth/eu` — e não do campo `admin`
 * (booleano só existe em `/auth/eu`; ler daqui os dois pontos de entrada
 * concordam desde o primeiro render pós-login, sem esperar a revalidação).
 */
const PAPEIS_ADMIN = ['admin', 'moderador', 'suporte'];

/* ─── store de módulo ─────────────────────────────────────────────────── */

/** estado inicial — também é o snapshot do servidor, por isso é congelado */
const VAZIO = Object.freeze({
  pronto: false,
  autenticado: false,
  dados: null,
  /* o token que gerou o estado atual. É a chave da revalidação: quem faz login
     em /entrar deixa o store com "visitante" carregado; ao chegar no /painel,
     comparar o token guardado com o do armazenamento é o que revela que a
     sessão mudou. Sem isso, o painel redirecionaria de volta para o login
     logo depois de um login bem-sucedido */
  token: null,
  /* só existe enquanto não há sessão real; ver `trocarPerfil` */
  perfilDemo: null,
});

let estado = VAZIO;
const ouvintes = new Set();

function definir(proximo) {
  estado = { ...estado, ...proximo };
  ouvintes.forEach((ouvinte) => ouvinte());
}

function inscrever(ouvinte) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

const ler = () => estado;
const lerNoServidor = () => VAZIO;

function lerTokenLocal() {
  try {
    return localStorage.getItem(CHAVE_TOKEN);
  } catch {
    /* navegação privada pode bloquear o storage: trata como visitante */
    return null;
  }
}

/**
 * Carrega a sessão: o que está no armazenamento primeiro, a API depois.
 *
 * Os dois passos existem por motivos diferentes. O armazenamento é o que
 * evita o painel piscar "deslogado" por um instante a cada recarga — ele já
 * sabe quem é a pessoa antes de qualquer requisição. E o `GET /auth/eu` é o
 * que impede a tela de confiar nisso para sempre: conta suspensa, perfil
 * renomeado ou sessão revogada só aparecem perguntando ao servidor.
 */
let carregamento = null;

function carregar() {
  if (carregamento) return carregamento;

  const token = lerTokenLocal();

  if (!token) {
    /* sem token não há o que revalidar: visitante, e pronto */
    definir({ pronto: true, autenticado: false, dados: null, token: null });
    return Promise.resolve();
  }

  /* otimista: pinta a tela com o que já se sabe enquanto o servidor confirma */
  const salva = lerSessaoSalva();
  if (salva) definir({ autenticado: true, dados: salva, token });

  carregamento = api
    .get('/auth/eu')
    /* o token é relido DEPOIS da resposta: `lib/api.js` pode tê-lo renovado no
       meio desta requisição, e guardar o antigo faria o efeito de revalidação
       achar que a sessão mudou e pedir tudo de novo */
    .then((dados) => definir({ pronto: true, autenticado: true, dados, token: lerTokenLocal() }))
    .catch((erro) => {
      /* API fora do ar não é sessão inválida. Derrubar o login porque a rede
         piscou obrigaria a pessoa a digitar a senha de novo por um problema
         que não é dela — mantém-se o que estava salvo e tenta-se de novo na
         próxima navegação */
      if (erro?.codigo === 'SEM_CONEXAO') {
        definir({ pronto: true, token: lerTokenLocal() });
        return;
      }

      /* 401 de token vencido já foi tratado em `lib/api.js` (renovou ou mandou
         para /entrar). Chegar aqui é token inválido ou conta bloqueada — a
         tela não pode continuar mostrando o painel de alguém */
      limparSessao();
      definir({ pronto: true, autenticado: false, dados: null, token: null });
    })
    .finally(() => {
      carregamento = null;
    });

  return carregamento;
}

/* ─── montagem do que a tela consome ──────────────────────────────────── */

/** "Fazenda Santa Luzia" → "FS": o avatar é textual, não há foto obrigatória */
function iniciaisDe(nome = '') {
  const partes = String(nome).trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function montarUsuario(dados, perfilTipo) {
  if (!dados) return null;

  const { usuario, perfil } = dados;
  /* o nome de exibição é o do perfil (nome fantasia da loja, nome da fazenda);
     o da conta é o fallback para perfil recém-criado, ainda sem apelido */
  const nome = perfil?.nomeExibicao || usuario?.nome || '';

  return {
    id: usuario?.id,
    nome,
    slug: perfil?.slug || '',
    iniciais: iniciaisDe(nome),
    /* `GET /auth/eu` e `/auth/entrar` já devolvem `perfil.municipio.nome` —
       o cabeçalho do painel escreve "Sorriso · MT" sem chamada extra */
    cidade: perfil?.municipio?.nome || null,
    municipioId: perfil?.municipioId || null,
    uf: perfil?.municipio?.uf || perfil?.uf || null,
    verificado: Boolean(perfil?.verificado),
    email: usuario?.email || '',
    telefone: usuario?.telefone || '',
    emailVerificado: Boolean(usuario?.emailVerificado),
    perfil: PERFIS[perfilTipo]?.rotulo || '',
  };
}

export function useSessao() {
  const atual = useSyncExternalStore(inscrever, ler, lerNoServidor);

  useEffect(() => {
    /* o store é de módulo: a segunda tela que chamar este hook encontra o
       carregamento já feito e NÃO repete a requisição. Só recarrega quando
       nunca carregou ou quando o token do armazenamento não é mais o que
       gerou este estado — login, logout e renovação caem aqui */
    if (!estado.pronto || estado.token !== lerTokenLocal()) carregar();
  });

  const autenticado = atual.autenticado;

  /* com sessão real o tipo vem do cadastro; sem ela, do seletor provisório */
  const tipoPerfil =
    (autenticado ? atual.dados?.perfil?.tipo : atual.perfilDemo) || PERFIL_PADRAO;

  const perfil = PERFIS[tipoPerfil] || PERFIS[PERFIL_PADRAO];

  const papeis = (autenticado && atual.dados?.papeis) || [];
  const ehAdmin = papeis.some((papel) => PAPEIS_ADMIN.includes(papel));

  function entrar(dados) {
    /* chamada depois do login: `lib/dados/auth.js` já gravou tokens e sessão,
       aqui só se propaga o novo estado para as telas já montadas */
    if (dados) definir({ pronto: true, autenticado: true, dados, token: lerTokenLocal() });
    else carregar();
  }

  async function sair() {
    /* o estado cai ANTES da resposta: o servidor pode demorar, e manter o
       painel montado depois do clique dá a impressão de que o botão falhou.
       `sairNaApi` limpa o armazenamento no `finally`, mesmo se a rede cair */
    const token = lerTokenLocal();

    /* o armazenamento é limpo ANTES da chamada, não depois: o efeito de
       revalidação compara o token guardado com o do armazenamento, e deixar o
       token lá durante a requisição faria a sessão se reconstruir sozinha no
       meio do logout. O token vai à mão para `/auth/sair` porque é ele que
       identifica QUAL sessão encerrar no servidor */
    limparSessao();
    definir({ pronto: true, autenticado: false, dados: null, token: null });
    /* a conexão fica autenticada como a sessão que acabou de morrer — sem
       isto, ela continuaria recebendo eventos da conta antiga até a página
       recarregar */
    desconectarSocket();

    try {
      await sairNaApi(token);
    } catch {
      /* rede fora não pode segurar o logout: localmente a sessão já acabou.
         A sessão do servidor expira sozinha pelo prazo do refresh */
    }
  }

  /**
   * ⚠️ PROVISÓRIO — pré-visualização das três variações do painel.
   *
   * Mantido SÓ para quando não há sessão real: com o usuário logado, o tipo de
   * perfil é o do cadastro e trocá-lo pela interface mostraria um painel que
   * não corresponde à conta — um produtor veria "Atendimento" e clicaria em
   * telas que a API vai recusar. Sem sessão, ainda é a única forma de conferir
   * as três versões do desenho, então continua funcionando ali.
   */
  function trocarPerfil(tipo) {
    if (autenticado || !PERFIS[tipo]) return;

    try {
      sessionStorage.setItem(CHAVE_PERFIL, tipo);
    } catch {}

    definir({ perfilDemo: tipo });
  }

  return {
    autenticado,
    perfil,
    tipoPerfil,
    trocarPerfil,
    usuario: autenticado ? montarUsuario(atual.dados, tipoPerfil) : null,
    /* `carregando` é adição, não troca: quem já usa o hook ignora o campo, e
       quem protege rota precisa distinguir "ainda não sei" de "não logado" */
    carregando: !atual.pronto,
    /* adições para o painel administrativo — a autorização de verdade
       continua sendo do servidor (todo endpoint de /admin exige
       `admin.acessar`); isto só evita montar a tela para quem visivelmente
       não tem papel nenhum */
    ehAdmin,
    papeis,
    entrar,
    sair,
  };
}
