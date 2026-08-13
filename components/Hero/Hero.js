'use client';

/**
 * Hero — banner emoldurado que estoura para full-bleed no primeiro scroll.
 *
 * Camadas:    imageBg (sticky) · frame · canvas + scrim · overlay (conteúdo)
 * Ancoragem:  imageBg sticky top:0 height:100vh · overlay margin-top:-100vh
 * Driver:     binário por scrollY > 8 (mesmo threshold do Header)
 * Estados:    intro clip-path no load · moldura recolhida/estourada
 * Mobile:     tipografia em clamp, busca vira coluna
 *
 * A moldura nasce quase cheia (--frame-inset pequeno): o estouro é um
 * movimento curto, um assentamento, não uma abertura dramática.
 */

import { useEffect, useState } from 'react';
import SearchBar from '@/components/SearchBar/SearchBar';
import styles from './Hero.module.css';

export default function Hero({ onSearch, onSearchByMachine }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const onScroll = () => setExpanded(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <section className={styles.experience} id="topo">
      <div className={styles.imageBg}>
        <div className={`${styles.frame} ${expanded ? styles.expanded : ''}`}>
          <div className={styles.canvas}>
            <div className={styles.photo} aria-hidden="true" />
            <div className={styles.scrim} aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className={styles.overlay}>
        <div className={styles.heroInner}>
          <div className={styles.content}>
            <div className={styles.copy}>
              <h1 className={styles.brand}>
                <span className={styles.word}>AGROPEÇAS</span>
                <span className={styles.state}>
                  <span className={styles.rule} aria-hidden="true" />
                  MT
                  <span className={styles.rule} aria-hidden="true" />
                </span>
              </h1>

              <p className={styles.tagline}>
                O CAMPO <em className={styles.accent}>NÃO</em> PODE PARAR.
              </p>

              <p className={styles.lead}>
                Encontre peças agrícolas, lojas e prestadores próximos de você
                em poucos minutos.
              </p>
            </div>

            <div className={styles.search}>
              <svg
                className={styles.hintArrow}
                viewBox="0 0 96 62"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M5 6c6 26 26 42 58 44"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
                <path
                  d="m52 41 12 9-14 6"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <SearchBar onSearch={onSearch} className={styles.searchBar} />
            </div>

            <p className={styles.helper}>
              Não sabe o nome da peça?{' '}
              <button type="button" className={styles.helperLink} onClick={onSearchByMachine}>
                Busque por máquina
              </button>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
