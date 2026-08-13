/**
 * Usuários, do lado da administração — `/admin/usuarios/*`
 * (`admin.usuarios.service.js` + `admin.usuarios.acoes.service.js`).
 *
 * ⚠️ Diferenças reais em relação ao mock (`lib/admin-mock.js`):
 *  · **Não existe "aguardando aprovação".** A conta nasce `pendente` (só
 *    "e-mail ainda não confirmado") e vira `ativo` sozinha ao confirmar ou
 *    fazer login — nunca por decisão do Admin. Por isso não há
 *    aprovar/recusar cadastro aqui; a única fila real da entrada é
 *    "perfis a verificar" (loja/prestador), que já tem tela própria pendente
 *    de rota — ver `admin.perfis.service.js`.
 *  · **Não existe "desativar"/"ativar" como sanção neutra.** As ações reais
 *    são `suspender` (com prazo), `banir` (permanente) e `restaurar` (volta
 *    de qualquer uma das duas) — três verbos, não cinco.
 *  · **Não existe "excluir" pelo Admin.** Apagar conta é autosserviço da
 *    LGPD (`/lgpd/anonimizacao`, ver `lib/dados/configuracoes.js`) — o Admin
 *    não aciona isso de fora, por desenho.
 * `STATUS_USUARIO` reflete o enum real (`pendente|ativo|suspenso|banido|
 * removido`), não as seis situações do mock.
 */

import api from '@/lib/api';

export const STATUS_USUARIO = {
  pendente: { rotulo: 'Pendente', tom: 'info' },
  ativo: { rotulo: 'Ativo', tom: 'ok' },
  suspenso: { rotulo: 'Suspenso', tom: 'alerta' },
  banido: { rotulo: 'Banido', tom: 'perigo' },
  removido: { rotulo: 'Removido', tom: 'neutro' },
};

export const TIPOS_PERFIL = {
  produtor: 'Produtor Rural',
  loja: 'Loja de Peças',
  prestador: 'Prestador de Serviços',
  cliente: 'Cliente',
};

function iniciais(nome = '') {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function paraLinha(item) {
  return {
    id: item.id,
    nome: item.nome,
    iniciais: iniciais(item.nome),
    email: item.email,
    tipo: item.perfil?.tipo || null,
    cidade: item.perfil?.uf || '',
    situacao: item.status,
    verificado: Boolean(item.perfil?.verificado),
    anuncios: item.perfil?.totalAnunciosAtivos || 0,
    papeis: item.papeis || [],
    suspensoAte: item.suspensoAte,
  };
}

export async function listarUsuarios({ status, tipoPerfil, busca, comDenuncias, sinal } = {}) {
  const { dados, meta } = await api.listar(
    '/admin/usuarios',
    { porPagina: 100, status, tipoPerfil, busca: busca || undefined, comDenuncias },
    { sinal }
  );

  return { itens: (dados || []).map(paraLinha), total: meta.total || 0 };
}

export async function obterUsuario(id, { sinal } = {}) {
  const item = await api.get(`/admin/usuarios/${id}`, undefined, { sinal });

  return {
    id: item.id,
    nome: item.nome,
    iniciais: iniciais(item.nome),
    email: item.email,
    telefone: item.telefone,
    whatsapp: item.whatsapp,
    situacao: item.status,
    motivoStatus: item.motivoStatus,
    suspensoAte: item.suspensoAte,
    papeis: item.papeis || [],
    tipo: item.perfil?.tipo || null,
    perfil: item.perfil,
    contadores: item.contadores,
    plano: item.plano,
  };
}

export const editarUsuario = (id, corpo) => api.patch(`/admin/usuarios/${id}`, corpo);

export const suspenderUsuario = (id, { motivo, dias, notificar = true }) =>
  api.post(`/admin/usuarios/${id}/suspender`, { motivo, dias, notificar });

export const banirUsuario = (id, { motivo, notificar = true }) =>
  api.post(`/admin/usuarios/${id}/banir`, { motivo, notificar });

export const restaurarUsuario = (id, motivo) => api.post(`/admin/usuarios/${id}/restaurar`, { motivo });

export const encerrarSessoesUsuario = (id) => api.post(`/admin/usuarios/${id}/encerrar-sessoes`, {});

export const sancionarEmLote = ({ ids, acao, motivo, dias, notificar = true }) =>
  api.post('/admin/usuarios/lote/sancionar', { ids, acao, motivo, dias, notificar });

export const atribuirPapel = (id, papel) => api.post(`/admin/usuarios/${id}/papeis`, { papel });

export const removerPapel = (id, papel) => api.delete(`/admin/usuarios/${id}/papeis/${papel}`);

export const verificarPerfil = (perfilId, observacao) => api.post(`/admin/perfis/${perfilId}/verificar`, { observacao });

export const revogarVerificacaoPerfil = (perfilId, motivo) => api.delete(`/admin/perfis/${perfilId}/verificar`, { corpo: { motivo } });
