import styles from './StatBlock.module.css';

export default function StatBlock({ value, label }) {
  return (
    <div className={styles.root}>
      <span className={styles.value}>{value}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
