import Icon from '@/components/Icon/Icon';
import styles from './Badge.module.css';

export default function Badge({ tone = 'neutral', icon, dot = false, children, className = '' }) {
  return (
    <span className={`${styles.root} ${styles[tone]} ${className}`}>
      {dot ? <span className={styles.dot} aria-hidden="true" /> : null}
      {icon ? <Icon name={icon} size={14} /> : null}
      {children}
    </span>
  );
}
