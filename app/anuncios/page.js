'use client';

/**
 * /anuncios — a listagem principal.
 *
 * A busca daqui NÃO filtra em tela: ela leva para /busca, que é onde moram os
 * filtros e a paginação. Manter as duas responsabilidades separadas evita a
 * tela que faz um pouco de cada coisa e nenhuma direito.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader/AppHeader';
import AppFooter from '@/components/AppFooter/AppFooter';
import NearbyHeader from '@/components/NearbyHeader/NearbyHeader';
import AdCard from '@/components/AdCard/AdCard';
import Reveal from '@/components/Reveal/Reveal';
import Pagination from '@/components/Pagination/Pagination';
import Button from '@/components/Button/Button';
import Icon from '@/components/Icon/Icon';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { CATEGORIAS } from '@/lib/anuncios';
import { listarAnuncios, listarCategorias } from '@/lib/dados/anuncios';
import styles from './page.module.css';

/* o esqueleto repete a anatomia do AdCard — foto 4/3, título em duas linhas,
   preço, local e rodapé. Ele existe justamente para o card real cair no mesmo
   lugar; um retângulo genérico deixaria a grade pular quando os dados chegam */
function EsqueletoCard() {
  return (
    <article className={styles.esqueletoCard} aria-hidden="true">
      {/* altura `auto` de propósito: quem define o tamanho é o aspect-ratio
          4/3 do CSS, igual ao da foto do card */}
      <Esqueleto altura="auto" raio="0" className={styles.esqueletoMedia} />

      <div className={styles.esqueletoBody}>
        <Esqueleto altura={17} largura="92%" />
        <Esqueleto altura={17} largura="64%" />
        <Esqueleto altura={20} largura="42%" />
        <Esqueleto altura={13} largura="55%" className={styles.esqueletoPlace} />
      </div>

      <div className={styles.esqueletoFoot}>
        <Esqueleto altura={24} largura={24} raio="50%" />
        <Esqueleto altura={12} largura="45%" />
      </div>
    </article>
  );
}

