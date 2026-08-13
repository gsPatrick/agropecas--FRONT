'use client';

/**
 * ChatProvider — estado único das conversas, agora vindo da API.
 *
 * O balão flutuante, a página /mensagens, o resumo em `/conta` e os
 * contadores do cabeçalho/painel leem daqui — é por isso que um estado
 * central existe: sem ele, marcar como lida no balão não zeraria o contador
 * da página, e vice-versa.
 *
 * A INTERFACE PÚBLICA CONTINUA A MESMA (`conversas`, `ativa`, `aberto`,
 * `naoLidas`, `setAberto`, `abrirConversa`, `enviar`), com duas adições:
 * `conversaAtiva` (o objeto já resolvido, para quem consumia via `.find()`)
 * e `iniciarRascunho` (abrir o compositor sem conversa existente, a partir de
 * um anúncio — ver `app/anuncios/[id]/page.js`).
 *
 * ─── tempo real via Socket.IO, sondagem como rede de segurança ──────
 *
 * `socket.io-client` entrou no projeto (ver `lib/tempo-real.js`) e a mensagem
 * chega pelo evento `mensagem:nova` — sem esperar o próximo ciclo de
 * `INTERVALO_SONDAGEM`. A sondagem não sumiu: continua rodando, só que a cada
 * 60s em vez de 20s, como reconciliação — se o socket cair (rede instável,
 * aba em segundo plano derrubando a conexão), a lista ainda se corrige
 * sozinha, só que mais devagar. Quem consome este provedor não muda nada: os
 * dois caminhos escrevem no mesmo `conversas`.
 *
 * ─── por que só busca para QUEM ESTÁ LOGADO, de qualquer perfil ───
 *
 * Conversa é dado de qualquer conta, vendedora ou compradora — os três perfis
 * do documento da cliente também compram (Maturacao/05 §6). O que é exclusivo
 * do `cliente` é a TELA (`/mensagens` e o balão, ver `ChatWidget.js` e
 * `app/mensagens/page.js`); o vendedor tem a própria caixa de entrada em
 * `/painel/mensagens`. Por isso este provedor busca para todo autenticado —
 * inclusive para alimentar o contador da barra lateral do painel — mas quem
 * decide ONDE mostrar isso é cada tela, não este arquivo.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSessao } from '@/lib/sessao';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import { assinar, EVENTOS } from '@/lib/tempo-real';
import {
  carregarConversas,
  carregarMensagens,
  marcarComoLida,
  enviarMensagem,
  iniciarConversa,
  paraMensagem,
} from '@/lib/dados/mensagens';

const ChatContext = createContext(null);

/* rede de segurança — o normal é o socket entregar antes disso rodar */
const INTERVALO_SONDAGEM = 60000;

export function useChat() {
  const contexto = useContext(ChatContext);
  if (!contexto) throw new Error('useChat precisa estar dentro de ChatProvider');
  return contexto;
}

