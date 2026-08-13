'use client';

/**
 * PasswordField — campo de senha com medidor de força.
 *
 * Usar em TODO lugar onde se cria ou troca senha. No login não: lá a senha já
 * existe e medir a força de algo que não pode ser mudado ali é ruído.
 *
 * A pontuação premia comprimento acima de variedade — 16 letras minúsculas
 * resistem mais que 8 caracteres com símbolo, e a régua precisa refletir isso
 * para não empurrar o usuário a inventar "S3nh@!" e achar que está protegido.
 */

import { useState } from 'react';
import Field from '@/components/Field/Field';
import Input from '@/components/Input/Input';
import Icon from '@/components/Icon/Icon';
import styles from './PasswordField.module.css';

const LEVELS = [
  { key: 'weak', label: 'Fraca' },
  { key: 'fair', label: 'Média' },
  { key: 'good', label: 'Boa' },
  { key: 'strong', label: 'Forte' },
];

export function scorePassword(value) {
  if (!value) return -1;

  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (value.length >= 16) score += 1;

  const variety =
    (/[a-z]/.test(value) ? 1 : 0) +
    (/[A-Z]/.test(value) ? 1 : 0) +
    (/\d/.test(value) ? 1 : 0) +
    (/[^\w\s]/.test(value) ? 1 : 0);
  if (variety >= 2) score += 1;
  if (variety >= 3) score += 1;

  // sequências óbvias e repetição derrubam o que o comprimento deu
  if (/(.)\1{2,}/.test(value)) score -= 1;
  if (/^(?:\d+|[a-z]+)$/i.test(value) && value.length < 12) score -= 1;
  if (value.length < 8) return 0;

  return Math.max(0, Math.min(3, score - 1));
}

export default function PasswordField({
  id,
  label = 'Senha',
  hint = 'Mínimo de 8 caracteres.',
  value,
  onChange,
  autoComplete = 'new-password',
  required = false,
  /* erro vindo da API (senha fraca, por exemplo). Vai para o mesmo slot de
     erro que o `Field` já desenha — não há estilo novo aqui */
  error,
}) {
  const [visible, setVisible] = useState(false);
  const score = scorePassword(value);
  const level = score >= 0 ? LEVELS[score] : null;

  return (
    <Field
      label={label}
      htmlFor={id}
      hint={level ? undefined : hint}
      error={error}
      required={required}
    >
      <div className={styles.wrap}>
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          placeholder="••••••••"
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={styles.input}
        />

        <button
          type="button"
          className={styles.toggle}
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          tabIndex={-1}
        >
          <Icon name={visible ? 'eye-off' : 'eye'} size={18} />
        </button>
      </div>

      {level ? (
        <div className={styles.meter}>
          <div className={styles.bars} aria-hidden="true">
            {LEVELS.map((item, index) => (
              <span
                key={item.key}
                className={`${styles.bar} ${index <= score ? styles[level.key] : ''}`}
              />
            ))}
          </div>

          <span className={`${styles.label} ${styles[`text-${level.key}`]}`} role="status">
            Senha {level.label.toLowerCase()}
          </span>
        </div>
      ) : null}
    </Field>
  );
}
