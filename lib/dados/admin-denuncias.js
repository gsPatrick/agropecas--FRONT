/**
 * Denúncias, do lado da administração — `/admin/denuncias/*`
 * (`admin.comunidade.denuncias.service`, que delega à feature
 * `src/features/denuncia`).
 *
 * A fila vem priorizada pela própria API (mais denúncias no mesmo alvo
 * primeiro), com o denunciado e um resumo do alvo já resolvidos por JOIN/
 * consultas em lote — nada disso é recalculado aqui.
 *
 * O denunciante NÃO vem na listagem nem no detalhe padrão: é decisão da
 * feature (ver `denuncia.mapper.js`) e o adaptador não tenta contornar isso
 * pedindo outro campo — só existiria via `itemComDenunciante`, que a rota
 * administrativa de leitura simples não expõe.
 */

import api from '@/lib/api';

export const STATUS_DENUNCIA = {
  aberta: { rotulo: 'Aberta', tom: 'alerta' },
  em_analise: { rotulo: 'Em análise', tom: 'alerta' },
  procedente: { rotulo: 'Procedente', tom: 'perigo' },
  improcedente: { rotulo: 'Improcedente', tom: 'neutro' },
  arquivada: { rotulo: 'Arquivada', tom: 'neutro' },
};

export const MOTIVOS_DENUNCIA = {
  spam: 'Spam',
  golpe: 'Golpe',
  produto_proibido: 'Produto proibido',
  produto_falsificado: 'Produto falsificado',
  conteudo_ofensivo: 'Conteúdo ofensivo',
  informacao_falsa: 'Informação falsa',
  duplicado: 'Duplicado',
  outro: 'Outro',
};

export const ALVO_DENUNCIA = {
  anuncio: 'Anúncio',
  perfil: 'Perfil',
  mensagem: 'Mensagem',
  conversa: 'Conversa',
};

function paraItem(item) {
  return {
    id: item.id,
    alvoTipo: item.alvoTipo,
    alvoId: item.alvoId,
    motivo: item.motivo,
    descricao: item.descricao,
    evidenciaUrl: item.evidenciaUrl,
    status: item.status,
    acaoTomada: item.acaoTomada,
    resolucao: item.resolucao,
    resolvidaPor: item.resolvidaPor,
    resolvidaEm: item.resolvidaEm,
    criadoEm: item.criadoEm,
    denunciasNoAlvo: item.denunciasNoAlvo || item.denuncias_no_alvo || 1,
    denunciado: item.denunciado || null,
    alvo: item.alvo || null,
  };
}

export async function listarDenuncias({
  status,
  alvoTipo,
  motivo,
  denunciadoId,
  semResponsavel,
  sinal,
} = {}) {
  const { dados, meta } = await api.listar(
    '/admin/denuncias',
    { porPagina: 100, status, alvoTipo, motivo, denunciadoId, semResponsavel },
    { sinal }
  );
  return { itens: (dados || []).map(paraItem), total: meta.total || 0 };
}

export const obterDenuncia = async (id, { sinal } = {}) =>
  paraItem(await api.get(`/admin/denuncias/${id}`, undefined, { sinal }));

/**
 * `status` é `'procedente' | 'improcedente' | 'arquivada'`, `acaoTomada` é um
 * dos valores fechados da feature (`nenhuma`, `anuncio_ocultado`, ...) e
 * `resolucao` é o texto da decisão — os três são obrigatórios na API.
 * `emLote` (padrão `true`) resolve de uma vez todas as denúncias abertas
 * sobre o mesmo alvo.
 */
export const resolverDenuncia = (id, { status, acaoTomada, resolucao, emLote = true }) =>
  api.post(`/admin/denuncias/${id}/resolver`, { status, acaoTomada, resolucao, emLote });
