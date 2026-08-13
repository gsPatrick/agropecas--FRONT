'use client';

/**
 * AuthLayout — o palco das telas de acesso.
 *
 * Camadas:    media (foto + véu + marca) · panel (conteúdo)
 * Ancoragem:  duas colunas em grid; a largura da primeira é --split
 * Driver:     mudança de passo — o grid interpola entre 70/30, 60/40 e 50/50
 * Estados:    gate (70/30) · login/cadastro (50/50) · senha/otp (60/40)
 * Mobile:     a foto vira uma faixa curta no topo e o painel ocupa o resto
 *
 * A transição é do `grid-template-columns`: uma propriedade só move as duas
 * colunas em oposição, então elas nunca dessincronizam. Animar duas larguras
 * separadas é o que faz aparecer aquela fresta no meio durante o movimento.
 */

import Link from 'next/link';
import BrandMark from '@/components/BrandMark/BrandMark';
import Icon from '@/components/Icon/Icon';
import styles from './AuthLayout.module.css';

export default function AuthLayout({
  split = '50%',
  intro = false,
  hideBack = false,
  overlay = null,
  onBack,
  backLabel = 'Voltar',
  children,
}) {
  /* na conclusão a foto recolhe até sumir e o branco toma a tela: a mensagem
     final vive sobre o fundo claro, não sobre a imagem */
  return (
    <div
      className={`${styles.root} ${overlay ? styles.full : ''}`}
      style={{ '--split': overlay ? '0%' : split }}
    >
      <aside className={styles.media}>
        {/* a moldura abre de um ponto central; só o gate recebe a intro */}
        <div
          className={`${styles.canvas} ${intro ? styles.intro : ''}`}
          key={intro ? 'intro' : 'plain'}
          aria-hidden="true"
        >
          <div className={styles.photo} />
          <div className={styles.scrim} />
        </div>

        <div className={styles.mediaContent}>
          <Link href="/" className={styles.brand} aria-label="AgroPeças MT — início">
            <BrandMark size="md" tone="dark" />
          </Link>

          <p className={styles.claim}>
            Encontre peças agrícolas, lojas e prestadores próximos de você em poucos minutos.
          </p>
        </div>

      </aside>

      <section className={styles.panel}>
        <div className={styles.panelBar}>
          {hideBack ? null : onBack ? (
            <button type="button" className={styles.back} onClick={onBack}>
              <Icon name="chevron-right" size={16} className={styles.backIcon} />
              {backLabel}
            </button>
          ) : (
            <Link href="/" className={styles.back}>
              <Icon name="chevron-right" size={16} className={styles.backIcon} />
              Voltar ao site
            </Link>
          )}
        </div>

        <div className={styles.panelInner}>{overlay || children}</div>
      </section>
    </div>
  );
}
