/**
 * Origem de dados do início do painel (`app/painel/page.js`) — três chamadas,
 * combinadas na forma que a tela já desenhava (`lib/painel-mock.js`):
 *
 *   GET /anuncios/meus         → a lista, o status de cada um e a contagem
 *   GET /relatorios/desempenho → as quatro métricas do topo, com variação
 *   GET /contatos/recebidos    → "últimos contatos"
 *
 * ⚠️ Lacunas da API em relação ao mock, e como foram tratadas aqui:
 *
 *  · **Contatos por anúncio.** `GET /anuncios/meus` não traz esse número (só
 *    `totalVisualizacoes`/`totalFavoritos`). Vem de
 *    `relatorios/desempenho.porAnuncio`, que é um RANKING (top N, campo
 *    `top`) — não uma lista completa. Anúncio fora do ranking mostra 0
 *    contatos no card, não porque não teve nenhum, mas porque não estava
 *    entre os mais relevantes do período. Documentado, não escondido.
 *  · **"Novo" num contato.** A API não guarda se o anunciante já viu aquele
 *    contato — não existe `lida`/`vista` em `anuncio_contatos`. Vira
 *    aproximação: contato das últimas 24h conta como novo.
 *  · **Status `oculto` e `removido`.** O mock só tinha
 *    publicado/pausado/expirado/rascunho; o banco também tem `oculto` (a
 *    administração tirou do ar — ver `medidaDaAdministracao` em
 *    `painel-mock.js`, que fingia isso dentro de "pausado") e `removido`
 *    (excluído pelo dono). `removido` é descartado aqui — anúncio apagado não
 *    é anúncio do painel. `oculto` vira um status próprio.
 */

import api from '@/lib/api';

const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const DIA_MS = 86400000;

export const STATUS_ANUNCIO = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'publicado', rotulo: 'No ar' },
  { id: 'pausado', rotulo: 'Pausados' },
  { id: 'oculto', rotulo: 'Ocultados' },
  { id: 'expirado', rotulo: 'Expirados' },
  { id: 'rascunho', rotulo: 'Rascunhos' },
];

export const ROTULO_STATUS = {
  publicado: 'No ar',
  pausado: 'Pausado',
  oculto: 'Ocultado pela administração',
  expirado: 'Expirado',
  rascunho: 'Rascunho',
};

export const ROTULO_CANAL = {
  whatsapp: 'WhatsApp',
  chat: 'Chat do sistema',
  telefone: 'Telefone',
  email: 'E-mail',
};

export const PERIODOS = [
  { id: '7d', rotulo: '7 dias', comparacao: 'período anterior', dias: 7 },
  { id: '30d', rotulo: '30 dias', comparacao: 'período anterior', dias: 30 },
  { id: '90d', rotulo: '90 dias', comparacao: 'período anterior', dias: 90 },
];

const ROTULO_ATIVOS = {
  produtor: 'Anúncios ativos',
  loja: 'Anúncios ativos',
  prestador: 'Serviços ativos',
};

function formatarPreco(item) {
  if (item.precoACombinar || item.negociacao === 'servico') return 'A combinar';
  if (item.precoCentavos == null) return 'A combinar';
  return MOEDA.format(item.precoCentavos / 100);
}

function diasRestantes(iso) {
  if (!iso) return undefined;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / DIA_MS);
}

function paraAnuncio(item, contatosPorAnuncio) {
  const base = {
    id: item.id,
    titulo: item.titulo,
    preco: formatarPreco(item),
    status: item.status,
    vistas: item.totalVisualizacoes || 0,
    contatos: contatosPorAnuncio.get(item.id) || 0,
  };

  if (item.status === 'publicado') {
    const dias = diasRestantes(item.expiraEm);
    if (dias !== undefined) base.expiraEm = dias;
  }

  return base;
}

function periodoISO(dias) {
  const ate = new Date();
  const de = new Date(ate.getTime() - dias * DIA_MS);
  return { de: de.toISOString().slice(0, 10), ate: ate.toISOString().slice(0, 10) };
}

/** soma atual/anterior de duas métricas da API num card só ("contatos" =
    clique no WhatsApp + conversa iniciada) — a variação sai da razão entre
    as somas, não da média das duas variações isoladas */
