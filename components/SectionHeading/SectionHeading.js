import styles from './SectionHeading.module.css';

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  tone = 'light',
  as: Tag = 'h2',
  className = '',
}) {
  return (
    <header className={`${styles.root} ${styles[align]} ${styles[tone]} ${className}`}>
      {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
      <Tag className={styles.title}>{title}</Tag>
      <span className={styles.rule} aria-hidden="true" />
      {description ? <p className={styles.description}>{description}</p> : null}
    </header>
  );
}
