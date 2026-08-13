'use client';

/**
 * Gráfico de colunas do painel.
 *
 * CSS puro, sem biblioteca: são barras proporcionais a um máximo, e trazer
 * um pacote de gráficos para isso custaria mais que o problema resolve.
 *
 * A altura vai por custom property (`--altura`), como em RangeSlider e Reveal:
 * é o único jeito de um valor calculado alcançar o CSS Module sem escrever
 * estilo dentro do JSX.
 *
 * Cada coluna carrega o valor em `data-dica` — passar o mouse mostra o número
 * exato, o que dispensa rótulo em toda barra e mantém o eixo legível.
 */

import styles from './PainelGrafico.module.css';

export default function PainelGrafico({ pontos, sufixo = '', rotuloEixo }) {
  const maximo = Math.max(...pontos.map((ponto) => ponto.valor), 1);

  /* mais de 14 colunas com rótulo viram uma mancha de texto; a partir daí só
     o primeiro, o meio e o último se identificam */
  const denso = pontos.length > 14;
  const marcados = [0, Math.floor(pontos.length / 2), pontos.length - 1];

  return (
    <div className={styles.root}>
      <div className={styles.colunas} role="img" aria-label={rotuloEixo}>
        {pontos.map((ponto, indice) => (
          <div key={indice} className={styles.coluna}>
            <div
              className={styles.barra}
              style={{ '--altura': `${Math.max(3, (ponto.valor / maximo) * 100)}%` }}
              data-dica={`${ponto.rotulo}: ${ponto.valor}${sufixo}`}
            />

            <span
              className={`${styles.rotulo} ${
                denso && !marcados.includes(indice) ? styles.rotuloOculto : ''
              }`}
            >
              {ponto.rotulo}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
