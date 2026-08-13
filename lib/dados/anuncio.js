/**
 * Origem de dados da página /anuncios/[id].
 *
 * Existe para que a tela continue recebendo EXATAMENTE a forma que ela já
 * desenhava no mock (`titulo`, `preco`, `ficha`, `local`, `autorIniciais`…),
 * enquanto o conteúdo passa a vir da API. Se o adaptador morasse dentro do
 * componente, cada campo novo da API viraria um `?.` a mais no JSX e o layout
 * passaria a depender do formato do backend — que muda.
 *
 * Endpoints usados:
 *   GET  /anuncios/:id            → detalhe público (autenticação opcional)
 *   GET  /anuncios/:id/parecidos  → carrossel "Anúncios parecidos"
 *   POST /contatos/anuncios/:id/revelar → devolve o WhatsApp do anunciante
 *   POST /anuncios/:id/contato    → métrica de intenção de contato
 */

import api from '@/lib/api';

/* rótulos: o banco guarda enum, a tela mostra português */
const CONDICOES = {
  nova: 'Nova',
  usada: 'Usada',
  recondicionada: 'Recondicionada',
  nao_se_aplica: '',
};

const ICONE_POR_PERFIL = { loja: 'store', prestador: 'wrench', produtor: 'tractor' };
const ROTULO_POR_PERFIL = {
  loja: 'Loja de Peças',
  prestador: 'Prestador de Serviços',
  produtor: 'Produtor Rural',
};

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** `precoCentavos` → "R$ 320,00". Vazio quando é "a combinar": a tela já tem
    o estado "Consultar valor" e ele é melhor do que "R$ 0,00". */
function formatarPreco(anuncio) {
  if (anuncio.precoACombinar) return '';
  if (anuncio.precoCentavos === null || anuncio.precoCentavos === undefined) return '';

  return (anuncio.precoCentavos / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: anuncio.moeda || 'BRL',
  });
}

