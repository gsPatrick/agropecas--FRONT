import Icon from '@/components/Icon/Icon';
import styles from './FeatureItem.module.css';

export default function FeatureItem({ icon, title, text }) {
  return (
    <article className={styles.root}>
      <Icon name={icon} size={34} className={styles.icon} />
      <div className={styles.body}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.text}>{text}</p>
      </div>
    </article>
  );
}
