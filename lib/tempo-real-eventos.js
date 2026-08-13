/**
 * Vocabulário de eventos do Socket.IO — espelho de `src/tempo-real/eventos.js`
 * na API. Fica em arquivo próprio (sem `'use client'`) para poder ser
 * importado tanto do cliente do socket quanto de qualquer teste, sem puxar
 * `socket.io-client` sem necessidade.
 */

export const EVENTOS = {
  MENSAGEM_NOVA: 'mensagem:nova',
  MENSAGEM_LIDA: 'mensagem:lida',
  CONVERSA_ATUALIZADA: 'conversa:atualizada',
  DIGITANDO: 'conversa:digitando',

  NOTIFICACAO_NOVA: 'notificacao:nova',
  CONTADOR_ATUALIZADO: 'contador:atualizado',
};

export const ENTRADA = {
  ENTRAR_CONVERSA: 'conversa:entrar',
  SAIR_CONVERSA: 'conversa:sair',
  DIGITANDO: 'conversa:digitando',
  MARCAR_LIDA: 'conversa:marcar-lida',
};
