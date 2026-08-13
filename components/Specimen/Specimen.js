import styles from './Specimen.module.css';

export default function Specimen({ id, index, title, description, className = '', children }) {
  return (
    <section className={`${styles.root} ${className}`} id={id}>
      <header className={styles.head}>
        <span className={styles.index}>{index}</span>
        <div className={styles.headText}>
          <h2 className={styles.title}>{title}</h2>
          {description ? <p className={styles.description}>{description}</p> : null}
        </div>
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
