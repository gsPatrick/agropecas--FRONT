import Icon from '@/components/Icon/Icon';
import styles from './AuthGate.module.css';

const OPTIONS = [
  {
    id: 'login',
    icon: 'check',
    title: 'Já tenho conta',
    text: 'Entrar com e-mail e senha.',
  },
  {
    id: 'cadastro',
    icon: 'tractor',
    title: 'Criar minha conta',
    text: 'Produtor, loja ou prestador de serviços.',
  },
];

export default function AuthGate({ onChoose }) {
  return (
    <div className={styles.root}>
      <header className={styles.head}>
        <span className={styles.eyebrow}>Acesso</span>
        <h1 className={styles.title}>Bem-vindo</h1>
        <p className={styles.text}>
          Encontre peças agrícolas, lojas e prestadores próximos de você em poucos minutos.
        </p>
      </header>

      <div className={styles.options}>
        {OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={styles.option}
            onClick={() => onChoose(option.id)}
          >
            <span className={styles.optionIcon}>
              <Icon name={option.icon} size={22} />
            </span>

            <span className={styles.optionBody}>
              <span className={styles.optionTitle}>{option.title}</span>
              <span className={styles.optionText}>{option.text}</span>
            </span>

            <Icon name="chevron-right" size={18} className={styles.optionArrow} />
          </button>
        ))}
      </div>

      <p className={styles.note}>
        O cadastro é gratuito. Sem mensalidade e sem comissão sobre as vendas.
      </p>
    </div>
  );
}
