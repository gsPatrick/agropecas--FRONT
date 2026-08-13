/**
 * Conversas, do lado da administração — `/admin/conversas/*`
 * (`admin.comunidade.conversas.service.js`).
 *
 * Fluxo real, em dois tempos, e não um detalhe de UI: `GET /admin/conversas`
 * devolve só metadado (partes, anúncio, volume, denúncias em aberto) — SEM
 * conteúdo. O conteúdo só sai de `GET /admin/conversas/:id`, e essa rota
 * exige `motivo` (mínimo 10 caracteres) na query; sem ele a API responde 400.
 * Cada leitura de conteúdo grava `logs_acesso_dado` por titular (LGPD, art.
 * 18) e carimba `moderada_em/_por` na conversa — as duas partes veem que
 * houve moderação. Isto não é opcional nem contornável por aqui: é a regra
 * de negócio, e o adaptador só está repassando os parâmetros que ela exige.
 *
 * ⚠️ Diferença em relação ao mock (`lib/admin-mock.js`): o mock tinha uma
 * "remoção de mensagem" disparada por este fluxo. A API real tem essa
 * capacidade (`DELETE /admin/mensagens/:id`), mas sob outra permissão
 * (`mensagem.remover`, distinta de `conversa.ler`) — este módulo é
 * deliberadamente só-leitura (oversight), e não expõe remoção.
 */

import api from '@/lib/api';

export const STATUS_CONVERSA = {
  aberta: { rotulo: 'Aberta', tom: 'ok' },
  arquivada: { rotulo: 'Arquivada', tom: 'neutro' },
  bloqueada: { rotulo: 'Bloqueada', tom: 'perigo' },
  encerrada: { rotulo: 'Encerrada', tom: 'neutro' },
};

export function iniciais(nome = '') {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function paraParte(parte) {
  if (!parte) return null;
  return { ...parte, iniciais: iniciais(parte.nome || '') };
}

function paraItem(registro) {
  return {
    id: registro.id,
    status: registro.status,
    anuncio: registro.anuncio,
    anunciante: paraParte(registro.anunciante),
    interessado: paraParte(registro.interessado),
    totalMensagens: registro.totalMensagens || 0,
    ultimaMensagemEm: registro.ultimaMensagemEm,
    denunciasAbertas: registro.denunciasAbertas || 0,
    encerradaEm: registro.encerradaEm,
    moderadaEm: registro.moderadaEm,
    moderadaPor: registro.moderadaPor,
    criadoEm: registro.criadoEm,
  };
}

/**
 * Lista de conversas — SEM conteúdo, exatamente como a API entrega.
 *
 * `porPagina` alto (200) porque a tela de escolha (`/admin/conversas`) agrupa
 * o resultado por PESSOA no cliente — a API não tem uma rota "contas com
 * conversa", só "conversas"; agrupar aqui evita criar uma rota nova só para
 * isso.
 */
export async function listarConversas({
  usuarioId,
  status,
  anuncioId,
  comDenuncia,
  porPagina = 200,
  sinal,
} = {}) {
  const { dados, meta } = await api.listar(
    '/admin/conversas',
    { porPagina, usuarioId, status, anuncioId, comDenuncia },
    { sinal }
  );

  return { itens: (dados || []).map(paraItem), total: meta.total || 0 };
}

/**
 * Abre uma conversa: exige `motivo` (10+ caracteres) — a leitura fica
 * registrada em nome do titular dos dados. `denunciaId` é opcional; quando
 * informado e vinculado à conversa, a justificativa passa a contar com o
 * vínculo, não só o texto livre.
 */
export async function obterConversa(id, { motivo, denunciaId, antesDe, limite, sinal } = {}) {
  const dados = await api.get(
    `/admin/conversas/${id}`,
    { motivo, denunciaId, antesDe, limite },
    { sinal }
  );

  return {
    conversa: paraItem(dados.conversa),
    acesso: dados.acesso,
    mensagens: dados.mensagens || [],
    proximoCursor: dados.proximoCursor || null,
  };
}
