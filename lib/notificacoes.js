'use client';

/**
 * ⚠️ PROVISÓRIO — notificações, sem API.
 *
 * O que aparece no sino do cabeçalho. Mora fora do componente porque o
 * contador do sino e a lista do dropdown precisam concordar: com o estado
 * dentro do dropdown, marcar como visualizado esvaziaria a lista sem baixar o
 * número ao lado do sino.
 *
 * **Marcar como visualizado remove da lista**, não pinta de cinza. O sino é
 * uma caixa de pendências, não um histórico: notificação lida que continua
 * ali só empurra a próxima para baixo. O que a pessoa quiser reencontrar está
 * na tela do assunto — a conversa, o anúncio, o contato.
 *
 * Quando a API existir, só este arquivo muda.
 */

import { useEffect, useState } from 'react';

const CHAVE = 'agropecas:notificacoes-lidas';

/**
 * As notificações do mock.
 *
 * Cada uma leva a um lugar concreto: notificação que não abre nada é aviso
 * sem saída, e a pessoa aprende a ignorar o sino.
 */
const BASE = [
  {
    id: 'n1',
    tipo: 'mensagem',
    icone: 'mail',
    titulo: 'Carlos Menezes respondeu',
    texto: 'Sobre "Bomba hidráulica John Deere 6110J"',
    href: '/painel/mensagens?conversa=c1',
    quando: 'há 12 min',
    urgente: false,
  },
  {
    id: 'n2',
    tipo: 'expirando',
    icone: 'clock',
    titulo: 'Anúncio expira em 2 dias',
    texto: '"Kit embreagem completo — Massey 292" sai do ar na quinta',
    href: '/painel/anuncios?status=publicado',
    quando: 'há 3 h',
    urgente: true,
  },
  {
    id: 'n3',
    tipo: 'contato',
    icone: 'phone',
    titulo: 'Novo contato pelo WhatsApp',
    texto: 'Agropeças Sinop chamou sobre "Jogo de rolamentos"',
    href: '/painel/mensagens',
    quando: 'há 5 h',
    urgente: false,
  },
  {
    id: 'n4',
    tipo: 'favorito',
    icone: 'heart',
    titulo: 'Seu anúncio foi favoritado',
    texto: '3 pessoas salvaram "Correia do alternador (usada)"',
    href: '/painel/desempenho',
    quando: 'ontem',
    urgente: false,
  },
  {
    id: 'n5',
    tipo: 'perfil',
    icone: 'user',
    titulo: 'Perfil incompleto',
    texto: 'Falta o WhatsApp — é por onde a maioria chama',
    href: '/painel/perfil',
    quando: 'ontem',
    urgente: false,
  },
  {
    id: 'n6',
    tipo: 'sistema',
    icone: 'bell',
    titulo: 'Novo acesso à sua conta',
    texto: 'Chrome em Cuiabá · MT. Não foi você? Encerre a sessão.',
    href: '/painel/configuracoes?secao=seguranca',
    quando: 'há 2 dias',
    urgente: true,
  },
];

let lidas = [];
const ouvintes = new Set();

function ler() {
  try {
    const bruto = sessionStorage.getItem(CHAVE);
    return bruto ? JSON.parse(bruto) : [];
  } catch {
    return [];
  }
}

function gravar(lista) {
  lidas = lista;

  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {}

  ouvintes.forEach((avisar) => avisar(lista));
}

export function useNotificacoes() {
  const [marcadas, setMarcadas] = useState(lidas);

  /* lido depois da montagem: sessionStorage não existe no servidor, e ler no
     primeiro render divergiria do HTML e quebraria a hidratação */
  useEffect(() => {
    lidas = ler();
    setMarcadas(lidas);

    ouvintes.add(setMarcadas);
    return () => ouvintes.delete(setMarcadas);
  }, []);

  const lista = BASE.filter((notificacao) => !marcadas.includes(notificacao.id));

  return {
    lista,
    total: lista.length,
    marcarUma: (id) => gravar([...lidas, id]),
    marcarTodas: () => gravar(BASE.map((notificacao) => notificacao.id)),
    /* devolver ao estado inicial só serve ao "Desfazer" do aviso */
    restaurar: (id) => gravar(lidas.filter((item) => item !== id)),
  };
}
