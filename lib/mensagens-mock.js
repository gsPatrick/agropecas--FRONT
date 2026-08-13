/**
 * Vocabulário fixo das abas de `/painel/mensagens`. Não é dado de negócio —
 * é rótulo de filtro, igual `STATUS_ANUNCIO`/`PERIODOS` em outras telas.
 *
 * As funções que geravam conversa/contato/histórico falsos saíram daqui: o
 * painel de mensagens, a página de favoritos e a do contato favorito já leem
 * `useChat()` (`ChatProvider`), que é dado real desde a integração do chat em
 * tempo real.
 */

export const ABAS_MENSAGENS = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'novas', rotulo: 'Novas' },
  { id: 'naoLidas', rotulo: 'Não lidas' },
  { id: 'favoritas', rotulo: 'Favoritos' },
];
