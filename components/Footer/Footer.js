'use client';

/**
 * Footer — estrutura do LandingFooter do BankerPro: bloco central com marca,
 * chamada grande e CTA inline; embaixo, navegação e ações.
 *
 * Cantos superiores arredondados: o rodapé "sobe" sobre a seção anterior em
 * vez de emendar reto com ela.
 */

import BrandMark from '@/components/BrandMark/BrandMark';
import Icon from '@/components/Icon/Icon';
import styles from './Footer.module.css';

const NAV = [
  { label: 'Início', href: '#topo' },
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Peças', href: '#pecas' },
  { label: 'Para Lojas', href: '#publicos' },
  { label: 'Para Prestadores', href: '#publicos' },
  { label: 'Termos de uso', href: '/termos' },
];

const CONTACT = [
  { id: 'fone', icon: 'phone', label: '(65) 99999-9999', href: 'tel:+5565999999999' },
  {
    id: 'mail',
    icon: 'mail',
    label: 'contato@agropecasmt.com.br',
    href: 'mailto:contato@agropecasmt.com.br',
  },
  { id: 'local', icon: 'pin', label: 'Tangará da Serra · MT' },
];

export default function Footer({ onLogin, onRegister }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.lead}>
          <BrandMark size="lg" tone="dark" className={styles.mark} />

          <h2 className={styles.heading}>O campo não pode parar. Nem a sua máquina.</h2>

          <p className={styles.text}>
            Peça, serviço ou orçamento: você registra, a gente encontra quem resolve.{' '}
            <button type="button" className={styles.link} onClick={onRegister}>
              <span>Criar conta gratuita</span>
              <span className={styles.arrow} aria-hidden="true">
                <Icon name="arrow-right" size={13} />
              </span>
            </button>
          </p>
        </div>

        <ul className={styles.contact}>
          {CONTACT.map((item) => (
            <li key={item.id}>
              {item.href ? (
                <a className={styles.contactItem} href={item.href}>
                  <Icon name={item.icon} size={17} />
                  {item.label}
                </a>
              ) : (
                <span className={styles.contactItem}>
                  <Icon name={item.icon} size={17} />
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ul>

        <div className={styles.bottom}>
          <nav className={styles.nav} aria-label="Rodapé">
            <ul className={styles.navList}>
              {NAV.map((item) => (
                <li key={item.label}>
                  <a className={styles.navLink} href={item.href}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.actions}>
            <button type="button" className={styles.loginBtn} onClick={onLogin}>
              Entrar
            </button>
            <button type="button" className={styles.signupBtn} onClick={onRegister}>
              Cadastrar
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
