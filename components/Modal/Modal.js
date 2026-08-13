'use client';

/**
 * Modal — diálogo genérico do sistema.
 *
 * Fecha por Esc, por clique no fundo e pelo botão. Trava a rolagem da página
 * enquanto aberto e devolve o foco ao elemento que o abriu — sem isso, quem
 * navega por teclado volta para o topo do documento ao fechar.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '@/components/Icon/Icon';
import styles from './Modal.module.css';

export default function Modal({
  open,
  title,
  description,
  align = 'center',
  onClose,
  children,
  footer,
}) {
  const panelRef = useRef(null);
  const openerRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  /* portal no body: dentro do formulário o diálogo herdaria o empilhamento e o
     recorte do painel rolável, e acabaria por baixo do conteúdo */
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return undefined;

    openerRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const id = requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector('[data-autofocus]') || panelRef.current;
      target?.focus();
    });

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      cancelAnimationFrame(id);
      openerRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className={`${styles.overlay} ${styles[align]}`} onMouseDown={onClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={panelRef}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.head}>
          <div className={styles.headText}>
            <h2 className={styles.title}>{title}</h2>
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>

          <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className={styles.body}>{children}</div>

        {footer ? <footer className={styles.footer}>{footer}</footer> : null}
      </div>
    </div>,
    document.body
  );
}
