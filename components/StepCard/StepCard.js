import Icon from '@/components/Icon/Icon';
import styles from './StepCard.module.css';

export default function StepCard({ step, icon, title, text, tone = 'green' }) {
  return (
    <article className={styles.root}>
      <div className={`${styles.disc} ${styles[tone]}`}>
        <Icon name={icon} size={44} />
        <span className={styles.step}>{step}</span>
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.text}>{text}</p>
    </article>
  );
}
