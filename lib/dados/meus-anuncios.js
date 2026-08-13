/**
 * Origem de dados de "Meus anúncios" — lista, detalhe do dono, criação,
 * edição e as transições de estado (publicar/pausar/renovar/remover), para
 * `app/painel/anuncios/**`.
 *
 * Diferente de `lib/dados/anuncios.js`/`lib/dados/anuncio.js` (a vitrine
 * pública): aqui tudo é escopado ao dono —
 *
 *   GET    /anuncios/meus            → lista (com contagem de contatos)
 *   GET    /anuncios/:id             → detalhe (o mapper devolve campos extra
 *                                       quando quem pede é o dono)
 *   POST   /anuncios                 → criar (nasce rascunho; `publicar:true`
 *                                       pede publicação já na criação)
 *   PATCH  /anuncios/:id             → editar
 *   DELETE /anuncios/:id             → remover
 *   POST   /anuncios/:id/publicar    → rascunho/pausado/expirado → publicado
 *   POST   /anuncios/:id/pausar      → publicado → pausado
 *   POST   /anuncios/:id/renovar     → expirado → publicado, +60 dias
 *   GET    /anuncios/:id/historico   → trilha de status (criado/publicado/…)
 *   GET    /anuncios/:id/metricas    → série diária + totais
 *   GET    /anuncios/:id/contatos    → quem procurou, por este anúncio
 *
 * ⚠️ O DESENHO DAS TELAS NÃO MUDOU — os nomes de campo que as telas já liam
 * do mock (`titulo`, `preco`, `vistas`, `expiraEm` em dias…) continuam os
 * mesmos; o que muda é de onde vêm.
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

/* o que dá para fazer em cada situação — mesma tabela que `painel-mock.js`
   já tinha, só que `oculto` (medida da administração) entrou como estado
   próprio: só "ver" e "editar" fazem sentido nele, o dono não tira a própria
   medida administrativa sozinho */
export const ACOES_POR_STATUS = {
  publicado: ['ver', 'editar', 'pausar', 'remover'],
  pausado: ['ver', 'editar', 'publicar', 'remover'],
  oculto: ['ver', 'editar'],
  expirado: ['ver', 'editar', 'renovar', 'remover'],
  rascunho: ['editar', 'publicar', 'remover'],
};

export const ACOES = {
  ver: { rotulo: 'Ver anúncio', icone: 'eye' },
  editar: { rotulo: 'Editar', icone: 'edit' },
  pausar: { rotulo: 'Pausar', icone: 'eye-off' },
  publicar: { rotulo: 'Publicar', icone: 'check' },
  renovar: { rotulo: 'Renovar', icone: 'clock' },
  remover: { rotulo: 'Remover', icone: 'trash', perigo: true },
};

/* ── formatação ───────────────────────────────────────────────────────── */

function formatarPreco(item) {
  if (item.precoACombinar) return 'A combinar';
  if (item.precoCentavos == null) return 'A combinar';
  return MOEDA.format(item.precoCentavos / 100);
}

function diasRestantes(iso) {
  if (!iso) return undefined;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / DIA_MS);
}

/* ── tradução API → forma que as telas já desenhavam ─────────────────── */

function paraResumo(item) {
  const base = {
    id: item.id,
    titulo: item.titulo,
    preco: formatarPreco(item),
    status: item.status,
    vistas: item.totalVisualizacoes || 0,
    contatos: (item.totalContatosWhatsapp || 0) + (item.totalContatosChat || 0),
  };

  if (item.status === 'publicado') {
    const dias = diasRestantes(item.expiraEm);
    if (dias !== undefined) base.expiraEm = dias;
  }

  return base;
}

export async function listarMeusAnuncios({ status, ordenar = 'recentes', sinal } = {}) {
  const { dados } = await api.listar(
    '/anuncios/meus',
    { porPagina: 100, status: status === 'todos' ? undefined : status, ordenar },
    { sinal }
  );

  return (dados || []).map(paraResumo);
}

function paraLocalizacao(item) {
  return {
    municipio: item.localizacao?.municipio?.nome || '',
    uf: item.localizacao?.uf || '',
    aproximada: item.localizacao?.precisao !== 'exata',
  };
}

function paraDatas(item) {
  const publicadoEm = item.publicadoEm ? new Date(item.publicadoEm) : null;

  return {
    criadoEm: item.criadoEm ? new Date(item.criadoEm) : null,
    publicadoEm,
    expiraEm: item.expiraEm ? new Date(item.expiraEm) : null,
    diasNoAr: publicadoEm ? Math.floor((Date.now() - publicadoEm.getTime()) / DIA_MS) : 0,
  };
}

/* medida da administração: a API não tem um objeto "medida" pronto — ela
   guarda `moderacaoStatus`/`moderacaoMotivo` (dono only, ver
   `anuncio.mapper.js:detalhe`). Monta-se aqui o mesmo formato que a tela já
   desenhava, só quando a ocultação é de fato da administração */
function paraMedida(item) {
  if (item.status !== 'oculto' && item.moderacaoStatus !== 'reprovado') return null;

  return {
    acao: 'Anúncio ocultado pela administração',
    motivo: item.moderacaoMotivo || 'Sem motivo registrado.',
    /* a API não devolve prazo para a medida acabar — ela some quando a
       administração decide, não numa data marcada */
    ate: null,
    quando: item.moderadoEm,
    podeCorrigir: true,
  };
}

