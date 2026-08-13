import Icon from '@/components/Icon/Icon';
import styles from './PartTile.module.css';

export default function PartTile({ icon, label, as: Tag = 'button', ...rest }) {
  return (
    <Tag className={styles.root} type={Tag === 'button' ? 'button' : undefined} {...rest}>
      <Icon name={icon} size={34} className={styles.icon} />
      <span className={styles.label}>{label}</span>
    </Tag>
  );
}
