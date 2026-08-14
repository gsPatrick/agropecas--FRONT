'use client';

/**
 * Camada de dados da autenticação — o único lugar do front que conhece o
 * formato dos endpoints `/auth/*`.
 *
 * Os componentes de tela continuam falando em "e-mail", "senha", "perfil";
 * a tradução para o corpo que a API espera (`tipoPerfil`, `aceiteTermos`,
 * `exibir_whatsapp`, telefone em E.164) mora aqui. Assim, quando o backend
 * renomear um campo, muda um arquivo — não quatro formulários.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ POR QUE ESTE ARQUIVO TEM UM `fetch` PRÓPRIO EM VEZ DE USAR `api.post`
 *
 * A API devolve o erro de campo em `erro.detalhe.campos`:
 *
 *   { "erro": { "codigo": "VALIDACAO",
 *               "detalhe": { "campos": { "senha": "…", "documento": "…" } } } }
 *
 * e `lib/api.js` lê `erro.detalhes` / `erro.details` (plural) — ou seja, hoje
 * ele DESCARTA justamente o que a tela precisa para pintar a mensagem no campo
 * certo. Como `lib/api.js` é de outro dono, não foi alterado aqui.
 *
 * CORREÇÃO PROPOSTA (uma linha, em `lib/api.js`, dentro de `requisitar`):
 *
 *   detalhes: erro.detalhes || erro.detalhe || erro.details,
 *
 * Feita essa mudança, `enviar()` abaixo pode ser trocado por `api.post` e o
 * resto deste arquivo continua igual — `lerErro()` já aceita as duas grafias.
 * ─────────────────────────────────────────────────────────────────────────
 */

import { guardarToken } from '@/lib/api';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3334/api/v1';

/** Erro de autenticação já mastigado para a tela: mensagem + campos. */
export class ErroDeAuth extends Error {
  constructor(mensagem, { codigo, status, campos } = {}) {
    super(mensagem);
    this.name = 'ErroDeAuth';
    this.codigo = codigo;
    this.status = status;
    /* mapa { nomeDoCampo: mensagem } — vazio quando o erro é do formulário
       inteiro (credencial inválida, servidor fora) */
    this.campos = campos || {};
  }
}

function lerErro(dados, status) {
  const erro = dados?.erro || {};
  /* aceita as duas grafias: hoje a API manda `detalhe`, e a correção proposta
     em lib/api.js entregaria `detalhes` — nenhuma das duas quebra a tela */
  const detalhe = erro.detalhe || erro.detalhes || {};

  return new ErroDeAuth(erro.mensagem || 'Algo deu errado.', {
    codigo: erro.codigo,
    status,
    campos: detalhe.campos,
  });
}

async function enviar(caminho, corpo, { metodo = 'POST', token } = {}) {
  let resposta;

  try {
    resposta = await fetch(`${BASE}${caminho}`, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(corpo || {}),
    });
  } catch {
    /* rede fora é diferente de dado recusado: a tela pede "tente de novo",
       não corrige campo nenhum */
    throw new ErroDeAuth('Não foi possível falar com o servidor. Tente de novo.', {
      codigo: 'SEM_CONEXAO',
    });
  }

  const texto = await resposta.text();
  const dados = texto ? JSON.parse(texto) : null;

  if (!resposta.ok || dados?.sucesso === false) throw lerErro(dados, resposta.status);

  return dados?.dados !== undefined ? dados.dados : dados;
}

async function buscar(caminho) {
  const resposta = await fetch(`${BASE}${caminho}`);
  const texto = await resposta.text();
  const dados = texto ? JSON.parse(texto) : null;
  if (!resposta.ok || dados?.sucesso === false) throw lerErro(dados, resposta.status);
  return dados?.dados;
}

/* ─── sessão ──────────────────────────────────────────────────────────── */

const CHAVE_SESSAO = 'agropecas:sessao-dados';
const CHAVE_REFRESH = 'agropecas:refresh';

/* chaves do mock em `lib/sessao.js`. São escritas aqui para que Header, painel
   e ChatWidget reajam ao login real SEM que aquele arquivo precise mudar agora
   (ele é de outro dono). Some junto com o mock. */
const CHAVE_MOCK = 'agropecas:sessao';
const CHAVE_MOCK_PERFIL = 'agropecas:perfil';

/**
 * Persiste o que veio de `/auth/entrar` e `/auth/registrar`.
 *
 * O token de acesso vai por `guardarToken` — é ele que `lib/api.js` lê para
 * assinar todas as outras chamadas do front. O restante (usuário, perfil,
 * papéis, permissões) fica ao lado porque o painel monta menu com isso e não
 * pode esperar um GET /auth/eu a cada navegação.
 */
export function guardarSessao(dados) {
  guardarToken(dados?.tokens?.acesso || null);

  try {
    localStorage.setItem(
      CHAVE_SESSAO,
      JSON.stringify({
        usuario: dados.usuario,
        perfil: dados.perfil,
        papeis: dados.papeis || [],
        permissoes: dados.permissoes || [],
      })
    );

    if (dados?.tokens?.refresh) localStorage.setItem(CHAVE_REFRESH, dados.tokens.refresh);

    sessionStorage.setItem(CHAVE_MOCK, '1');
    if (dados?.perfil?.tipo) sessionStorage.setItem(CHAVE_MOCK_PERFIL, dados.perfil.tipo);
  } catch {
    /* navegação privada pode bloquear o storage: o login continua valendo
       nesta aba, só não sobrevive ao recarregar */
  }
}