export function paraDetalheDono(item) {
  return {
    ...paraResumo(item),
    descricao: item.descricao || '',
    categoria: item.categoria?.nome || '',
    categoriaId: item.categoria?.id || '',
    marca: item.marca?.nome || '',
    marcaId: item.marca?.id || '',
    condicao: item.condicao,
    negociacao: item.negociacao,
    aceitaTroca: Boolean(item.aceitaTroca),
    quantidade: item.quantidade ?? 1,
    atendeNoLocal: Boolean(item.atendeNoLocal),
    tipo: item.tipo,
    fotos: (item.fotos || []).length,
    fotosItens: (item.fotos || []).map((foto) => ({
      id: foto.id,
      url: foto.url,
      capa: Boolean(foto.principal),
    })),
    localizacao: paraLocalizacao(item),
    datas: paraDatas(item),
    favoritos: item.totalFavoritos || 0,
    medida: paraMedida(item),
  };
}

export async function obterAnuncioDono(id, { sinal } = {}) {
  return paraDetalheDono(await api.get(`/anuncios/${id}`, undefined, { sinal }));
}

/* ── histórico, métricas, contatos ────────────────────────────────────── */

const ICONE_POR_ACAO = {
  rascunho: 'plus',
  publicado: 'check',
  pausado: 'eye-off',
  oculto: 'eye-off',
  expirado: 'clock',
  removido: 'trash',
};

export async function carregarHistorico(id, { sinal } = {}) {
  const itens = await api.get(`/anuncios/${id}/historico`, undefined, { sinal });

  return (itens || [])
    .map((item) => ({
      id: item.id,
      acao: item.motivo || `${ROTULO_STATUS[item.statusNovo] || item.statusNovo}`,
      data: item.criadoEm ? new Date(item.criadoEm) : null,
      icone: ICONE_POR_ACAO[item.statusNovo] || 'clock',
    }))
    .reverse();
}

export async function carregarMetricas(id, { dias = 14, sinal } = {}) {
  const item = await api.get(`/anuncios/${id}/metricas`, { dias }, { sinal });

  return (item.serie || []).map((ponto) => ponto.visualizacoes || 0);
}

export async function carregarContatos(id, { sinal } = {}) {
  const { dados } = await api.listar(`/anuncios/${id}/contatos`, { porPagina: 50 }, { sinal });

  return (dados || []).map((item) => ({
    id: item.id,
    nome: item.interessado?.nome || 'Interessado sem cadastro',
    tipo: item.interessado ? 'Cadastrado' : 'Visitante',
    cidade: '',
    canal: item.canal,
    quando: item.criadoEm,
  }));
}

/**
 * Nome de município (o que `LocalizacaoSeletor` resolve pelo CEP ou pelo
 * texto digitado) → id real, para `municipioId`. Mesma lógica de
 * `lib/dados/exclusivas.js:resolverMunicipio` — duplicada aqui, e não
 * importada de lá, porque as duas features não têm por que compartilhar módulo
 * só por causa de uma busca de dez linhas.
 */
export async function resolverMunicipioPorNome(nome, uf) {
  if (!nome) return undefined;

  try {
    const { dados } = await api.listar('/localizacao/municipios', { busca: nome, uf, porPagina: 20 });
    const semAcento = (v) => String(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const exato = dados.find((item) => semAcento(item.nome) === semAcento(nome));
    return (exato || dados[0])?.id;
  } catch {
    return undefined;
  }
}

/* ── criar / editar ───────────────────────────────────────────────────── */

/** "1.850,00" ou "1850" → 185000 (centavos); vazio/inválido → null */
function precoParaCentavos(texto) {
  const limpo = String(texto || '')
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3})/g, '')
    .replace(',', '.');
  if (!limpo) return null;
  const numero = Number(limpo);
  return Number.isFinite(numero) ? Math.round(numero * 100) : null;
}

/**
 * Monta o corpo de `POST /anuncios` / `PATCH /anuncios/:id` a partir do
 * estado do `AnuncioForm`. `localizacao` já vem resolvida (município achado,
 * ou coordenada do mapa) — ver `resolverLocalizacaoDoFormulario` no próprio
 * componente.
 */
export function paraCorpoAnuncio({ tipo, form, localizacao, fotos, publicar }) {
  return {
    tipo,
    categoriaId: form.categoriaId || null,
    marcaId: form.marcaId || null,
    condicao: form.condicao,
    negociacao: form.negociacao,
    precoCentavos: form.aCombinar ? null : precoParaCentavos(form.preco),
    precoACombinar: Boolean(form.aCombinar),
    quantidade: form.quantidade ? Number(form.quantidade) : undefined,
    atendeNoLocal: tipo === 'servico' ? Boolean(form.atendeNoLocal) : undefined,
    titulo: form.titulo,
    descricao: form.descricao,
    municipioId: localizacao?.municipioId || undefined,
    uf: localizacao?.uf || undefined,
    latitude: localizacao?.latitude || undefined,
    longitude: localizacao?.longitude || undefined,
    fotos: fotos.map((foto) => foto.id),
    publicar: Boolean(publicar),
  };
}

export const criarAnuncio = (corpo) => api.post('/anuncios', corpo).then(paraDetalheDono);

export const editarAnuncio = (id, corpo) => api.patch(`/anuncios/${id}`, corpo).then(paraDetalheDono);

export const publicarAnuncio = (id) => api.post(`/anuncios/${id}/publicar`, {}).then(paraDetalheDono);

export const pausarAnuncio = (id, motivo) =>
  api.post(`/anuncios/${id}/pausar`, motivo ? { motivo } : {}).then(paraDetalheDono);

export const renovarAnuncio = (id) => api.post(`/anuncios/${id}/renovar`, {}).then(paraDetalheDono);

export const removerAnuncio = (id, motivo) =>
  api.delete(`/anuncios/${id}`, motivo ? { corpo: { motivo } } : undefined);