/** "há 2 horas" — a tela mostra tempo relativo, a API manda ISO */
function tempoRelativo(iso) {
  if (!iso) return '';

  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);

  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} ${horas === 1 ? 'hora' : 'horas'}`;

  const dias = Math.floor(horas / 24);
  if (dias < 30) return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;

  const meses = Math.floor(dias / 30);
  return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
}

/** "março de 2026" a partir de `membroDesde` (data ISO curta) */
function mesPorExtenso(data) {
  if (!data) return 'este ano';

  const d = new Date(`${String(data).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 'este ano';

  return `${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

export function iniciais(nome = '') {
  return nome
    .split(' ')
    .filter((parte) => parte.length > 2)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase();
}

/**
 * A "Ficha" da tela é uma lista rótulo/valor. A API espalha essa informação em
 * campos fixos (marca, código, quantidade, entrega) e em `atributos`, que é a
 * parte variável por categoria. Montamos os dois na mesma lista para o JSX não
 * precisar saber de onde cada linha veio.
 */
function montarFicha(anuncio) {
  const linhas = [];

  if (anuncio.marca?.nome) linhas.push({ rotulo: 'Marca', valor: anuncio.marca.nome });

  if (anuncio.maquinasCompativeis?.length) {
    linhas.push({
      rotulo: 'Modelo da máquina',
      valor: anuncio.maquinasCompativeis.map((maquina) => maquina.modelo).join(' / '),
    });
  }

  if (anuncio.codigoPeca) linhas.push({ rotulo: 'Código da peça', valor: anuncio.codigoPeca });

  if (anuncio.quantidade) {
    linhas.push({
      rotulo: 'Quantidade',
      valor: `${anuncio.quantidade} ${anuncio.unidade || 'unidade'}${
        anuncio.quantidade > 1 ? 's' : ''
      }`,
    });
  }

  (anuncio.atributos || []).forEach((atributo) => {
    if (atributo.valor === null || atributo.valor === '') return;

    linhas.push({
      rotulo: atributo.rotulo || atributo.chave,
      valor: atributo.unidade ? `${atributo.valor} ${atributo.unidade}` : String(atributo.valor),
    });
  });

  if (anuncio.aceitaTroca) linhas.push({ rotulo: 'Troca', valor: 'Aceita troca' });

  if (anuncio.aceitaEntrega) {
    linhas.push({
      rotulo: 'Entrega',
      valor: anuncio.entregaObservacao || 'Entrega combinada com o anunciante',
    });
  }

  if (anuncio.atendeNoLocal) {
    linhas.push({ rotulo: 'Atendimento', valor: 'Atende no local do cliente' });
  }

  return linhas;
}

/**
 * O que o `LocationMap` espera: coordenada quando houver, senão cidade/UF.
 *
 * A coordenada vem pronta em `localizacao.coordenada`, com a origem já
 * decidida pelo mapper da API (`endereco` exato ou `municipio` aproximado —
 * a sede pública do IBGE, não o endereço de ninguém). Antes disso o front
 * mantinha uma tabela de 8 sedes chumbada aqui, que cobria só 8 dos 141
 * municípios de Mato Grosso e envelhecia sozinha a cada cidade nova.
 */
function montarLocal(anuncio, cidade, uf) {
  const localizacao = anuncio.localizacao || {};
  const coordenada = localizacao.coordenada;

  if (!cidade && !coordenada) return null;

  return {
    origem: coordenada?.origem === 'endereco' ? 'coordenada' : 'municipio',
    cidade,
    uf,
    lat: coordenada?.latitude,
    lng: coordenada?.longitude,
    aproximado: coordenada ? coordenada.aproximada !== false : true,
  };
}

/** detalhe da API → objeto que a página já sabia desenhar */
export function paraDetalhe(anuncio) {
  if (!anuncio) return null;

  const anunciante = anuncio.anunciante || {};
  const cidade = anuncio.municipio?.nome || anuncio.localizacao?.municipio?.nome || '';
  const uf = anuncio.uf || anuncio.localizacao?.uf || '';

  return {
    id: anuncio.id,
    tipo: anuncio.tipo === 'servico' ? 'servico' : 'peca',
    titulo: anuncio.titulo,
    /* a tela usa uma foto só; `capa` já vem escolhida pela API */
    foto: anuncio.capa?.url || anuncio.fotos?.[0]?.url || null,
    icone: anuncio.categoria?.icone || 'gear',
    categoria: anuncio.categoria?.slug || '',
    preco: formatarPreco(anuncio),
    condicao: CONDICOES[anuncio.condicao] ?? '',
    cidade,
    uf,
    quando: tempoRelativo(anuncio.publicadoEm || anuncio.criadoEm),
    descricao: anuncio.descricao || '',
    ficha: montarFicha(anuncio),
    local: montarLocal(anuncio, cidade, uf),

    /* bloco do anunciante */
    autor: anunciante.nomeExibicao || 'Anunciante',
    autorSlug: anunciante.slug || '',
    autorFoto: anunciante.fotoUrl || null,
    autorIniciais: iniciais(anunciante.nomeExibicao || 'Anunciante'),
    perfil: ROTULO_POR_PERFIL[anunciante.tipo] || 'Anunciante',
    perfilIcone: ICONE_POR_PERFIL[anunciante.tipo] || 'tractor',
    membroDesde: mesPorExtenso(anunciante.membroDesde),
    verificado: Boolean(anunciante.verificado),

    /* o número NÃO vem daqui por regra de produto: revelar exige login e sai
       de `revelarWhatsapp()`. Estes dois dizem apenas quais canais existem */
    exibirWhatsapp: anunciante.exibirWhatsapp !== false,
    aceitaChat: anunciante.aceitaChat !== false,
  };
}

/** o `AdCard` do carrossel de parecidos usa a forma resumida */
export function paraCartao(anuncio) {
  return {
    id: anuncio.id,
    tipo: anuncio.tipo === 'servico' ? 'servico' : 'peca',
    titulo: anuncio.titulo,
    foto: anuncio.capa?.url || null,
    icone: anuncio.categoria?.icone || 'gear',
    preco: formatarPreco(anuncio),
    condicao: CONDICOES[anuncio.condicao] ?? '',
    cidade: anuncio.municipio?.nome || '',
    uf: anuncio.uf || '',
    autor: anuncio.anunciante?.nomeExibicao || 'Anunciante',
    perfilIcone: ICONE_POR_PERFIL[anuncio.anunciante?.tipo] || 'tractor',
    quando: tempoRelativo(anuncio.publicadoEm || anuncio.criadoEm),
  };
}

export async function buscarAnuncio(id, opcoes) {
  return paraDetalhe(await api.get(`/anuncios/${id}`, undefined, opcoes));
}

export async function buscarParecidos(id, opcoes) {
  const lista = await api.get(`/anuncios/${id}/parecidos`, undefined, opcoes);
  return (lista || []).map(paraCartao);
}

/**
 * Revela o WhatsApp do anunciante.
 *
 * Chamada só no clique, nunca no carregamento: o endpoint devolve telefone de
 * terceiro, conta cota por usuário e responde **401 para visitante** — que é
 * exatamente a regra de produto que a tela já tinha no mock. Quem chama trata
 * o 401 mandando para o login.
 *
 * Ele também registra o contato do lado do servidor, então não é preciso
 * chamar `registrarContato` junto quando o número foi revelado.
 */
export async function revelarWhatsapp(id) {
  return api.post(`/contatos/anuncios/${id}/revelar`, { origem: 'detalhe' });
}

/** métrica de intenção — aberta ao visitante, e por isso não devolve nada útil */
export async function registrarContato(id, canal = 'chat') {
  return api.post(`/anuncios/${id}/contato`, { canal, origem: 'detalhe' });
}
