/**
 * Origem de dados do chat — `/mensagens`, o balão (`ChatWidget`) e o botão
 * "Conversar" da página do anúncio. Os três leem do mesmo `ChatProvider`, que
 * é quem chama estas funções; nenhum componente visual importa `api`
 * diretamente.
 *
 * Endpoints usados:
 *   GET  /conversas               → caixa de entrada
 *   GET  /conversas/:id/mensagens → histórico de uma conversa (cursor, mais
 *                                   recente primeiro — invertido aqui)
 *   POST /conversas               → primeira mensagem de uma conversa nova
 *   POST /conversas/:id/mensagens → resposta numa conversa existente
 *   POST /conversas/:id/ler       → zera o contador do lado de quem abriu
 *
 * ⚠️ Sem presença em tempo real nesta integração: o indicador "online agora"
 * dependeria de socket.io-client, que não está entre as dependências do
 * projeto — nenhuma biblioteca nova foi adicionada. `online` fica sempre
 * `false`; ChatList/ChatThread já tratam isso normalmente (o ponto verde só
 * some, nada quebra). O "tempo real" que existe aqui é sondagem periódica
 * (ver `INTERVALO_SONDAGEM` em `ChatProvider`), suficiente para o volume de
 * mensagens de um classificado — trocar por WebSocket depois não muda a
 * interface que os componentes consomem.
 */

import api from '@/lib/api';

/* ── formatação ───────────────────────────────────────────────── */

const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function formatarPreco(precoCentavos) {
  if (precoCentavos === null || precoCentavos === undefined) return null;
  return MOEDA.format(precoCentavos / 100);
}

/** "2026-08-15T14:02:00Z" → "14:02" — mesmo formato que o mock sempre usou */
function paraHora(iso) {
  if (!iso) return '';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/* ── tradução API → forma que ChatList/ChatThread já desenhavam ─── */

function paraConversa(item) {
  const outra = item.outraParte || {};
  const anuncio = item.anuncio || {};

  return {
    id: item.id,
    pessoaId: outra.id || null,
    pessoa: outra.nome || 'Anunciante',
    pessoaTipo: outra.tipo || null,
    slug: outra.slug || '',
    /* sem presença em tempo real — ver o aviso no topo do arquivo */
    online: false,
    anuncio: {
      id: anuncio.id,
      /* a listagem de conversas não traz categoria: sem ícone próprio, o
         genérico evita `<Icon name={undefined}>` silenciosamente vazio */
      icone: 'grid',
      titulo: anuncio.titulo || 'Anúncio',
      preco: formatarPreco(anuncio.precoCentavos),
      /* se o anúncio ainda está no ar — é o que separa "negociação em
         aberto" de "histórico" na tela de favoritos (`/painel/favoritos`) */
      status: anuncio.status || null,
    },
    naoLidas: item.naoLidas || 0,
    /* preenchido só quando a conversa é aberta — ver `carregarMensagens`.
       A prévia da lista usa `ultimaMensagem`, não este array */
    mensagens: [],
    ultimaMensagem: item.ultimaMensagem
      ? { texto: item.ultimaMensagem.previa, hora: paraHora(item.ultimaMensagem.em), minha: item.ultimaMensagem.minha }
      : null,
    totalMensagens: item.totalMensagens || 0,
  };
}

/* exportada: `ChatProvider` usa para traduzir a mensagem que chega pelo
   evento `mensagem:nova` do socket — o mesmo mapper de `conversa.mapper.js`
   que gera cada item de `GET /conversas/:id/mensagens` */
export function paraMensagem(item) {
  return {
    id: item.id,
    de: item.minha ? 'eu' : 'ela',
    texto: item.conteudo,
    hora: paraHora(item.criadoEm),
  };
}

/* ── consultas ────────────────────────────────────────────────── */

export async function carregarConversas({ sinal } = {}) {
  const { dados } = await api.listar('/conversas', { porPagina: 100 }, { sinal });
  return (dados || []).map(paraConversa);
}

/**
 * Histórico de uma conversa, do mais antigo para o mais novo — invertido em
 * relação à API, que devolve por cursor decrescente (mais recente primeiro,
 * o formato certo para paginar "carregar mais antigas", não para desenhar
 * uma tela de cima para baixo).
 */
export async function carregarMensagens(conversaId, { sinal } = {}) {
  const itens = await api.get(`/conversas/${conversaId}/mensagens`, { limite: 100 }, { sinal });
  return (itens || []).map(paraMensagem).reverse();
}

export const marcarComoLida = (conversaId) => api.post(`/conversas/${conversaId}/ler`);

/**
 * Resposta numa conversa que já existe.
 * Devolve a mensagem no MESMO formato de `carregarMensagens`, para o provedor
 * poder trocar a versão otimista pela confirmada sem traduzir de novo.
 */
export const enviarMensagem = (conversaId, texto) =>
  api.post(`/conversas/${conversaId}/mensagens`, { conteudo: texto }).then(paraMensagem);

/**
 * Primeira mensagem de uma conversa nova.
 *
 * `POST /conversas` cria a conversa E a primeira mensagem numa chamada só —
 * é por isso que "Conversar" na página do anúncio não precisa de dois
 * cliques. Devolve a conversa já no formato da lista, pronta para entrar em
 * `conversas` sem mais tradução.
 */
export async function iniciarConversa(anuncioId, texto) {
  const item = await api.post('/conversas', { anuncioId, mensagem: texto });
  return paraConversa(item);
}
