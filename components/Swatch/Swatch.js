import styles from './Swatch.module.css';

export default function Swatch({ name, token, hex, note }) {
  const key = token.replace('--color-', '');

  return (
    <figure className={styles.root}>
      <div className={`${styles.chip} ${styles[key]}`} />
      <figcaption className={styles.caption}>
        <span className={styles.name}>{name}</span>
        <code className={styles.token}>{token}</code>
        <span className={styles.hex}>{hex}</span>
        {note ? <span className={styles.note}>{note}</span> : null}
      </figcaption>
    </figure>
  );
}
