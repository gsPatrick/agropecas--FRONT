import styles from './BrandMark.module.css';

const TEETH = Array.from({ length: 12 }, (_, i) => i * 30);

function Symbol() {
  return (
    <svg className={styles.symbol} viewBox="0 0 128 128" fill="none" aria-hidden="true" focusable="false">
      <g className={styles.gear}>
        {TEETH.map((angle) => (
          <rect
            key={angle}
            x="60"
            y="4"
            width="8"
            height="16"
            rx="2.5"
            fill="currentColor"
            transform={`rotate(${angle} 64 64)`}
          />
        ))}
        <circle cx="64" cy="64" r="46" stroke="currentColor" strokeWidth="13" />
      </g>
      <g className={styles.sprout}>
        <path
          className={styles.stem}
          d="M64 92V64"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          className={styles.leafLeft}
          d="M64 68c-14 0-22-6-24-18 13-3 22 3 24 18z"
          fill="currentColor"
        />
        <path
          className={styles.leafRight}
          d="M64 62c2-15 11-21 24-18-2 12-10 18-24 18z"
          fill="currentColor"
        />
        <circle className={styles.seed} cx="64" cy="86" r="10" fill="currentColor" />
      </g>
    </svg>
  );
}

export default function BrandMark({
  size = 'md',
  tone = 'light',
  showTagline = false,
  as: Tag = 'div',
  className = '',
  ...rest
}) {
  return (
    <Tag
      className={`${styles.root} ${styles[size]} ${styles[tone]} ${className}`}
      aria-label="AgroPeças MT"
      {...rest}
    >
      <Symbol />
      <span className={styles.words}>
        <span className={styles.word}>AGROPEÇAS</span>
        <span className={styles.state}>
          <span className={styles.rule} aria-hidden="true" />
          MT
          <span className={styles.rule} aria-hidden="true" />
        </span>
        {showTagline ? (
          <span className={styles.tagline}>
            O CAMPO <em className={styles.accent}>NÃO</em> PODE PARAR.
          </span>
        ) : null}
      </span>
    </Tag>
  );
}
