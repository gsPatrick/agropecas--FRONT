'use client';

/**
 * Filtro em segmentos — o controle de abas curtas do painel.
 *
 * Usado para período das métricas e status dos anúncios. Segmentos e não
 * `<select>` porque as opções são poucas e a escolha é comparativa: a pessoa
 * quer ver "7 dias" e "30 dias" lado a lado antes de decidir, e um menu fechado
 * esconde as alternativas justamente na hora de comparar.
 *
 * Cada opção pode trazer uma contagem — é o que transforma "Rascunhos" em
 * "Rascunhos 2" e evita clicar num filtro que devolveria lista vazia.
 */

import styles from './PainelSegmentos.module.css';

export default function PainelSegmentos({ opcoes, valor, onMudar, contagens, rotulo }) {
  return (
    <div className={styles.root} role="tablist" aria-label={rotulo}>
      {opcoes.map((opcao) => {
        const ativo = opcao.id === valor;
        const contagem = contagens?.[opcao.id];

        return (
          <button
            key={opcao.id}
            type="button"
            role="tab"
            aria-selected={ativo}
            className={`${styles.segmento} ${ativo ? styles.ativo : ''}`}
            onClick={() => onMudar(opcao.id)}
          >
            {opcao.rotulo}
            {contagem !== undefined ? <span className={styles.contagem}>{contagem}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
