import styles from './Field.module.css';

export default function Field({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  className = '',
  children,
}) {
  return (
    <div className={`${styles.root} ${className}`}>
      {label ? (
        <label className={styles.label} htmlFor={htmlFor}>
          {label}
          {required ? (
            <span className={styles.required} aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <span className={styles.error} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className={styles.hint}>{hint}</span>
      ) : null}
    </div>
  );
}
