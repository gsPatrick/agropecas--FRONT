'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './WordReveal.module.css';

export default function WordReveal({
  text,
  className = '',
  as: Tag = 'span',
  delay = 0,
  animateOnMount = false,
  stagger = 60,
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const words = text.split(' ');

  useEffect(() => {
    if (animateOnMount) {
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }

    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.25, rootMargin: '0px 0px -10% 0px' }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [animateOnMount]);

  return (
    <Tag ref={ref} className={`${styles.reveal} ${className}`}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className={`${styles.word} ${visible ? styles.visible : ''}`}
          style={{ '--word-delay': visible ? `${delay + i * stagger}ms` : '0ms' }}
        >
          {word}
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  );
}
