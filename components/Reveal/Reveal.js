'use client';

/**
 * Reveal — entra uma vez ao aparecer na viewport.
 *
 * Driver: interseção (não offset de scroll) — se o usuário parar de rolar no
 * meio, a animação termina sozinha em vez de congelar.
 *
 * threshold 0.2 + rootMargin -10% no rodapé: sem os dois, o reveal dispara
 * na beirada de baixo da tela, fora do foco de leitura.
 */

import { useEffect, useRef, useState } from 'react';
import styles from './Reveal.module.css';

export default function Reveal({
  as: Tag = 'div',
  delay = 0,
  className = '',
  children,
  ...rest
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -10% 0px' }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`${styles.root} ${visible ? styles.visible : ''} ${className}`}
      style={{ '--reveal-delay': `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
