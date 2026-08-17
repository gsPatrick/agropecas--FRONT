'use client';

/**
 * /anuncios/[id] — detalhe do anúncio.
 *
 * A tela existe para uma coisa: iniciar a conversa. Por isso o bloco de
 * contato é sticky no desktop e fixo no rodapé em mobile — rolar a descrição
 * nunca pode esconder o caminho para falar com o anunciante.
 *
 * Dois canais lado a lado (Maturacao/05, §8): WhatsApp, que é o hábito do
 * público, e o chat interno, que mantém o registro dentro da plataforma.
 */

import { useEffect, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader/AppHeader';
import AppFooter from '@/components/AppFooter/AppFooter';
import AdCard from '@/components/AdCard/AdCard';
import Badge from '@/components/Badge/Badge';
import Button from '@/components/Button/Button';
import Icon from '@/components/Icon/Icon';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import LocationMap from '@/components/LocationMap/LocationMap';
import Carousel from '@/components/Carousel/Carousel';
import RequerContaModal from '@/components/RequerContaModal/RequerContaModal';
import { useChat } from '@/components/ChatProvider/ChatProvider';
import { useSessao } from '@/lib/sessao';
import { buscarAnuncio, buscarParecidos, revelarWhatsapp } from '@/lib/dados/anuncio';
import styles from './page.module.css';

export default function AnuncioPage({ params }) {
  const router = useRouter();
  const { conversas, abrirConversa, setAberto } = useChat();
  const { autenticado, tipoPerfil } = useSessao();

  const [anuncio, setAnuncio] = useState(null);
  const [relacionados, setRelacionados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [ausente, setAusente] = useState(false);
  /* guardado depois do primeiro clique: revelar tem cota por usuário, então
     repetir a chamada a cada clique gastaria o limite de quem já viu o número */
  const [whatsapp, setWhatsapp] = useState(null);
  /* texto de "para X, crie uma conta" — null fecha o modal; string abre com
     a frase certa para a ação que o visitante tentou fazer */
  const [pedidoDeConta, setPedidoDeConta] = useState(null);

  useEffect(() => {
    const controle = new AbortController();

    setCarregando(true);

    buscarAnuncio(params.id, { sinal: controle.signal })
      .then((dados) => {
        setAnuncio(dados);
        setCarregando(false);

        /* os parecidos são secundários: falham em silêncio para não derrubar
           a página inteira por causa de um carrossel */
        return buscarParecidos(params.id, { sinal: controle.signal })
          .then(setRelacionados)
          .catch(() => {});
      })
      .catch((erro) => {
        if (erro.name === 'AbortError') return;

        /* 404 cai no estado que a página já tinha; qualquer outro erro também,
           porque não existe meia página de anúncio para mostrar */
        setAusente(true);
        setCarregando(false);
      });

    return () => controle.abort();
  }, [params.id]);

  if (ausente) notFound();

  /* a conversa é sempre a deste anúncio; se já existe, abre; senão, entra em
     modo rascunho — o `ChatProvider` só cria a conversa de verdade quando a
     primeira mensagem é enviada (`POST /conversas` faz as duas coisas numa
     chamada só) */
  function abrirChat() {
    /* visitante sem conta: antes era um redirecionamento direto e sem aviso
       para /entrar — agora explica o motivo primeiro */
    if (!autenticado) {
      setPedidoDeConta('conversar com o anunciante');
      return;
    }

    /* ⚠️ NÃO registra contato aqui. Clicar em "Conversar" só abre o balão —
       se a pessoa fechar sem escrever nada, não houve contato nenhum. O
       registro acontece quando a primeira mensagem é REALMENTE enviada
       (`ChatProvider.enviar`, no momento em que o rascunho vira conversa) —
       era aqui antes, e por isso "Últimos contatos" listava gente que nunca
       mandou mensagem: o clique já contava como contato. */

    /* o balão só existe para quem é cliente (ver `ChatWidget`) — quem vende
       tem a própria caixa de entrada em `/painel/mensagens`. Abrir o balão
       para essa conta clicaria em algo que não aparece na tela */
    if (tipoPerfil !== 'cliente') {
      router.push('/painel/mensagens');
      return;
    }

    const existente = conversas.find((conversa) => conversa.anuncio.id === anuncio.id);

    if (existente) {
      abrirConversa(existente.id);
    } else {
      abrirConversa(null, {
        anuncioId: anuncio.id,
        titulo: anuncio.titulo,
        preco: anuncio.preco,
        icone: anuncio.icone,
        vendedorNome: anuncio.autor,
        vendedorSlug: anuncio.autorSlug,
      });
    }

    setAberto(true);
  }

  const mensagem = anuncio
    ? encodeURIComponent(
        `Olá! Vi o anúncio "${anuncio.titulo}" na AgroPeças MT e tenho interesse.`
      )
    : '';
  const zap = whatsapp ? `https://wa.me/${whatsapp}?text=${mensagem}` : '#';

  /* preferência de contato do anunciante (Configurações → Privacidade). A API
     já manda os dois campos prontos — o bug era o front nunca ler nenhum dos
     dois e mostrar os dois botões sempre, mesmo quando o vendedor escolheu
     "só pelo chat" ou "nenhum contato direto" */
  const podeWhatsapp = Boolean(anuncio?.exibirWhatsapp);
  const podeChat = Boolean(anuncio?.aceitaChat);
  const semContatoDireto = !podeWhatsapp && !podeChat;

  /**
   * O número não vem no detalhe: ele sai do endpoint de revelação, que exige
   * login (401 para visitante) — a mesma regra que a tela já tinha.
   *
   * A aba é aberta ANTES do await de propósito: abrir depois da resposta é
   * tratado como pop-up pelo navegador e some sem aviso.
   */
  async function abrirWhatsapp(evento) {
    if (whatsapp) return; /* já revelado: o href verdadeiro resolve sozinho */

    evento.preventDefault();

    /* sem conta o pedido nem sai: evita abrir e ter que fechar a aba em
       branco, e mostra o motivo antes de qualquer coisa */
    if (!autenticado) {
      setPedidoDeConta('ver o WhatsApp do anunciante');
      return;
    }

    const aba = window.open('', '_blank', 'noopener,noreferrer');

    try {
      const dados = await revelarWhatsapp(anuncio.id);

      if (!dados?.whatsapp) {
        /* anunciante que só aceita chat: sem número, o caminho é o chat */
        aba?.close();
        abrirChat();
        return;
      }

      setWhatsapp(dados.whatsapp);

      const destino = `https://wa.me/${dados.whatsapp}?text=${mensagem}`;
      if (aba) aba.location.href = destino;
      else window.open(destino, '_blank', 'noopener,noreferrer');
    } catch (erro) {
      aba?.close();

      /* 401 aqui só aconteceria por sessão vencida entre o clique e a
         resposta — caso raro, mesmo aviso do caminho comum acima */
      if (erro.status === 401) {
        setPedidoDeConta('ver o WhatsApp do anunciante');
      }
    }
  }

  if (carregando || !anuncio) return <AnuncioEsqueleto />;

  return (
    <>
      <AppHeader />

      <main className={styles.main}>
        <div className={styles.inner}>
          <nav className={styles.crumbs} aria-label="Você está em">
            <Link href="/anuncios">Anúncios</Link>
            <Icon name="chevron-right" size={13} />
            <Link href={`/busca?cat=${anuncio.categoria}`}>
              {anuncio.tipo === 'servico' ? 'Serviços' : 'Peças'}
            </Link>
            <Icon name="chevron-right" size={13} />
            <span aria-current="page">{anuncio.titulo}</span>
          </nav>

          <div className={styles.layout}>
            {/* ── COLUNA PRINCIPAL ── */}
            <div className={styles.content}>
              <figure className={styles.gallery}>
                {anuncio.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={anuncio.foto} alt={anuncio.titulo} className={styles.photo} />
                ) : (
                  <span className={styles.placeholder} aria-hidden="true">
                    <Icon name={anuncio.icone || 'gear'} size={72} />
                  </span>
                )}

                <Badge
                  tone={anuncio.tipo === 'servico' ? 'lime' : 'forest'}
                  className={styles.tag}
                >
                  {anuncio.tipo === 'servico' ? 'Serviço' : 'Peça'}
                </Badge>
              </figure>

              <header className={styles.head}>
                <h1 className={styles.title}>{anuncio.titulo}</h1>

                <div className={styles.meta}>
                  <span className={styles.metaItem}>
                    <Icon name="pin" size={15} />
                    {anuncio.cidade} · {anuncio.uf}
                  </span>
                  {anuncio.condicao ? (
                    <span className={styles.metaItem}>
                      <Icon name="check" size={15} />
                      {anuncio.condicao}
                    </span>
                  ) : null}
                  <span className={styles.metaItem}>Publicado {anuncio.quando}</span>
                </div>
              </header>

              <section className={styles.block}>
                <h2 className={styles.blockTitle}>Descrição</h2>
                <p className={styles.text}>{anuncio.descricao}</p>
              </section>

              {anuncio.ficha.length > 0 ? (
                <section className={styles.block}>
                  <h2 className={styles.blockTitle}>Ficha</h2>
                  <dl className={styles.sheet}>
                    {anuncio.ficha.map((linha) => (
                      <div className={styles.sheetRow} key={linha.rotulo}>
                        <dt>{linha.rotulo}</dt>
                        <dd>{linha.valor}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}

              <LocationMap local={anuncio.local} />

              <aside className={styles.warning}>
                <Icon name="gear" size={18} />
                <p>
                  A AgroPeças MT conecta as partes, mas não participa da negociação.
                  Combine valores e entrega direto com o anunciante e confira a peça antes
                  de fechar negócio.
                </p>
              </aside>
            </div>

            {/* ── COLUNA DE CONTATO ── */}
            <aside className={styles.side}>
              <div className={styles.card}>
                <p className={styles.price}>
                  {anuncio.preco || <span className={styles.priceAsk}>Consultar valor</span>}
                </p>

                {semContatoDireto ? (
                  <p className={styles.channels}>
                    Este anunciante não disponibilizou WhatsApp nem chat no momento — tente ver
                    o perfil para outras formas de contato.
                  </p>
                ) : (
                  <>
                    <div className={styles.actions}>
                      {podeWhatsapp ? (
                        <Button
                          as="a"
                          href={zap}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="lg"
                          fullWidth
                          iconLeft="whatsapp"
                          onClick={abrirWhatsapp}
                        >
                          Falar no WhatsApp
                        </Button>
                      ) : null}

                      {podeChat ? (
                        <Button
                          variant={podeWhatsapp ? 'outline' : 'primary'}
                          size="lg"
                          fullWidth
                          iconLeft="mail"
                          onClick={abrirChat}
                        >
                          Conversar pelo sistema
                        </Button>
                      ) : null}
                    </div>

                    <p className={styles.channels}>
                      {podeWhatsapp && podeChat
                        ? 'Escolha por onde falar: o WhatsApp abre a conversa no seu celular; o chat guarda o histórico aqui na plataforma.'
                        : podeWhatsapp
                          ? 'Este anunciante prefere ser chamado pelo WhatsApp.'
                          : 'Este anunciante atende só pelo chat da plataforma.'}
                    </p>
                  </>
                )}

                <div className={styles.seller}>
                  <Link
                    href={`/perfil/${anuncio.autorSlug}`}
                    className={styles.avatar}
                    aria-label={`Ver perfil de ${anuncio.autor}`}
                  >
                    {anuncio.autorFoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={anuncio.autorFoto} alt="" className={styles.avatarPhoto} />
                    ) : (
                      <span className={styles.initials}>{anuncio.autorIniciais}</span>
                    )}
                    <span className={styles.avatarBadge} aria-hidden="true">
                      <Icon name={anuncio.perfilIcone || 'tractor'} size={11} />
                    </span>
                  </Link>

                  <div className={styles.sellerBody}>
                    <Link href={`/perfil/${anuncio.autorSlug}`} className={styles.sellerName}>
                      {anuncio.autor}
                      {anuncio.verificado ? (
                        <span className={styles.verified} title="Cadastro verificado">
                          <Icon name="check" size={10} />
                        </span>
                      ) : null}
                    </Link>
                    <span className={styles.sellerMeta}>
                      {anuncio.perfil} · {anuncio.cidade}
                    </span>
                    <span className={styles.sellerMeta}>Na plataforma desde {anuncio.membroDesde}</span>
                  </div>
                </div>

                <Button
                  as={Link}
                  href={`/perfil/${anuncio.autorSlug}`}
                  variant="ghost"
                  size="sm"
                  fullWidth
                  iconRight="chevron-right"
                >
                  Ver perfil do anunciante
                </Button>
              </div>
            </aside>
          </div>

          {relacionados.length > 0 ? (
            <section className={styles.related}>
              <h2 className={styles.relatedTitle}>Anúncios parecidos</h2>
              <Carousel label="Anúncios parecidos">
                {relacionados.map((item) => (
                  <AdCard key={item.id} ad={item} />
                ))}
              </Carousel>
            </section>
          ) : null}
        </div>

        {/* barra fixa no celular: o contato não pode depender de rolagem */}
        {!semContatoDireto ? (
          <div className={styles.mobileBar}>
            <span className={styles.mobilePrice}>{anuncio.preco || 'Consultar'}</span>
            <div className={styles.mobileActions}>
              {podeChat ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={abrirChat}
                  aria-label="Conversar pelo sistema"
                >
                  <Icon name="mail" size={17} />
                </Button>
              ) : null}

              {podeWhatsapp ? (
                <Button as="a" href={zap} target="_blank" rel="noopener noreferrer" size="sm" iconLeft="whatsapp" onClick={abrirWhatsapp}>
                  WhatsApp
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </main>

      <AppFooter />

      <RequerContaModal
        open={Boolean(pedidoDeConta)}
        onClose={() => setPedidoDeConta(null)}
        acao={pedidoDeConta}
        retorno={`/anuncios/${params.id}`}
      />
    </>
  );
}

/**
 * Esqueleto da página.
 *
 * Reusa as MESMAS classes do conteúdo real (`gallery`, `title`, `card`…) para
 * que os blocos nasçam já no tamanho definitivo: assim a chegada dos dados não
 * empurra o botão de contato para outro lugar depois que a pessoa mirou nele.
 * Nenhuma regra de CSS nova — só o `Esqueleto` dentro do esqueleto do layout.
 */
function AnuncioEsqueleto() {
  return (
    <>
      <AppHeader />

      <main className={styles.main}>
        <div className={styles.inner}>
          <nav className={styles.crumbs} aria-hidden="true">
            <Esqueleto largura={160} altura={13} />
          </nav>

          <div className={styles.layout}>
            <div className={styles.content}>
              <figure className={styles.gallery}>
                <Esqueleto largura="100%" altura="100%" raio="var(--radius-2xl)" />
              </figure>

              <header className={styles.head}>
                <h1 className={styles.title}>
                  <Esqueleto largura="72%" altura={30} />
                </h1>
                <div className={styles.meta}>
                  <Esqueleto largura={140} altura={15} />
                  <Esqueleto largura={90} altura={15} />
                  <Esqueleto largura={110} altura={15} />
                </div>
              </header>

              <section className={styles.block}>
                <h2 className={styles.blockTitle}>
                  <Esqueleto largura={110} altura={18} />
                </h2>
                <p className={styles.text}>
                  <Esqueleto largura="100%" altura={14} />
                  <Esqueleto largura="96%" altura={14} />
                  <Esqueleto largura="60%" altura={14} />
                </p>
              </section>

              <section className={styles.block}>
                <h2 className={styles.blockTitle}>
                  <Esqueleto largura={70} altura={18} />
                </h2>
                <dl className={styles.sheet}>
                  {[0, 1, 2, 3].map((linha) => (
                    <div className={styles.sheetRow} key={linha}>
                      <dt>
                        <Esqueleto largura={90} altura={14} />
                      </dt>
                      <dd>
                        <Esqueleto largura={150} altura={14} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>

            <aside className={styles.side}>
              <div className={styles.card}>
                <p className={styles.price}>
                  <Esqueleto largura={150} altura={30} />
                </p>

                <div className={styles.actions}>
                  <Esqueleto largura="100%" altura={48} raio="var(--radius-lg)" />
                  <Esqueleto largura="100%" altura={48} raio="var(--radius-lg)" />
                </div>

                <p className={styles.channels}>
                  <Esqueleto largura="100%" altura={12} />
                  <Esqueleto largura="80%" altura={12} />
                </p>

                <div className={styles.seller}>
                  <span className={styles.avatar}>
                    <Esqueleto largura="100%" altura="100%" raio="50%" />
                  </span>
                  <div className={styles.sellerBody}>
                    <Esqueleto largura={150} altura={16} />
                    <Esqueleto largura={110} altura={13} />
                    <Esqueleto largura={130} altura={13} />
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <AppFooter />
    </>
  );
}
