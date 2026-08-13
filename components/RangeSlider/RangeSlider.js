'use client';

/**
 * RangeSlider — faixa de valor com dois punhos.
 *
 * São dois <input type="range"> sobrepostos: o nativo dá teclado, leitor de
 * tela e toque de graça. A pista colorida é um div atrás deles, posicionado
 * por porcentagem.
 *
 * Os punhos nunca se cruzam — quem passa do outro empurra o valor, senão o
 * usuário "inverte" a faixa sem perceber e a busca não devolve nada.
 */

import { useEffect, useState } from 'react';
import styles from './RangeSlider.module.css';

function formatar(valor) {
  return valor.toLocaleString('pt-BR');
}

export default function RangeSlider({
  min = 0,
  max = 5000,
  passo = 50,
  valor,
  onChange,
  onCommit,
}) {
  const [interno, setInterno] = useState(valor);

  useEffect(() => setInterno(valor), [valor[0], valor[1]]);

  const [inicio, fim] = interno;
  const pctInicio = ((inicio - min) / (max - min)) * 100;
  const pctFim = ((fim - min) / (max - min)) * 100;

  function mudar(indice, bruto) {
    const numero = Number(bruto);
    const proximo =
      indice === 0
        ? [Math.min(numero, fim - passo), fim]
        : [inicio, Math.max(numero, inicio + passo)];

    setInterno(proximo);
    onChange?.(proximo);
  }

  return (
    <div className={styles.root}>
      <div className={styles.valores}>
        <span>R$ {formatar(inicio)}</span>
        <span>
          R$ {formatar(fim)}
          {fim >= max ? '+' : ''}
        </span>
      </div>

      <div
        className={styles.pista}
        style={{ '--inicio': `${pctInicio}%`, '--fim': `${pctFim}%` }}
      >
        <span className={styles.preenchido} />

        <input
          type="range"
          min={min}
          max={max}
          step={passo}
          value={inicio}
          onChange={(evento) => mudar(0, evento.target.value)}
          onPointerUp={() => onCommit?.(interno)}
          onKeyUp={() => onCommit?.(interno)}
          className={styles.entrada}
          aria-label="Valor mínimo"
        />

        <input
          type="range"
          min={min}
          max={max}
          step={passo}
          value={fim}
          onChange={(evento) => mudar(1, evento.target.value)}
          onPointerUp={() => onCommit?.(interno)}
          onKeyUp={() => onCommit?.(interno)}
          className={styles.entrada}
          aria-label="Valor máximo"
        />
      </div>
    </div>
  );
}
