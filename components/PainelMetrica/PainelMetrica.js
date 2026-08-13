'use client';

/**
 * Número do painel.
 *
 * Um número sozinho não diz nada — "12 visualizações" é bom ou ruim? Por isso
 * vem sempre com a comparação com o período anterior: é ela que transforma o
 * dado em informação.
 *
 * **Disposição:** ícone e variação em cima, número no meio, rótulo embaixo.
 *
 * Antes o ícone ficava ao LADO do texto e comia ~48px de uma caixa que, em duas
 * colunas de celular, tem menos de 200px. Sobrava tão pouco que «VISUALIZAÇÕES»
 * — uma palavra só, que não quebra — vazava para fora do cartão. Com o ícone
 * em cima, o rótulo recebe a largura inteira.
 *
 * O período da comparação («vs. semana passada») saiu do corpo e virou dica: o
 * filtro logo acima já diz qual período está selecionado, e repetir isso em
 * cada um dos quatro cartões custava três linhas de altura por cartão.
 */

import Icon from '@/components/Icon/Icon';
import Dica from '@/components/Dica/Dica';
import styles from './PainelMetrica.module.css';

export default function PainelMetrica({
  rotulo,
  valor,
  variacao,
  icone,
  sufixo,
  comparacao = 'semana passada',
}) {
  const subiu = variacao > 0;
  const caiu = variacao < 0;
  const temVariacao = variacao !== undefined && variacao !== null;

  return (
    <article className={styles.root}>
      <header className={styles.topo}>
        <span className={styles.icone}>
          <Icon name={icone} size={17} />
        </span>

        {temVariacao ? (
          <Dica texto={`Comparado com ${comparacao}`} alinhamento="fim">
            <span
              className={`${styles.variacao} ${subiu ? styles.subiu : ''} ${
                caiu ? styles.caiu : ''
              }`}
            >
              {/* seta em vez de sinal: lida antes do número e não some quando o
                  cartão fica estreito. O sentido vem do giro no CSS, não de um
                  ícone diferente */}
              <Icon name="arrow-right" size={12} className={styles.seta} />
              {Math.abs(variacao)}%
            </span>
          </Dica>
        ) : null}
      </header>

      <strong className={styles.valor}>
        {valor}
        {sufixo ? <span className={styles.sufixo}>{sufixo}</span> : null}
      </strong>

      <span className={styles.rotulo}>{rotulo}</span>
    </article>
  );
}
