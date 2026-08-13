'use client';

/**
 * Header — transparente sobre a hero, vira pílula fosca ao rolar
 *
 * Camadas:    header (fixo, transparente) · inner (é ele que ganha o vidro)
 * Driver:     binário por scrollY > 8
 * Estados:    claro-sobre-foto ↔ vidro fosco com tinta escura · menu mobile
 * Recipe:     recipes/nav-morph-frosted
 *
 * O threshold 8 é o MESMO da moldura da hero (Hero.js). Os dois disparam no
 * mesmo instante e leem como uma coreografia só. Se mudar um, mude o outro.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BrandMark from '@/components/BrandMark/BrandMark';
import Button from '@/components/Button/Button';
import styles from './Header.module.css';

const LINKS = [
  { label: 'Home', href: '#topo' },
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Para Lojas', href: '#para-lojas' },
  { label: 'Para Prestadores', href: '#para-prestadores' },
  { label: 'Blog', href: '#blog' },
];

/**
 * theme "over" — transparente sobre a foto da hero, tinta clara.
 * theme "light" — barra branca fixa para páginas de fundo claro.
 */
export default function Header({ theme = 'over', onLogin, onRegister }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const classes = [
    styles.header,
    styles[theme],
    scrolled ? styles.scrolled : '',
    open ? styles.menuOpen : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <header className={classes}>
      <div className={styles.inner}>
        <a className={styles.logo} href="#topo" aria-label="AgroPeças MT — início">
          <BrandMark size="sm" tone={theme === 'light' || open ? 'light' : 'dark'} />
        </a>

        <nav className={styles.nav} aria-label="Navegação principal">
          <ul className={styles.menu}>
            {LINKS.map((link) => (
              <li key={link.label}>
                <a className={styles.menuItem} href={link.href}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          <Button
            as={Link}
            href="/entrar"
            variant="outline"
            size="sm"
            className={styles.login}
            onClick={onLogin}
          >
            Entrar
          </Button>
          <Button as={Link} href="/entrar" variant="forest" size="sm" onClick={onRegister}>
            Cadastrar
          </Button>
        </div>

        <button
          type="button"
          className={`${styles.burger} ${open ? styles.burgerOpen : ''}`}
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div
        className={`${styles.popup} ${open ? styles.popupOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <ul className={styles.popupMenu}>
          {LINKS.map((link) => (
            <li key={link.label}>
              <a className={styles.popupItem} href={link.href} onClick={() => setOpen(false)}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className={styles.popupActions}>
          <Button as={Link} href="/entrar" variant="outline" fullWidth onClick={() => setOpen(false)}>
            Entrar
          </Button>
          <Button as={Link} href="/entrar" variant="forest" fullWidth onClick={() => setOpen(false)}>
            Cadastrar
          </Button>
        </div>
      </div>
    </header>
  );
}
