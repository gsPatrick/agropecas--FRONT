'use client';

/**
 * PopularParts — atalhos para as peças mais buscadas.
 *
 * Desktop: grade de 6 colunas.
 * Mobile:  fileira única que rola na horizontal, com uma régua de progresso —
 *          a largura do cursor é a proporção visível do trilho e a posição
 *          acompanha o scroll. É o aviso de que há mais conteúdo ao lado.
 *
 * Driver: offset de scroll do próprio trilho (não interseção).
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Reveal from '@/components/Reveal/Reveal';
import SectionHeading from '@/components/SectionHeading/SectionHeading';
import PartTile from '@/components/PartTile/PartTile';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { buscarCategoriasEmDestaque } from '@/lib/dados/home';
import styles from './PopularParts.module.css';

/* Fallback: se o catálogo não responder, a seção continua sendo um atalho
   útil em vez de um buraco. São as mesmas categorias que existem na API. */
const PARTS = [
  { id: 'correia', icon: 'belt', label: 'Correia' },
  { id: 'rolamento', icon: 'bearing', label: 'Rolamento' },
  { id: 'filtro', icon: 'filter', label: 'Filtro' },
  { id: 'bomba', icon: 'pump', label: 'Bomba Hidráulica' },
  { id: 'cruzeta', icon: 'cross', label: 'Cruzeta' },
  { id: 'todas', icon: 'grid', label: 'Ver todas' },
];

const VER_TODAS = PARTS[PARTS.length - 1];

export default function PopularParts() {
  const router = useRouter();
  const trackRef = useRef(null);
  const [thumb, setThumb] = useState({ size: 1, offset: 0 });
  const [parts, setParts] = useState(null);

  useEffect(() => {
    const controle = new AbortController();

    buscarCategoriasEmDestaque({ quantidade: PARTS.length - 1, sinal: controle.signal })
      .then((categorias) =>
        setParts(categorias.length ? [...categorias, VER_TODAS] : PARTS)
      )
      .catch((erro) => {
        /* catálogo fora do ar não pode custar a navegação da home: cai no
           conjunto fixo, que leva para as mesmas buscas */
        if (erro.name !== 'AbortError') setParts(PARTS);
      });

    return () => controle.abort();
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const onScroll = () => {
      const scrollable = el.scrollWidth - el.clientWidth;
      setThumb({
        size: el.scrollWidth > 0 ? el.clientWidth / el.scrollWidth : 1,
        offset: scrollable > 0 ? el.scrollLeft / scrollable : 0,
      });
    };

    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
    /* recalcula quando a lista real chega: o trilho muda de largura e a régua
       ficaria mostrando a proporção do esqueleto */
  }, [parts]);

  return (
    <section className={styles.root} id="pecas">
      <div className={styles.inner}>
        <Reveal>
          <SectionHeading title="Peças mais procuradas hoje" as="h2" className={styles.heading} />
        </Reveal>

        <div className={styles.grid} ref={trackRef}>
          {!parts
            ? PARTS.map((part) => (
                <div className={styles.cell} key={`esqueleto-${part.id}`}>
                  <Esqueleto altura={124} raio="var(--radius-lg)" />
                </div>
              ))
            : null}

          {(parts || []).map((part, i) => (
            <Reveal key={part.id} delay={80 + i * 60} className={styles.cell}>
              <PartTile
                icon={part.icon}
                label={part.label}
                onClick={() =>
                  router.push(part.id === 'todas' ? '/busca' : `/busca?cat=${part.id}`)
                }
              />
            </Reveal>
          ))}
        </div>

        <div className={styles.scrollbar} aria-hidden="true">
          <span
            className={styles.thumb}
            style={{
              '--thumb-size': `${Math.min(thumb.size, 1) * 100}%`,
              '--thumb-offset': thumb.offset,
            }}
          />
        </div>
      </div>
    </section>
  );
}
