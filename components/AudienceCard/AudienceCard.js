import Icon from '@/components/Icon/Icon';
import Button from '@/components/Button/Button';
import styles from './AudienceCard.module.css';

export default function AudienceCard({
  icon,
  title,
  text,
  actionLabel = 'Acessar',
  onAction,
}) {
  return (
    <article className={styles.root}>
      <span className={styles.disc} aria-hidden="true">
        <Icon name={icon} size={34} />
      </span>

      <h3 className={styles.title}>{title}</h3>
      <p className={styles.text}>{text}</p>

      <Button variant="forest" size="sm" className={styles.action} onClick={onAction}>
        {actionLabel}
      </Button>
    </article>
  );
}
