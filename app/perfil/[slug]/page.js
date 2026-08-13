'use client';

/**
 * /perfil/[slug] — o perfil público do anunciante.
 *
 * Responde uma pergunta só: dá para confiar em quem está do outro lado?
 * Identidade, o que ele faz e os anúncios dele.
 *
 * Duas regras do produto valem aqui:
 *  · sem mapa — endereço e distância são do ANÚNCIO, não do perfil;
 *  · só WhatsApp — o chat do sistema nasce de um anúncio, porque toda conversa
 *    é sobre alguma coisa. Contato solto, sem contexto, é o começo do spam.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader/AppHeader';
import AppFooter from '@/components/AppFooter/AppFooter';
import AdCard from '@/components/AdCard/AdCard';
import Button from '@/components/Button/Button';
import Badge from '@/components/Badge/Badge';
import Icon from '@/components/Icon/Icon';
import Carousel from '@/components/Carousel/Carousel';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { carregarPerfil } from '@/lib/dados/perfil';
import { useSessao } from '@/lib/sessao';
import styles from './page.module.css';

/* Cada perfil responde a uma pergunta diferente:
   loja      → onde fica, quando abre, que marcas trabalha
   prestador → o que faz, onde atende, se vai até a propriedade
   produtor  → o que planta, que máquinas tem (é o que explica as peças) */