export default function ChatProvider({ children }) {
  const { autenticado } = useSessao();
  const aviso = useAviso();

  const [conversas, setConversas] = useState([]);
  const [ativa, setAtiva] = useState(null);
  const [aberto, setAberto] = useState(false);
  /* uma conversa que ainda não existe no servidor: nasce ao clicar
     "Conversar" num anúncio sem histórico prévio, e vira conversa de verdade
     só quando a primeira mensagem é enviada (ver `enviar` mais abaixo) */
  const [rascunho, setRascunho] = useState(null);
  /* ids cujas mensagens já foram buscadas — evita repetir a chamada toda
     vez que a mesma conversa é reaberta na sessão */
  const carregadas = useRef(new Set());
  /* espelha `ativa` para o ouvinte do socket ler o valor de agora — o
     ouvinte é registrado uma vez (dependência `[autenticado]`) e uma
     closure sobre `ativa` ficaria presa no valor de quando assinou */
  const ativaRef = useRef(null);
  useEffect(() => {
    ativaRef.current = ativa;
  }, [ativa]);

  const audioRef = useRef(null);
  const liberadoRef = useRef(false);
  const tituloRef = useRef('');

  /* ── som ─────────────────────────────────────────────── */
  useEffect(() => {
    tituloRef.current = document.title;

    const liberar = () => {
      liberadoRef.current = true;
    };
    window.addEventListener('pointerdown', liberar, { once: true });
    window.addEventListener('keydown', liberar, { once: true });

    return () => {
      window.removeEventListener('pointerdown', liberar);
      window.removeEventListener('keydown', liberar);
    };
  }, []);

  /* o som é parte do aviso, não uma preferência: mensagem que chega calada em
     outra aba não é notificação nenhuma */
  const tocar = useCallback(() => {
    if (!liberadoRef.current) return;

    try {
      if (!audioRef.current) {
        const Contexto = window.AudioContext || window.webkitAudioContext;
        audioRef.current = new Contexto();
      }
      const ctx = audioRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      /* duas notas curtas: um bipe só soa como erro de sistema */
      [880, 1180].forEach((frequencia, indice) => {
        const oscilador = ctx.createOscillator();
        const ganho = ctx.createGain();
        const inicio = ctx.currentTime + indice * 0.12;

        oscilador.type = 'sine';
        oscilador.frequency.value = frequencia;
        ganho.gain.setValueAtTime(0.0001, inicio);
        ganho.gain.exponentialRampToValueAtTime(0.16, inicio + 0.02);
        ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.16);

        oscilador.connect(ganho).connect(ctx.destination);
        oscilador.start(inicio);
        oscilador.stop(inicio + 0.18);
      });
    } catch {
      /* falhou o áudio, seguem o contador e o título da aba */
    }
  }, []);

  /* ── contadores ──────────────────────────────────────── */
  const naoLidas = useMemo(
    () => conversas.reduce((total, conversa) => total + conversa.naoLidas, 0),
    [conversas]
  );

  useEffect(() => {
    const base = tituloRef.current || document.title;
    document.title = naoLidas > 0 ? `(${naoLidas}) ${base}` : base;
  }, [naoLidas]);

  /* ── carga inicial + sondagem ──────────────────────────── */
  useEffect(() => {
    if (!autenticado) {
      setConversas([]);
      carregadas.current = new Set();
      return undefined;
    }

    let cancelado = false;
    /* soma anterior, para o som/badge só reagirem a mensagem que chegou
       DEPOIS da carga inicial — sem isso, toda visita tocaria o som pelas
       não lidas que já existiam antes de abrir a página */
    let ultimaSoma = null;

    async function atualizar() {
      try {
        const lista = await carregarConversas();
        if (cancelado) return;

        const soma = lista.reduce((total, conversa) => total + conversa.naoLidas, 0);
        if (ultimaSoma !== null && soma > ultimaSoma) tocar();
        ultimaSoma = soma;

        /* preserva as mensagens já carregadas da conversa aberta: a sondagem
           não pode apagar o que a pessoa está lendo para trazer de volta um
           objeto "vazio" só porque a lista inteira foi recarregada */
        setConversas((atual) => {
          const porId = new Map(atual.map((conversa) => [conversa.id, conversa]));
          return lista.map((conversa) => ({
            ...conversa,
            mensagens: porId.get(conversa.id)?.mensagens || conversa.mensagens,
          }));
        });
      } catch {
        /* rede fora não pode derrubar o resto da tela — a próxima sondagem
           tenta de novo sozinha */
      }
    }

    atualizar();
    const id = setInterval(atualizar, INTERVALO_SONDAGEM);

    return () => {
      cancelado = true;
      clearInterval(id);
    };
  }, [autenticado, tocar]);

  /* ── tempo real: mensagem chegando agora ──────────────── */
  useEffect(() => {
    if (!autenticado) return undefined;

    const cancelarNova = assinar(EVENTOS.MENSAGEM_NOVA, ({ conversaId, mensagem }) => {
      const conversaAberta = ativaRef.current === conversaId;

      setConversas((atual) => {
        const existe = atual.some((conversa) => conversa.id === conversaId);
        /* conversa nova pra esta sessão (primeira mensagem de alguém que
           nunca tinha falado): a sondagem de 60s traz ela formada por
           inteiro — recriar isso só a partir do evento duplicaria a lógica
           de `carregarConversas` */
        if (!existe) return atual;

        const formatada = paraMensagem(mensagem);

        return atual.map((conversa) => {
          if (conversa.id !== conversaId) return conversa;

          return {
            ...conversa,
            mensagens: carregadas.current.has(conversaId)
              ? [...conversa.mensagens, formatada]
              : conversa.mensagens,
            naoLidas: conversaAberta ? 0 : conversa.naoLidas + 1,
            ultimaMensagem: { texto: formatada.texto, hora: formatada.hora, minha: formatada.de === 'eu' },
          };
        });
      });

      /* quem está com a conversa aberta não precisa do bipe — o balão já
         mostra a mensagem chegando. `minha` vem do payload cru do socket
         (mesmo campo que `paraMensagem` traduz para `de: 'eu'|'ela'`) */
      if (!conversaAberta && !mensagem.minha) tocar();
      if (conversaAberta) marcarComoLida(conversaId).catch(() => {});
    });

    return cancelarNova;
  }, [autenticado, tocar]);

  /* ── ações ───────────────────────────────────────────── */

  /**
   * Abre uma conversa existente, OU um rascunho quando ela ainda não existe.
   *
   * `id === null` sem `dadosRascunho` fecha a conversa aberta (comportamento
   * original, usado pelo botão de voltar no mobile).
   */
  const abrirConversa = useCallback(
    (id, dadosRascunho) => {
      if (id === null && dadosRascunho) {
        setRascunho(dadosRascunho);
        setAtiva('rascunho');
        return;
      }

      setRascunho(null);
      setAtiva(id);
      if (id === null) return;

      setConversas((atual) =>
        atual.map((conversa) => (conversa.id === id ? { ...conversa, naoLidas: 0 } : conversa))
      );

      /* mensagens vêm sob demanda: a lista já tem prévia (`ultimaMensagem`)
         suficiente para desenhar a caixa de entrada, e buscar o histórico
         inteiro de toda conversa ao carregar a página pagaria uma chamada
         por linha que a pessoa talvez nunca abra */
      if (!carregadas.current.has(id)) {
        carregadas.current.add(id);

        carregarMensagens(id)
          .then((mensagens) => {
            setConversas((atual) =>
              atual.map((conversa) => (conversa.id === id ? { ...conversa, mensagens } : conversa))
            );
          })
          .catch(() => {
            carregadas.current.delete(id);
            aviso.erro('Não foi possível abrir esta conversa.');
          });
      }

      marcarComoLida(id).catch(() => {});
    },
    [aviso]
  );

  const enviar = useCallback(
    async (id, texto) => {
      const limpo = texto.trim();
      if (!limpo) return;

      /* rascunho: ainda não existe conversa no servidor — a primeira
         mensagem CRIA a conversa (ver `iniciarConversa`) */
      if (id === 'rascunho' && rascunho) {
        try {
          const nova = await iniciarConversa(rascunho.anuncioId, limpo);
          nova.mensagens = [{ id: `local-${Date.now()}`, de: 'eu', texto: limpo, hora: '' }];
          carregadas.current.add(nova.id);

          setConversas((atual) => [nova, ...atual.filter((item) => item.id !== nova.id)]);
          setAtiva(nova.id);
          setRascunho(null);
        } catch {
          aviso.erro('Não foi possível enviar a mensagem. Tente de novo.');
        }
        return;
      }

      /* otimista: o balão precisa parecer instantâneo, e a maioria dos envios
         não falha */
      const idLocal = `local-${Date.now()}`;
      setConversas((atual) =>
        atual.map((conversa) =>
          conversa.id === id
            ? { ...conversa, mensagens: [...conversa.mensagens, { id: idLocal, de: 'eu', texto: limpo, hora: '' }] }
            : conversa
        )
      );

      try {
        const confirmada = await enviarMensagem(id, limpo);

        setConversas((atual) =>
          atual.map((conversa) =>
            conversa.id === id
              ? {
                  ...conversa,
                  mensagens: conversa.mensagens.map((mensagem) =>
                    mensagem.id === idLocal ? confirmada : mensagem
                  ),
                }
              : conversa
          )
        );
      } catch {
        /* a mensagem otimista sai da tela: deixá-la ali diria "enviado" para
           algo que o servidor nunca recebeu */
        setConversas((atual) =>
          atual.map((conversa) =>
            conversa.id === id
              ? { ...conversa, mensagens: conversa.mensagens.filter((mensagem) => mensagem.id !== idLocal) }
              : conversa
          )
        );
        aviso.erro('A mensagem não foi enviada. Tente de novo.');
      }
    },
    [rascunho, aviso]
  );

  /* o objeto resolvido — rascunho vira uma conversa "de mentira" só para o
     ChatThread ter o que desenhar (avatar, nome, anúncio, campo de texto) */
  const conversaAtiva = useMemo(() => {
    if (ativa === 'rascunho' && rascunho) {
      return {
        id: 'rascunho',
        pessoa: rascunho.vendedorNome,
        slug: rascunho.vendedorSlug,
        online: false,
        anuncio: { id: rascunho.anuncioId, icone: rascunho.icone, titulo: rascunho.titulo, preco: rascunho.preco },
        naoLidas: 0,
        mensagens: [],
      };
    }

    return conversas.find((conversa) => conversa.id === ativa) || null;
  }, [ativa, rascunho, conversas]);

  const valor = useMemo(
    () => ({
      conversas,
      ativa,
      conversaAtiva,
      aberto,
      naoLidas,
      setAberto,
      abrirConversa,
      enviar,
    }),
    [conversas, ativa, conversaAtiva, aberto, naoLidas, abrirConversa, enviar]
  );

  return <ChatContext.Provider value={valor}>{children}</ChatContext.Provider>;
}
