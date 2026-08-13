import { forwardRef } from 'react';
import Icon from '@/components/Icon/Icon';
import styles from './Input.module.css';

const Input = forwardRef(function Input(
  { as = 'input', iconLeft, invalid = false, className = '', children, ...rest },
  ref
) {
  const Tag = as;
  const controlClasses = [
    styles.control,
    styles[as],
    iconLeft ? styles.hasIcon : '',
    invalid ? styles.invalid : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`${styles.root} ${className}`}>
      {iconLeft ? <Icon name={iconLeft} size={18} className={styles.icon} /> : null}
      <Tag ref={ref} className={controlClasses} aria-invalid={invalid || undefined} {...rest}>
        {children}
      </Tag>
      {as === 'select' ? (
        <Icon name="chevron-right" size={16} className={styles.chevron} />
      ) : null}
    </div>
  );
});

export default Input;
