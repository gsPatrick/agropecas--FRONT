'use client';

/**
 * Pagination — navegação de páginas + quantidade por página.
 *
 * Mostra no máximo 5 números com reticências: lista longa com 30 botões vira
 * uma barra de ruído, e ninguém clica na página 17.
 *
 * O texto "21–40 de 87" fica à esquerda porque é a informação que responde
 * "onde eu estou" — os botões respondem "para onde vou".
 */

import Icon from '@/components/Icon/Icon';
import styles from './Pagination.module.css';

/* padrão da busca. O painel passa a própria lista — as telas têm densidades
   diferentes e travar um número aqui obrigaria a duplicar o componente */
const OPCOES_PADRAO = [10, 20, 30, 35];

function paginasVisiveis(atual, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const paginas = new Set([1, total, atual, atual - 1, atual + 1]);
  const lista = [...paginas].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const comLacunas = [];
  lista.forEach((pagina, indice) => {
    if (indice > 0 && pagina - lista[indice - 1] > 1) comLacunas.push('…');
    comLacunas.push(pagina);
  });

  return comLacunas;
}

export default function Pagination({
  pagina,
  total,
  porPagina,
  onPagina,
  onPorPagina,
  opcoes = OPCOES_PADRAO,
  /* `solta` fecha uma lista e traz o próprio respiro e a linha de cima.
     `embutida` vive dentro de uma barra que já tem borda e recuo — repetir os
     dois ali criaria borda dupla e um degrau de espaço */
  variante = 'solta',
}) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const inicio = total === 0 ? 0 : (pagina - 1) * porPagina + 1;
  const fim = Math.min(pagina * porPagina, total);

  if (total === 0) return null;

  return (
    <nav
      className={`${styles.root} ${variante === 'embutida' ? styles.embutida : ''}`}
      aria-label="Paginação"
    >
      <p className={styles.resumo}>
        <strong>
          {inicio}–{fim}
        </strong>{' '}
        de {total}
      </p>

      {/* os controles aparecem sempre: sumir quando cabe numa página faz o
          usuário achar que a paginação quebrou ao trocar o filtro */}
      <div className={styles.paginas}>
          <button
            type="button"
            className={styles.seta}
            onClick={() => onPagina(pagina - 1)}
            disabled={pagina === 1}
            aria-label="Página anterior"
          >
            <Icon name="chevron-right" size={16} className={styles.esquerda} />
          </button>

          {paginasVisiveis(pagina, paginas).map((item, indice) =>
            item === '…' ? (
              // eslint-disable-next-line react/no-array-index-key
              <span key={`lacuna-${indice}`} className={styles.lacuna}>
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className={`${styles.numero} ${item === pagina ? styles.atual : ''}`}
                onClick={() => onPagina(item)}
                aria-current={item === pagina ? 'page' : undefined}
              >
                {item}
              </button>
            )
          )}

          <button
            type="button"
            className={styles.seta}
            onClick={() => onPagina(pagina + 1)}
            disabled={pagina === paginas}
            aria-label="Próxima página"
          >
            <Icon name="chevron-right" size={16} />
          </button>
      </div>

      <label className={styles.porPagina}>
        <span>Por página</span>
        <select value={porPagina} onChange={(event) => onPorPagina(Number(event.target.value))}>
          {opcoes.map((opcao) => (
            <option key={opcao} value={opcao}>
              {opcao}
            </option>
          ))}
        </select>
      </label>
    </nav>
  );
}
