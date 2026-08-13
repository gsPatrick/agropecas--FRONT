'use client';

/**
 * Cliente do Socket.IO — a ligação viva com `src/tempo-real/` na API.
 *
 * Substituiu a sondagem periódica que o chat usava (`ChatProvider.js`, antes
 * `setInterval` de 20s): a API sempre teve o servidor pronto, o que faltava
 * era esta dependência no front (`socket.io-client`), deliberadamente adiada
 * quando o chat foi integrado pela primeira vez.
 *
 * Um socket só para a aba inteira — `useSessao` é chamado de vários
 * componentes (`AppHeader`, `ChatWidget`, `PainelShell`...) e cada um abrindo
 * a própria conexão multiplicaria handshakes e salas por nada. Quem quer
 * eventos usa `assinar(evento, ouvinte)`, que devolve a função de cancelar.
 */

import { io } from 'socket.io-client';
import { EVENTOS } from '@/lib/tempo-real-eventos';

const CHAVE_TOKEN = 'agropecas:token';
const BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3334/api/v1').replace(
  /\/api\/v1\/?$/,
  ''
);

function lerToken() {
  try {
    return localStorage.getItem(CHAVE_TOKEN);
  } catch {
    return null;
  }
}

let socket = null;

/**
 * Conecta (ou devolve a conexão já aberta) para o token atual.
 *
 * Chamado de dentro de um `useEffect` — nunca no corpo do componente — porque
 * cria efeito colateral de rede. Se o token mudar (login/logout/renovação), a
 * conexão antiga é encerrada e uma nova sobe com o token novo: um socket
 * autenticado como a pessoa errada é pior que nenhum socket.
 */
export function conectar() {
  const token = lerToken();
  if (!token) return null;

  if (socket && socket.auth?.token === token) return socket;

  if (socket) socket.disconnect();

  socket = io(BASE, {
    path: '/tempo-real',
    auth: { token },
    /* poucas tentativas, com backoff — o `setInterval` de 60s em
       `ChatProvider` já cobre a rede caindo por mais tempo que isso */
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  return socket;
}

export function desconectar() {
  socket?.disconnect();
  socket = null;
}

/**
 * Assina um evento; devolve a função de cancelar.
 *
 * `sinal` não existe aqui (isto não é `fetch`) — o padrão é `useEffect`
 * devolvendo o resultado desta chamada como função de limpeza.
 */
export function assinar(evento, ouvinte) {
  const atual = conectar();
  if (!atual) return () => {};

  atual.on(evento, ouvinte);
  return () => atual.off(evento, ouvinte);
}

export function emitir(evento, dados) {
  conectar()?.emit(evento, dados);
}

export { EVENTOS };
