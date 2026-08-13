'use client';

/**
 * Carousel — trilho horizontal com setas, para listas que não cabem na tela.
 *
 * Rola por "página" (85% da largura visível) em vez de item a item: avançar de
 * um em um numa lista longa cansa, e avançar a largura cheia esconde a pista
 * do que já foi visto.
 *
 * As setas só aparecem quando há para onde ir — seta desabilitada permanente é
 * ruído. Em touch elas somem: o dedo já resolve.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '@/components/Icon/Icon';
import styles from './Carousel.module.css';

export default function Carousel({ children, label = 'Lista', className = '' }) {
  const trackRef = useRef(null);
  const [limites, setLimites] = useState({ inicio: true, fim: true });

  const medir = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const fim = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    setLimites({ inicio: el.scrollLeft <= 2, fim });
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;

    medir();
    el.addEventListener('scroll', medir, { passive: true });
    window.addEventListener('resize', medir);
    return () => {
      el.removeEventListener('scroll', medir);
      window.removeEventListener('resize', medir);
    };
  }, [medir]);

  function mover(direcao) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direcao * el.clientWidth * 0.85, behavior: 'smooth' });
  }

  const estatico = limites.inicio && limites.fim;

  return (
    <div className={`${styles.root} ${className}`}>
      {!estatico ? (
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.arrow}
            onClick={() => mover(-1)}
            disabled={limites.inicio}
            aria-label="Anterior"
          >
            <Icon name="chevron-right" size={18} className={styles.left} />
          </button>

          <button
            type="button"
            className={styles.arrow}
            onClick={() => mover(1)}
            disabled={limites.fim}
            aria-label="Próximo"
          >
            <Icon name="chevron-right" size={18} />
          </button>
        </div>
      ) : null}

      <div
        className={`${styles.track} ${limites.fim ? styles.atEnd : ''} ${
          limites.inicio ? styles.atStart : ''
        }`}
        ref={trackRef}
        role="group"
        aria-label={label}
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  );
}