export default function AnunciosPage() {
  const router = useRouter();
  const [categoria, setCategoria] = useState('todas');
  const [local, setLocal] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(20);

  /* a lista vive na API: a página guarda só a fatia que está mostrando e o
     total, que vem da `meta` — contar o array daria "20 anúncios" sempre */
  const [itens, setItens] = useState([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [categorias, setCategorias] = useState(CATEGORIAS);

  /* chips vêm do catálogo real, senão o filtro apontaria para categorias que
     não existem no banco. Falha volta ao mock: barra vazia parece bug */
  useEffect(() => {
    const controle = new AbortController();

    listarCategorias({ sinal: controle.signal })
      .then(setCategorias)
      .catch(() => {});

    return () => controle.abort();
  }, []);

  useEffect(() => {
    const controle = new AbortController();
    setCarregando(true);

    listarAnuncios({
      pagina,
      porPagina,
      /* "todas" é ausência de filtro, não um id — não vai para a query */
      categoriaId: categoria === 'todas' ? undefined : categoria,
      /* com local escolhido, a ORDEM vem do banco: `ordenar=proximidade`
         calcula distância real e ordena a base inteira antes de paginar.
         Reordenar no cliente só rearranjava os 20 itens da página — o
         vizinho da página 3 nunca subia para a 1 */
      ordenar: local ? 'proximidade' : 'recentes',
      cidade: local?.cidade,
      uf: local?.uf,
      sinal: controle.signal,
    })
      .then(({ itens: lista, meta }) => {
        setItens(lista);
        setTotal(meta.total);
      })
      .catch((erro) => {
        /* troca rápida de página aborta a anterior: isso não é falha */
        if (erro?.name === 'AbortError') return;

        /* erro não derruba a tela — cai no estado vazio que já existe */
        setItens([]);
        setTotal(0);
      })
      .finally(() => {
        if (!controle.signal.aborted) setCarregando(false);
      });

    return () => controle.abort();
    /* `local` muda a ordem (proximidade) mas não é motivo para voltar à
       página 1 sozinho — só entra nas dependências do próprio efeito */
  }, [categoria, pagina, porPagina, local]);

  const aoTrocarCategoria = useCallback((id) => {
    setCategoria(id);
    setPagina(1);
  }, []);

  /* trocar a origem muda a ordem inteira: manter a pessoa na página 4 de uma
     lista que agora é outra a deixaria vendo o meio de um resultado novo */
  const aoMudarLocal = useCallback((dados) => {
    setLocal(dados);
    setPagina(1);
  }, []);

  function irParaBusca(termo) {
    const params = new URLSearchParams();
    if (termo) params.set('q', termo);
    if (categoria !== 'todas') params.set('cat', categoria);
    if (local) params.set('cidade', local.cidade);
    router.push(`/busca${params.toString() ? `?${params}` : ''}`);
  }

  /* a ordem já chega pronta da API — o efeito acima reconsulta sempre que
     `local` muda, então não há reordenação para fazer aqui */
  const paginaValida = Math.min(pagina, Math.max(1, Math.ceil(total / porPagina)));
  const visiveis = itens;

  return (
    <>
      <AppHeader />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.inner}>
            <NearbyHeader onSearch={irParaBusca} onLocal={aoMudarLocal} />
          </div>
        </section>

        <section className={styles.filters} aria-label="Categorias">
          <div className={styles.inner}>
            <div className={styles.chips}>
              {categorias.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.chip} ${categoria === item.id ? styles.chipOn : ''}`}
                  aria-pressed={categoria === item.id}
                  onClick={() => aoTrocarCategoria(item.id)}
                >
                  <Icon name={item.icone} size={17} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.results}>
          <div className={styles.inner}>
            <header className={styles.resultsHead}>
              <h2 className={styles.resultsTitle}>
                {categoria === 'todas' ? 'Publicados recentemente' : 'Nesta categoria'}
              </h2>
              <span className={styles.count}>
                {carregando ? (
                  <Esqueleto altura={13} largura={92} />
                ) : (
                  `${total} ${total === 1 ? 'anúncio' : 'anúncios'}`
                )}
              </span>
            </header>

            {carregando ? (
              /* mesma grade, mesma quantidade de células: a página não muda de
                 altura quando os cards reais entram no lugar */
              <div className={styles.grid}>
                {Array.from({ length: Math.min(porPagina, 6) }, (_, indice) => (
                  <div key={indice} className={styles.cell}>
                    <EsqueletoCard />
                  </div>
                ))}
              </div>
            ) : itens.length === 0 ? (
              <p className={styles.empty}>
                Nenhum anúncio nesta categoria ainda. Que tal{' '}
                <Link href="/entrar" className={styles.helperLink}>
                  publicar o seu
                </Link>
                ?
              </p>
            ) : (
              <>
                <div className={styles.grid}>
                  {visiveis.map((anuncio, index) => (
                    <Reveal key={anuncio.id} delay={(index % 3) * 80} className={styles.cell}>
                      <AdCard ad={anuncio} />
                    </Reveal>
                  ))}
                </div>

                <Pagination
                  pagina={paginaValida}
                  total={total}
                  porPagina={porPagina}
                  onPagina={setPagina}
                  onPorPagina={(valor) => {
                    setPorPagina(valor);
                    setPagina(1);
                  }}
                />
              </>
            )}

            <div className={styles.more}>
              <Button variant="outline" size="lg" onClick={() => irParaBusca('')}>
                Buscar com filtros
              </Button>
            </div>
          </div>
        </section>

        <section className={styles.cta}>
          <div className={styles.ctaInner}>
            <div className={styles.ctaCopy}>
              <h2 className={styles.ctaTitle}>Tem peça parada no galpão?</h2>
              <p className={styles.ctaText}>
                Publicar é gratuito. Quem precisa fala com você direto no WhatsApp.
              </p>
            </div>

            <Button as={Link} href="/entrar" variant="onDark" size="lg" iconRight="arrow-right">
              Publicar anúncio
            </Button>
          </div>
        </section>
      </main>

      <AppFooter />
    </>
  );
}
