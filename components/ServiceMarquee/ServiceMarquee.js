'use client';

/**
 * ServiceMarquee — duas faixas de chips correndo em sentidos opostos.
 *
 * Recipe: recipes/marquee-seamless. A lista é renderizada em cópias idênticas e
 * a faixa anda até translateX(-50%) — é a única combinação em que a costura é
 * invisível. Easing é `linear` sempre: qualquer curva denuncia o loop.
 *
 * Passar o mouse pausa as duas faixas (animation-play-state), para a pessoa
 * ler e clicar sem perseguir o alvo. Foco no teclado pausa também.
 *
 * As cópias extras são decorativas: `aria-hidden` e fora da ordem de foco,
 * senão o leitor de tela anuncia cada serviço quatro vezes.
 */

import { useMemo } from 'react';
import Icon from '@/components/Icon/Icon';
import styles from './ServiceMarquee.module.css';

/* metade das cópias de cada lado do -50%: precisa ser par e larga o bastante
   para a faixa cobrir o container mesmo com poucos itens */
function buildTrack(items) {
  const copies = Math.max(2, Math.ceil(10 / Math.max(items.length, 1)) * 2);
  return Array.from({ length: copies }, () => items).flat();
}

export default function ServiceMarquee({ items, selected = [], onToggle }) {
  const rows = useMemo(
    () => [items.filter((_, i) => i % 2 === 0), items.filter((_, i) => i % 2 === 1)],
    [items]
  );

  return (
    <div className={styles.root}>
      {rows.map((row, rowIndex) => (
        <div className={styles.viewport} key={rowIndex}>
          <div className={`${styles.track} ${rowIndex === 1 ? styles.reverse : ''}`}>
            {buildTrack(row).map((name, index) => {
              const original = index < row.length;
              const on = selected.includes(name);

              return (
                <button
                  key={`${name}-${index}`}
                  type="button"
                  className={`${styles.chip} ${on ? styles.chipOn : ''}`}
                  aria-pressed={original ? on : undefined}
                  aria-hidden={original ? undefined : true}
                  tabIndex={original ? 0 : -1}
                  onClick={() => onToggle(name)}
                >
                  {name}
                  <span className={styles.mark} aria-hidden="true">
                    <Icon name="check" size={12} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
