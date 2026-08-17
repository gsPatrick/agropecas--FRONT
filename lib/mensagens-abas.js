/**
 * Vocabulário fixo das abas de `/painel/mensagens`. Não é dado de negócio —
 * é rótulo de filtro, igual `STATUS_ANUNCIO`/`PERIODOS` em outras telas.
 * A conversa/contato real vem de `useChat()` (`ChatProvider`).
 */

export const ABAS_MENSAGENS = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'novas', rotulo: 'Novas' },
  { id: 'naoLidas', rotulo: 'Não lidas' },
  { id: 'favoritas', rotulo: 'Favoritos' },
];
