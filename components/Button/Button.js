import Icon from '@/components/Icon/Icon';
import styles from './Button.module.css';

export default function Button({
  as: Tag = 'button',
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  fullWidth = false,
  className = '',
  children,
  ...rest
}) {
  const classes = [
    styles.root,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const iconSize = size === 'sm' ? 16 : 18;

  return (
    <Tag className={classes} type={Tag === 'button' ? 'button' : undefined} {...rest}>
      {iconLeft ? <Icon name={iconLeft} size={iconSize} /> : null}
      <span className={styles.label}>{children}</span>
      {iconRight ? (
        <Icon name={iconRight} size={iconSize} className={styles.trailing} />
      ) : null}
    </Tag>
  );
}
