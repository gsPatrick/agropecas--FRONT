/**
 * Anúncios, do lado da administração — `/admin/anuncios/*` e
 * `/admin/moderacao/fila` (`admin.conteudo.anuncios.service` +
 * `admin.conteudo.moderacao.service`).
 *
 * Duas telas, um adaptador: `/admin/anuncios` pergunta "o que está errado na
 * plataforma" (todo status), `/admin/moderacao` pergunta "o que está
 * esperando decisão" (só a fila) — mesma forma de item, filtro diferente.
 *
 * Lacuna conhecida: a ficha do anúncio (`GET /admin/anuncios/:id`) não traz
 * "sinais" automáticos, histórico de moderação, lista de conversas nem a
 * lista de denúncias com o texto de cada uma (só a contagem em
 * `denunciasAbertas`) — nem categoria/marca/condição/entrega, porque
 * `admin.conteudo.anuncios.service.linha()` não expõe essas colunas. A tela
 * de detalhe foi reduzida ao que a API realmente devolve, em vez de inventar
 * esses dados; nada foi fabricado.
 */

import api from '@/lib/api';

export const STATUS_ANUNCIO = {
  rascunho: { rotulo: 'Rascunho', tom: 'neutro' },
  publicado: { rotulo: 'Publicado', tom: 'ok' },
  pausado: { rotulo: 'Pausado', tom: 'neutro' },
  oculto: { rotulo: 'Oculto', tom: 'alerta' },
  expirado: { rotulo: 'Expirado', tom: 'neutro' },
  removido: { rotulo: 'Removido', tom: 'perigo' },
};

export const STATUS_MODERACAO = {
  nao_revisado: { rotulo: 'Não revisado', tom: 'info' },
  em_analise: { rotulo: 'Em análise', tom: 'alerta' },
  aprovado: { rotulo: 'Aprovado', tom: 'ok' },
  reprovado: { rotulo: 'Reprovado', tom: 'perigo' },
};

function paraItem(item) {
  return {
    id: item.id,
    codigo: item.codigo,
    titulo: item.titulo,
    tipo: item.tipo,
    status: item.status,
    moderacaoStatus: item.moderacaoStatus,
    preco: item.precoACombinar ? 'A combinar' : item.precoCentavos != null ? item.precoCentavos / 100 : null,
    uf: item.uf,
    destaque: item.destaque,
    totalVisualizacoes: item.totalVisualizacoes || 0,
    totalDenuncias: item.totalDenuncias || 0,
    capa: item.capa?.urlThumb || item.capa?.url || null,
    dono: item.dono,
    criadoEm: item.criadoEm,
    publicadoEm: item.publicadoEm,
  };
}

export async function listarAnuncios({ status, moderacaoStatus, tipo, usuarioId, comDenuncias, busca, sinal } = {}) {
  const { dados, meta } = await api.listar(
    '/admin/anuncios',
    { porPagina: 100, status, moderacaoStatus, tipo, usuarioId, comDenuncias, busca: busca || undefined },
    { sinal }
  );
  return { itens: (dados || []).map(paraItem), total: meta.total || 0 };
}

export async function listarFilaModeracao({ moderacaoStatus, tipo, comDenuncias, sinal } = {}) {
  const { dados, meta } = await api.listar(
    '/admin/moderacao/fila',
    { porPagina: 100, moderacaoStatus, tipo, comDenuncias },
    { sinal }
  );
  return { itens: (dados || []).map(paraItem), total: meta.total || 0 };
}

/** ficha: o item de lista mais o que só a página de detalhe usa */
function paraDetalhe(item) {
  return {
    ...paraItem(item),
    descricao: item.descricao || '',
    moderacaoMotivo: item.moderacaoMotivo || null,
    denunciasAbertas: item.denunciasAbertas || 0,
    fotos: (item.fotos || []).filter((foto) => !foto.bloqueada),
  };
}

export const obterAnuncio = async (id, { sinal } = {}) =>
  paraDetalhe(await api.get(`/admin/anuncios/${id}`, undefined, { sinal }));

export const editarAnuncio = (id, { titulo, descricao, precoCentavos, categoriaId, condicao, negociacao, motivo }) =>
  api.patch(`/admin/anuncios/${id}`, { titulo, descricao, precoCentavos, categoriaId, condicao, negociacao, motivo });

export const removerAnuncio = (id, motivo) => api.delete(`/admin/anuncios/${id}`, { corpo: { motivo } });

export const aprovarAnuncio = (id, observacao) => api.post(`/admin/anuncios/${id}/aprovar`, { observacao });

export const reprovarAnuncio = (id, motivo) => api.post(`/admin/anuncios/${id}/reprovar`, { motivo });

export const ocultarAnuncio = (id, motivo) => api.post(`/admin/anuncios/${id}/ocultar`, { motivo });

export const destacarAnuncio = (id, { destacar, ateEm, motivo }) =>
  api.post(`/admin/anuncios/${id}/destacar`, { destacar, ateEm, motivo });

export const moderarEmLote = ({ ids, acao, motivo, notificar = true }) =>
  api.post('/admin/anuncios/lote/moderar', { ids, acao, motivo, notificar });
