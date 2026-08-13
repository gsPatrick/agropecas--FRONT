'use client';

/**
 * Dica — o balão que explica um controle sem rótulo visível.
 *
 * Existe porque o `title` do navegador demora quase um segundo para aparecer,
 * não é estilizável e some ao mover um pixel. Num painel cheio de botões só de
 * ícone, isso é a diferença entre descobrir o que o botão faz e adivinhar.
 *
 * É CSS puro, sem estado nem JavaScript: aparece no `:hover` e também no
 * `:focus-visible`, para quem navega por teclado ter a mesma explicação.
 *
 *   <Dica texto="Pausar anúncio"><button>…</button></Dica>
 */

import styles from './Dica.module.css';

export default function Dica({
  texto,
  posicao = 'cima',
  /* `alinhamento="fim"` para controles no fim da linha: centralizado, o balão
     sairia pela borda direita */
  alinhamento,
  children,
  className = '',
}) {
  return (
    <span
      className={`${styles.root} ${styles[posicao]} ${
        alinhamento === 'fim' ? styles.fim : ''
      } ${className}`}
      data-dica={texto}
    >
      {children}
    </span>
  );
}
