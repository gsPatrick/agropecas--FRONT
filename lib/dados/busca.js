/**
 * Origem de dados da tela /busca.
 *
 * Existe para que a página continue falando a linguagem dela — "anúncio com
 * título, preço formatado e 'há 2 horas'" — enquanto a API fala a dela
 * (centavos, ISO 8601, enum `nao_se_aplica`). Se essa tradução morasse dentro
 * do componente, cada tela que listar anúncio repetiria as mesmas seis
 * funções de formatação, e a sétima esqueceria o caso do preço a combinar.
 *
 * A regra aqui é: a API muda de forma, este arquivo absorve; a tela não sabe
 * que a API existe.
 */

import { api } from '@/lib/api';
import { CATEGORIAS as CATEGORIAS_FALLBACK } from '@/lib/anuncios';

/* nomes de parâmetro batem 1:1 com o que a rota GET /busca valida — os
   curtos (q, cat, cond, min, max, p, pp) são os mesmos que já viviam na URL
   do front, então nenhum link compartilhado no zap quebra */
const CAMINHO_BUSCA = '/busca';
const CAMINHO_CATEGORIAS = '/catalogo/categorias';

/* a API guarda quatro condições, a tela oferece duas + "qualquer".
   `nao_se_aplica` e `recondicionada` chegam do banco e precisam de rótulo
   legível mesmo sem existirem como filtro */
const ROTULO_CONDICAO = {
  nova: 'Nova',
  usada: 'Usada',
  recondicionada: 'Recondicionada',
  nao_se_aplica: '',
};

const REAL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/**
 * "há 2 horas" — o mesmo texto que o mock entregava pronto.
 *
 * Data absoluta ("11/08/2026") obriga quem lê a fazer a conta de quão velho é
 * o anúncio, e a idade do anúncio é justamente o que decide se vale ligar.
 */
function tempoRelativo(iso) {
  if (!iso) return '';

  const minutos = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));

  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;

  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} ${horas === 1 ? 'hora' : 'horas'}`;

  const dias = Math.round(horas / 24);
  if (dias < 30) return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;

  const meses = Math.round(dias / 30);
  if (meses < 12) return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`;

  const anos = Math.round(meses / 12);
  return `há ${anos} ${anos === 1 ? 'ano' : 'anos'}`;
}

/* a foto pode chegar como string ou como objeto de mídia; aceitar as duas
   evita um `[object Object]` no src caso a API troque o formato */
function urlDaFoto(foto) {
  if (!foto) return null;
  if (typeof foto === 'string') return foto;
  return foto.url || foto.urlMedia || foto.urlThumb || null;
}

/**
 * Item da API → item que o AdCard entende.
 *
 * Mantém os campos do mock com os mesmos nomes de propósito: assim o card,
 * que já está aprovado, não precisa de uma linha de mudança.
 */
function paraCartao(item) {
  const preco = item.preco || {};
  const local = item.local || {};
  const anunciante = item.anunciante || {};

  return {
    /* a rota de detalhe da API só aceita UUID, então o link precisa levar o
       id — não o slug, que é bonito mas devolveria 422 lá */
    id: item.id,
    titulo: item.titulo,
    tipo: item.tipo,
    categoria: item.categoria?.slug || null,
    icone: item.categoria?.icone || 'gear',
    condicao: ROTULO_CONDICAO[item.condicao] ?? '',
    /* preço a combinar vira string vazia: o card já tem o "Consultar valor"
       desenhado para esse caso */
    preco: preco.aCombinar || preco.reais == null ? '' : REAL.format(preco.reais),
    precoNumero: preco.aCombinar ? null : (preco.reais ?? null),
    cidade: local.cidade || '',
    uf: local.uf || '',
    autor: anunciante.nome || 'Anunciante',
    perfilIcone: anunciante.tipo === 'loja' ? 'store' : 'tractor',
    foto: urlDaFoto(item.foto),
    quando: tempoRelativo(item.publicadoEm),
  };
}

/**
 * Busca paginada.
 *
 * Recebe os filtros já como a URL os guarda ("todos"/"todas" para "sem
 * filtro") e limpa aqui, num lugar só — a tela não deve ter de lembrar que
 * `tipo=todos` não pode ir para a API, que valida contra um enum fechado e
 * responde 422.
 */
export async function buscarAnuncios(filtros = {}, { sinal } = {}) {
  const {
    termo,
    categoria,
    tipo,
    condicao,
    periodo,
    cidade,
    uf,
    marca,
    min,
    max,
    ordem,
    pagina,
    porPagina,
  } = filtros;

  const vazio = (valor) => !valor || valor === 'todos' || valor === 'todas';

  const parametros = {
    q: termo || undefined,
    cat: vazio(categoria) ? undefined : categoria,
    marca: marca || undefined,
    tipo: vazio(tipo) ? undefined : tipo,
    cond: vazio(condicao) ? undefined : condicao,
    dias: vazio(periodo) ? undefined : periodo,
    cidade: cidade || undefined,
    uf: uf || undefined,
    /* em REAIS: é o que o slider produz e o que o validador da API espera —
       mandar centavos daqui seria o clássico erro de 100x */
    min: min || undefined,
    max: max || undefined,
    ord: ordem || undefined,
    p: pagina || undefined,
    pp: porPagina || undefined,
  };

  const { dados, meta } = await api.listar(CAMINHO_BUSCA, parametros, { sinal });

  return {
    itens: (dados || []).map(paraCartao),
    total: meta?.total ?? 0,
    pagina: meta?.pagina ?? 1,
    porPagina: meta?.porPagina ?? porPagina,
    totalPaginas: meta?.totalPaginas ?? 1,
  };
}

/**
 * Categorias do filtro lateral.
 *
 * Só as raízes: a árvore inteira não cabe na coluna, e o filtro por categoria
 * pai já arrasta as filhas no lado da API — clicar em "Motor" traz cabeçote e
 * bomba injetora junto, que é o que a pessoa espera.
 *
 * Em caso de falha devolve a lista do mock: uma coluna de filtros vazia
 * pareceria defeito de layout, e categoria é navegação, não conteúdo.
 */
export async function listarCategoriasFiltro({ sinal } = {}) {
  try {
    const dados = await api.get(CAMINHO_CATEGORIAS, { arvore: true }, { sinal });

    const raizes = (dados || []).filter((item) => !item.parentId && item.ativo !== false);
    if (!raizes.length) return CATEGORIAS_FALLBACK;

    return [
      CATEGORIAS_FALLBACK[0], // "Todas" — item da UI, não existe no catálogo
      ...raizes.map((item) => ({
        id: item.slug,
        label: item.nome,
        icone: item.icone || 'gear',
      })),
    ];
  } catch (erro) {
    if (erro?.name === 'AbortError') throw erro;
    return CATEGORIAS_FALLBACK;
  }
}
