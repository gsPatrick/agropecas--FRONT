import Icon from '@/components/Icon/Icon';
import styles from './Stepper.module.css';

/**
 * Stepper — trilha de progresso do cadastro.
 * Passo concluído vira "check", o atual fica sólido, os futuros ficam vazios.
 */
export default function Stepper({ steps, current }) {
  return (
    <nav className={styles.root} aria-label="Progresso do cadastro">
      <ol className={styles.list}>
        {steps.map((step, index) => {
          const state = index < current ? 'done' : index === current ? 'now' : 'next';

          return (
            <li className={`${styles.item} ${styles[state]}`} key={step}>
              <span className={styles.marker} aria-hidden="true">
                {state === 'done' ? <Icon name="check" size={13} /> : index + 1}
              </span>
              <span className={styles.label}>{step}</span>
            </li>
          );
        })}
      </ol>

      <p className={styles.counter}>
        Passo {current + 1} de {steps.length}
      </p>
    </nav>
  );
}
