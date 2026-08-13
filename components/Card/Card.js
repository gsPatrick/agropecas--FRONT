import styles from './Card.module.css';

export default function Card({
  as: Tag = 'div',
  interactive = false,
  padding = 'md',
  className = '',
  children,
  ...rest
}) {
  const classes = [
    styles.root,
    styles[padding],
    interactive ? styles.interactive : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}