export function lerSessaoSalva() {
  try {
    const bruto = localStorage.getItem(CHAVE_SESSAO);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

export function limparSessao() {
  guardarToken(null);
  try {
    localStorage.removeItem(CHAVE_SESSAO);
    localStorage.removeItem(CHAVE_REFRESH);
    sessionStorage.setItem(CHAVE_MOCK, '0');
  } catch {}
}

/* ─── normalizações ───────────────────────────────────────────────────── */

/** a API valida telefone em E.164; a máscara da tela é "(65) 9 9999-9999" */
function paraE164(valor) {
  if (!valor) return undefined;
  const digitos = String(valor).replace(/\D/g, '');
  if (!digitos) return undefined;
  if (digitos.startsWith('55')) return `+${digitos}`;
  return `+55${digitos}`;
}

const semVazio = (objeto) =>
  Object.fromEntries(
    Object.entries(objeto).filter(([, valor]) => valor !== undefined && valor !== '' && valor !== null)
  );

/* ─── entrada e cadastro ──────────────────────────────────────────────── */

export async function entrar({ email, senha }) {
  const dados = await enviar('/auth/entrar', { email: email.trim(), senha });
  guardarSessao(dados);
  return dados;
}

/**
 * Cadastro do wizard → POST /auth/registrar.
 *
 * Os aceites viram consentimentos tipados no servidor (LGPD art. 8º): sem
 * `aceiteTermos` e `aceitePrivacidade` o registro é recusado. A tela mostra um
 * checkbox só ("Termos de Uso"), então ele responde pelos dois documentos —
 * ver lacuna anotada no relatório.
 */
export async function cadastrar(formulario) {
  const corpo = semVazio({
    nome: formulario.nome,
    email: formulario.email?.trim(),
    senha: formulario.senha,
    tipoPerfil: formulario.perfil,
    documento: formulario.documento,
    whatsapp: paraE164(formulario.whatsapp),
    telefone: paraE164(formulario.telefone),
    propriedadeNome: formulario.perfil === 'produtor' ? formulario.propriedade : undefined,
    aceiteTermos: Boolean(formulario.aceiteTermos),
    /* a tela junta os dois documentos num aceite só */
    aceitePrivacidade: Boolean(formulario.aceiteTermos),
    exibir_whatsapp: Boolean(formulario.exibirWhatsapp),
  });

  const dados = await enviar('/auth/registrar', corpo);
  guardarSessao(dados);
  return dados;
}

/**
 * O que o wizard coleta mas `/auth/registrar` não aceita — bio, município e
 * serviços prestados — é enviado depois, em PATCH /perfil/meu, já com o token
 * recém-criado.
 *
 * É best-effort de propósito: a conta já existe e o usuário já está vendo a
 * tela de sucesso; falhar aqui não pode desfazer um cadastro válido. O que não
 * for salvo continua editável no painel.
 */
export async function complementarPerfil(formulario, token) {
  const corpo = semVazio({
    bio: formulario.bio,
    municipioId: await procurarMunicipio(formulario.endereco),
    /* serviços do prestador: SignupWizard já deixa escolher (ver `services`
       em SignupWizard.js), e é o MESMO campo que `salvarServicos` grava em
       `lib/dados/exclusivas.js` — sem isso, o cadastro coletava a lista e
       simplesmente descartava, e o onboarding (que não pergunta mais
       serviço, por já achar redundante) deixaria o prestador sem nenhum */
    servicos: formulario.servicos?.length ? formulario.servicos : undefined,
  });

  if (!Object.keys(corpo).length) return null;

  try {
    return await enviar('/perfis/meu', corpo, { metodo: 'PATCH', token });
  } catch {
    return null;
  }
}

/** o front tem o NOME do município (ViaCEP); a API quer o id do catálogo */
async function procurarMunicipio(endereco) {
  if (!endereco?.cidade || !endereco?.uf) return undefined;

  try {
    const lista = await buscar(
      `/localizacao/municipios?uf=${encodeURIComponent(endereco.uf)}&busca=${encodeURIComponent(endereco.cidade)}`
    );

    /* só o nome idêntico serve: o endpoint devolve a lista da UF quando a
       busca não casa, e gravar o primeiro item colocaria a pessoa numa cidade
       aleatória */
    const alvo = endereco.cidade.trim().toLowerCase();
    return (lista || []).find((item) => item.nome.toLowerCase() === alvo)?.id;
  } catch {
    return undefined;
  }
}

/* ─── recuperação de senha (3 passos) ─────────────────────────────────── */

export const solicitarCodigo = (email) =>
  enviar('/auth/senha/solicitar', { email: email.trim() });

export const conferirCodigo = (email, codigo) =>
  enviar('/auth/senha/conferir', { email: email.trim(), codigo });

export const redefinirSenha = (email, codigo, senha) =>
  enviar('/auth/senha/redefinir', { email: email.trim(), codigo, senha });

/* ─── confirmação de e-mail ───────────────────────────────────────────── */

export const confirmarEmail = (email, codigo) =>
  enviar('/auth/email/confirmar', { email: email.trim(), codigo });

export const reenviarConfirmacao = (email) =>
  enviar('/auth/email/reenviar', { email: email.trim() });

/* ─── saída ───────────────────────────────────────────────────────────── */

export async function sair(token) {
  try {
    await enviar('/auth/sair', {}, { token });
  } finally {
    limparSessao();
  }
}
