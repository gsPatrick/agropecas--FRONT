'use client';

/**
 * AuthSuccess — a ponte entre o formulário e o painel.
 *
 * O check é desenhado (stroke-dashoffset), não aparece pronto: o traço sendo
 * riscado é o que dá a sensação de "confirmado agora". Depois dele, uma régua
 * conta o tempo real até a navegação — barra de progresso que não corresponde
 * a nada é decoração e o usuário percebe.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './AuthSuccess.module.css';

/* 1.5s do palco recolhendo + 1.3s do selo e do check + 1.8s da régua */
const DELAY = 4600;

export default function AuthSuccess({
  title = 'Tudo certo',
  text = 'Estamos abrindo o seu painel.',
  tone = 'light',
  to = '/painel',
}) {
  const router = useRouter();

  useEffect(() => {
    const id = setTimeout(() => router.push(to), DELAY);
    return () => clearTimeout(id);
  }, [router, to]);

  return (
    <div className={`${styles.root} ${styles[tone]}`}>
      <span className={styles.badge} aria-hidden="true">
        <span className={styles.pulse} />
        <svg viewBox="0 0 52 52" className={styles.check} fill="none">
          <circle cx="26" cy="26" r="24" className={styles.circle} />
          <path d="M15 27l8 8 15-16" className={styles.mark} />
        </svg>
      </span>

      <div className={styles.copy} role="status">
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.text}>{text}</p>
      </div>

      <div className={styles.progress} aria-hidden="true">
        <span className={styles.bar} />
      </div>
    </div>
  );
}
