'use client';

/**
 * Etiqueta de situação do admin.
 *
 * Um componente só para que "Suspenso" tenha exatamente a mesma cor em
 * usuários, denúncias e auditoria. Situação pintada de amarelo numa tela e de
 * cinza em outra faz a pessoa reaprender o código de cores a cada seção — e
 * hesitar antes de uma ação irreversível.
 */

import styles from './AdminEtiqueta.module.css';

export default function AdminEtiqueta({ tom = 'neutro', children, ponto = false }) {
  return (
    <span className={`${styles.root} ${styles[tom]}`}>
      {ponto ? <span className={styles.ponto} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
