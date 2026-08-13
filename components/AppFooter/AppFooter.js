import Link from 'next/link';
import BrandMark from '@/components/BrandMark/BrandMark';
import styles from './AppFooter.module.css';

/**
 * AppFooter — rodapé das telas de sistema.
 *
 * Uma linha: marca, links institucionais e a assinatura. O rodapé grande da
 * landing existe para converter quem chegou de fora; aqui dentro ele só ocupa
 * espaço e afasta o usuário do que ele veio fazer.
 */

const LINKS = [
  { label: 'Anúncios', href: '/anuncios' },
  { label: 'Como funciona', href: '/#como-funciona' },
  { label: 'Termos de uso', href: '/termos' },
  { label: 'Contato', href: 'mailto:contato@agropecasmt.com.br' },
];

export default function AppFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label="AgroPeças MT — início">
          <BrandMark size="sm" />
        </Link>

        <nav className={styles.nav} aria-label="Rodapé">
          {LINKS.map((link) => (
            <Link key={link.label} href={link.href} className={styles.link}>
              {link.label}
            </Link>
          ))}
        </nav>

        <p className={styles.legal}>© 2026 AgroPeças MT</p>
      </div>
    </footer>
  );
}
