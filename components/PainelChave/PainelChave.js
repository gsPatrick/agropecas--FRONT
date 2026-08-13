'use client';

/**
 * Chave de liga/desliga do painel.
 *
 * `role="switch"` e não checkbox: para o leitor de tela, a diferença é entre
 * "marcado/desmarcado" (uma escolha a confirmar) e "ligado/desligado" (efeito
 * imediato) — e aqui o efeito é imediato, não há botão de confirmar.
 *
 * Vira componente por aparecer em atendimento, notificações e privacidade.
 * Copiada em cada tela, a animação divergiria na primeira correção.
 */

import styles from './PainelChave.module.css';

export default function PainelChave({ ligada, onMudar, rotulo, desabilitada = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligada}
      aria-label={rotulo}
      disabled={desabilitada}
      className={`${styles.root} ${ligada ? styles.ativa : ''}`}
      onClick={() => onMudar(!ligada)}
    >
      <span className={styles.bolinha} />
    </button>
  );
}