function combinarComparacao(comparacao, chaves) {
  const atual = chaves.reduce((soma, chave) => soma + (comparacao?.[chave]?.atual || 0), 0);
  const anterior = chaves.reduce((soma, chave) => soma + (comparacao?.[chave]?.anterior || 0), 0);

  if (!anterior) return atual > 0 ? 100 : undefined;
  return Math.round(((atual - anterior) / anterior) * 100);
}

const MINUTO = 60000;
const HORA = 60 * MINUTO;

/** "2026-08-12T14:02:00Z" → "há 5 min" / "há 2 h" / "ontem" / "há 4 dias" —
    mesmo vocabulário que o mock sempre usou */
function haTempo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < MINUTO) return 'agora';
  if (diff < HORA) return `há ${Math.round(diff / MINUTO)} min`;
  if (diff < DIA_MS) return `há ${Math.round(diff / HORA)} h`;
  if (diff < 2 * DIA_MS) return 'ontem';
  return `há ${Math.round(diff / DIA_MS)} dias`;
}

/** interessado/cidade e preço do anúncio não vêm no payload de contato — o
    mapper do backend (`contato.mapper.js`) devolve só {id, nome} do
    interessado (privacidade) e {id, titulo, slug, codigo} do anúncio (sem
    preço). Os campos ficam `null`; a tela trata isso como "sem essa linha",
    não como erro */
function paraContato(item) {
  const recente = Date.now() - new Date(item.criadoEm).getTime() < DIA_MS;

  return {
    id: item.id,
    nome: item.interessado?.nome || 'Interessado sem cadastro',
    tipo: item.anonimo ? 'Visitante' : 'Cadastrado',
    cidade: null,
    anuncio: item.anuncio?.titulo || 'Anúncio removido',
    anuncioId: item.anuncioId,
    anuncioPreco: null,
    canal: item.canal,
    quando: haTempo(item.criadoEm),
    novo: recente,
  };
}

export async function carregarDadosPainel(tipoPerfil, periodoId = '7d', { sinal } = {}) {
  const periodo = PERIODOS.find((item) => item.id === periodoId) || PERIODOS[0];
  const { de, ate } = periodoISO(periodo.dias);

  const [anunciosResp, desempenho, contatosResp] = await Promise.all([
    api.listar('/anuncios/meus', { porPagina: 100, ordenar: 'recentes' }, { sinal }),
    api.get('/relatorios/desempenho', { de, ate, top: 20 }, { sinal }),
    api.listar('/contatos/recebidos', { porPagina: 50 }, { sinal }),
  ]);

  const brutos = (anunciosResp.dados || []).filter((item) => item.status !== 'removido');

  const contatosPorAnuncio = new Map(
    (desempenho.porAnuncio || []).map((item) => [
      item.anuncioId,
      (item.cliques_whatsapp || 0) + (item.conversas_iniciadas || 0),
    ])
  );

  const anuncios = brutos.map((item) => paraAnuncio(item, contatosPorAnuncio));

  const contagem = anuncios.reduce(
    (acc, anuncio) => ({ ...acc, [anuncio.status]: (acc[anuncio.status] || 0) + 1 }),
    { todos: anuncios.length }
  );

  const totais = desempenho.totais || {};
  const comparacao = desempenho.comparacao || {};

  return {
    metricas: [
      {
        chave: 'ativos',
        rotulo: ROTULO_ATIVOS[tipoPerfil] || ROTULO_ATIVOS.produtor,
        valor: desempenho.anunciosPublicados ?? contagem.publicado ?? 0,
        icone: 'grid',
      },
      {
        chave: 'visualizacoes',
        rotulo: 'Visualizações',
        valor: totais.visualizacoes || 0,
        icone: 'eye',
        variacao: comparacao.visualizacoes?.variacaoPercentual,
      },
      {
        chave: 'contatos',
        rotulo: 'Contatos',
        valor: (totais.cliques_whatsapp || 0) + (totais.conversas_iniciadas || 0),
        icone: 'phone',
        variacao: combinarComparacao(comparacao, ['cliques_whatsapp', 'conversas_iniciadas']),
      },
      {
        chave: 'favoritos',
        rotulo: 'Favoritados',
        valor: totais.favoritos || 0,
        icone: 'heart',
        variacao: comparacao.favoritos?.variacaoPercentual,
      },
    ],
    anuncios,
    contagem,
    expirando: anuncios.filter((item) => item.expiraEm !== undefined && item.expiraEm <= 7),
    contatos: (contatosResp.dados || []).map(paraContato),
  };
}
