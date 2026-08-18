import Link from 'next/link';
import Icon from '@/components/Icon/Icon';
import Button from '@/components/Button/Button';
import styles from './AudienceCard.module.css';

export default function AudienceCard({
  icon,
  title,
  text,
  actionLabel = 'Acessar',
  href = '/entrar',
}) {
  return (
    <article className={styles.root}>
      <span className={styles.disc} aria-hidden="true">
        <Icon name={icon} size={34} />
      </span>

      <h3 className={styles.title}>{title}</h3>
      <p className={styles.text}>{text}</p>

      <Button as={Link} href={href} variant="forest" size="sm" className={styles.action}>
        {actionLabel}
      </Button>
    </article>
  );
}
