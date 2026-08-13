/**
 * Conversas de exemplo até o backend existir.
 *
 * Toda conversa nasce de um anúncio (Maturacao/05, §8.2.1) — por isso todas
 * carregam `anuncio`. Sem esse vínculo a mensagem chega sem contexto e não há
 * como moderar com referência.
 */

export const CONVERSAS = [
  {
    id: 'c1',
    /* ⚠️ provisório: já nasce com mensagem sem ler, senão o painel só mostra
       o aviso depois dos 45s da simulação e o layout parece incompleto */
    naoLidas: 2,
    pessoa: 'Peças Tangará',
    slug: 'pecas-tangara',
    perfil: 'Loja de Peças',
    icone: 'store',
    online: true,
    anuncio: {
      id: 'correia-john-deere-6110',
      titulo: 'Correia do alternador John Deere 6110J',
      preco: 'R$ 320,00',
      icone: 'belt',
    },
    mensagens: [
      { id: 'm1', de: 'eu', texto: 'Boa tarde! Essa correia serve no 6110E também?', hora: '14:02' },
      {
        id: 'm2',
        de: 'ela',
        texto: 'Boa tarde! Serve sim, no 6110E e no 6115J. Temos duas em estoque.',
        hora: '14:05',
      },
      { id: 'm3', de: 'eu', texto: 'Consegue entregar em Barra do Bugres?', hora: '14:06' },
    ],
  },
  {
    id: 'c2',
    naoLidas: 1,
    pessoa: 'Oficina do Zé',
    slug: 'oficina-do-ze',
    perfil: 'Prestador de Serviços',
    icone: 'wrench',
    online: false,
    anuncio: {
      id: 'mecanica-campo',
      titulo: 'Mecânica agrícola com atendimento na propriedade',
      preco: null,
      icone: 'wrench',
    },
    mensagens: [
      {
        id: 'm1',
        de: 'ela',
        texto: 'Bom dia! Consigo passar aí na quinta pela manhã. Qual o modelo do trator?',
        hora: '09:12',
      },
    ],
  },
  {
    id: 'c3',
    pessoa: 'AgroDiesel Sorriso',
    slug: 'agrodiesel-sorriso',
    perfil: 'Loja de Peças',
    icone: 'store',
    online: true,
    anuncio: {
      id: 'rolamento-colhedora',
      titulo: 'Rolamento do eixo traseiro para colhedora',
      preco: 'R$ 890,00',
      icone: 'bearing',
    },
    mensagens: [
      { id: 'm1', de: 'eu', texto: 'Ainda tem esse rolamento?', hora: 'ontem' },
      { id: 'm2', de: 'ela', texto: 'Tem sim! Posso separar para você.', hora: 'ontem' },
    ],
  },
];

/* respostas automáticas para demonstrar a chegada de mensagem */
export const RESPOSTAS = [
  'Consigo sim, sem problema.',
  'Deixa eu confirmar no estoque e já te falo.',
  'Posso entregar amanhã de manhã, serve?',
  'Fechado! Qualquer coisa me chama por aqui.',
  'Vou verificar e te retorno em instantes.',
];

export function horaAgora() {
  const agora = new Date();
  return `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
}