function Detalhes({ pessoa }) {
  if (pessoa.tipo === 'loja') {
    return (
      <>
        {pessoa.horario ? (
          <section className={styles.block}>
            <h2 className={styles.blockTitle}>Horário de atendimento</h2>
            <dl className={styles.hours}>
              {pessoa.horario.map((linha) => (
                <div key={linha.dia}>
                  <dt>{linha.dia}</dt>
                  <dd>{linha.hora}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {pessoa.marcas ? (
          <section className={styles.block}>
            <h2 className={styles.blockTitle}>Marcas que trabalha</h2>
            <ul className={styles.chips}>
              {pessoa.marcas.map((marca) => (
                <li className={styles.chip} key={marca}>
                  {marca}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {pessoa.entrega ? <p className={styles.note}>{pessoa.entrega}</p> : null}
      </>
    );
  }

  if (pessoa.tipo === 'prestador') {
    return (
      <>
        {pessoa.servicos ? (
          <section className={styles.block}>
            <h2 className={styles.blockTitle}>Serviços que presta</h2>
            <ul className={styles.chips}>
              {pessoa.servicos.map((servico) => (
                <li className={`${styles.chip} ${styles.chipGreen}`} key={servico}>
                  <Icon name="wrench" size={13} />
                  {servico}
                </li>
              ))}
            </ul>

            {/* como o serviço acontece é atributo do trabalho, não localização */}
            {pessoa.atendeNoCampo ? (
              <p className={styles.highlight}>
                <Icon name="tractor" size={17} />
                Atende na propriedade
              </p>
            ) : null}
          </section>
        ) : null}
      </>
    );
  }

  return (
    <>
      {pessoa.culturas ? (
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>Culturas</h2>
          <ul className={styles.chips}>
            {pessoa.culturas.map((cultura) => (
              <li className={styles.chip} key={cultura}>
                {cultura}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {pessoa.maquinario ? (
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>Maquinário</h2>
          <ul className={styles.chips}>
            {pessoa.maquinario.map((maquina) => (
              <li className={styles.chip} key={maquina}>
                <Icon name="tractor" size={13} />
                {maquina}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

/**
 * Esqueleto do topo — mesma grade, mesmas medidas do conteúdo real.
 *
 * Reaproveita as classes da própria página em vez de inventar caixas: assim o
 * bloco cinza ocupa exatamente o lugar do nome, da bio e dos números, e nada
 * se desloca quando os dados chegam.
 */
function Carregando() {
  return (
    <main className={styles.main}>
      <section className={styles.cover}>
        <div className={styles.inner}>
          <nav className={styles.crumbs} aria-label="Você está em">
            <Link href="/anuncios">Anúncios</Link>
            <Icon name="chevron-right" size={13} />
            <Esqueleto largura={140} altura={13} />
          </nav>

          <div className={styles.identity}>
            <div className={styles.avatar}>
              <Esqueleto largura="100%" altura="100%" raio="999px" />
            </div>

            <div className={styles.headText}>
              <h1 className={styles.name}>
                <Esqueleto largura={260} altura={30} />
              </h1>

              <div className={styles.tags}>
                <Esqueleto largura={120} altura={26} raio="999px" />
                <Esqueleto largura={150} altura={15} />
                <Esqueleto largura={110} altura={15} />
              </div>

              <p className={styles.bio}>
                <Esqueleto largura="100%" altura={15} />
              </p>
            </div>

            <div className={styles.actions}>
              <Esqueleto largura={190} altura={44} raio="999px" />
            </div>
          </div>

          <ul className={styles.stats}>
            <li>
              <Esqueleto largura={90} altura={34} />
            </li>
            <li>
              <Esqueleto largura={70} altura={34} />
            </li>
          </ul>
        </div>
      </section>

      <div className={`${styles.inner} ${styles.body}`}>
        <div className={styles.details}>
          <section className={styles.block}>
            <h2 className={styles.blockTitle}>
              <Esqueleto largura={140} altura={13} />
            </h2>
            <ul className={styles.chips}>
              <li>
                <Esqueleto largura={110} altura={31} raio="999px" />
              </li>
              <li>
                <Esqueleto largura={140} altura={31} raio="999px" />
              </li>
              <li>
                <Esqueleto largura={96} altura={31} raio="999px" />
              </li>
            </ul>
          </section>
        </div>
      </div>

      <section className={styles.list}>
        <div className={styles.inner}>
          <h2 className={styles.listTitle}>
            <Esqueleto largura={320} altura={26} />
          </h2>
          <Esqueleto largura="100%" altura={300} raio="16px" />
        </div>
      </section>
    </main>
  );
}

/**
 * Perfil que não existe (ou que a API não conseguiu entregar).
 *
 * Discreto de propósito e com as classes que já existem: quem chegou por link
 * velho precisa de uma saída, não de uma página de erro nova.
 */
function NaoEncontrado({ mensagem }) {
  return (
    <main className={styles.main}>
      <section className={styles.cover}>
        <div className={styles.inner}>
          <nav className={styles.crumbs} aria-label="Você está em">
            <Link href="/anuncios">Anúncios</Link>
            <Icon name="chevron-right" size={13} />
            <span aria-current="page">Perfil</span>
          </nav>

          <div className={styles.headText}>
            <h1 className={styles.name}>Perfil não encontrado</h1>
            <p className={styles.bio}>{mensagem}</p>
          </div>
        </div>
      </section>

      <div className={`${styles.inner} ${styles.body}`}>
        <div className={styles.details}>
          <Button as="a" href="/anuncios" iconLeft="chevron-right">
            Ver anúncios
          </Button>
        </div>
      </div>
    </main>
  );
}

export default function PerfilPage({ params }) {
  const { autenticado } = useSessao();
  const [pessoa, setPessoa] = useState(null);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    /* aborta ao trocar de slug: a resposta da navegação anterior chegando
       depois pintaria a tela com o perfil errado */
    const controle = new AbortController();

    setCarregando(true);
    setErro(null);

    carregarPerfil(params.slug, { sinal: controle.signal })
      .then((dados) => {
        setPessoa(dados);
        setCarregando(false);
      })
      .catch((falha) => {
        if (falha?.name === 'AbortError') return;
        setErro(falha);
        setCarregando(false);
      });

    return () => controle.abort();
  }, [params.slug]);

  if (carregando) {
    return (
      <>
        <AppHeader />
        <Carregando />
        <AppFooter />
      </>
    );
  }

  if (erro || !pessoa) {
    return (
      <>
        <AppHeader />
        <NaoEncontrado
          mensagem={
            erro?.status === 404 || !erro
              ? 'Este perfil não existe mais ou o endereço está errado.'
              : erro.message
          }
        />
        <AppFooter />
      </>
    );
  }

  const mensagem = encodeURIComponent(
    `Olá, ${pessoa.nome}! Vi seu perfil na AgroPeças MT e queria falar com você.`
  );
  const zap = `https://wa.me/${pessoa.whatsapp}?text=${mensagem}`;

  const pecas = pessoa.anuncios.filter((item) => item.tipo === 'peca').length;
  const servicos = pessoa.anuncios.filter((item) => item.tipo === 'servico').length;

  return (
    <>
      <AppHeader />

      <main className={styles.main}>
        <section className={styles.cover}>
          <div className={styles.inner}>
            <nav className={styles.crumbs} aria-label="Você está em">
              <Link href="/anuncios">Anúncios</Link>
              <Icon name="chevron-right" size={13} />
              <span aria-current="page">{pessoa.nome}</span>
            </nav>

            <div className={styles.identity}>
              <div className={styles.avatar}>
                {pessoa.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pessoa.foto} alt="" className={styles.avatarPhoto} />
                ) : (
                  <span className={styles.initials}>{pessoa.iniciais}</span>
                )}
                <span className={styles.avatarBadge} aria-hidden="true">
                  <Icon name={pessoa.icone} size={16} />
                </span>
              </div>

              <div className={styles.headText}>
                <h1 className={styles.name}>
                  {pessoa.nome}
                  {pessoa.verificado ? (
                    <span className={styles.verified} title="Cadastro verificado">
                      <Icon name="check" size={12} />
                    </span>
                  ) : null}
                </h1>

                <div className={styles.tags}>
                  <Badge tone="forest" icon={pessoa.icone}>
                    {pessoa.perfil}
                  </Badge>
                  <span className={styles.metaItem}>
                    <Icon name="pin" size={15} />
                    {pessoa.cidade} · {pessoa.uf}
                  </span>
                  <span className={styles.metaItem}>Desde {pessoa.membroDesde}</span>
                </div>

                <p className={styles.bio}>{pessoa.bio}</p>
              </div>

              <div className={styles.actions}>
                {/* duas condições, e as duas são de dado, não de estilo:
                    `whatsapp` só vem da API se o anunciante consentiu em
                    publicá-lo (LGPD), e o número só é oferecido a quem tem
                    conta — contato aberto para visitante anônimo é o começo
                    do spam. Sem as duas, o botão simplesmente não existe */}
                {autenticado && pessoa.whatsapp ? (
                  <Button
                    as="a"
                    href={zap}
                    target="_blank"
                    rel="noopener noreferrer"
                    iconLeft="whatsapp"
                  >
                    Falar no WhatsApp
                  </Button>
                ) : null}

                <p className={styles.chatNote}>
                  Para conversar pelo sistema, abra um anúncio — a conversa fica
                  vinculada a ele.
                </p>
              </div>
            </div>

            <ul className={styles.stats}>
              <li>
                <strong>{pessoa.anuncios.length}</strong>
                {pessoa.anuncios.length === 1 ? 'anúncio ativo' : 'anúncios ativos'}
              </li>
              {pecas > 0 ? (
                <li>
                  <strong>{pecas}</strong>
                  {pecas === 1 ? 'peça' : 'peças'}
                </li>
              ) : null}
              {servicos > 0 ? (
                <li>
                  <strong>{servicos}</strong>
                  {servicos === 1 ? 'serviço' : 'serviços'}
                </li>
              ) : null}
            </ul>
          </div>
        </section>

        <div className={`${styles.inner} ${styles.body}`}>
          <div className={styles.details}>
            <Detalhes pessoa={pessoa} />
          </div>
        </div>

        <section className={styles.list}>
          <div className={styles.inner}>
            <h2 className={styles.listTitle}>
              {pessoa.tipo === 'prestador' ? 'Serviços anunciados' : 'Anúncios'} de{' '}
              {pessoa.nome}
            </h2>

            {/* com a API o perfil pode não ter nenhum anúncio ativo — o mock
                sempre tinha. Carrossel vazio deixaria um buraco com setas que
                não levam a lugar nenhum */}
            {pessoa.anuncios.length > 0 ? (
              <Carousel label={`Anúncios de ${pessoa.nome}`}>
                {pessoa.anuncios.map((anuncio) => (
                  <AdCard key={anuncio.id} ad={anuncio} />
                ))}
              </Carousel>
            ) : (
              <p className={styles.note}>Nenhum anúncio ativo no momento.</p>
            )}
          </div>
        </section>
      </main>

      <AppFooter />
    </>
  );
}
