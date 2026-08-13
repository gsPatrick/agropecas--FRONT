'use client';

import { useState } from 'react';
import Icon from '@/components/Icon/Icon';
import styles from './SearchBar.module.css';

export default function SearchBar({
  placeholder = 'Qual peça você procura?',
  buttonLabel = 'Buscar',
  onSearch,
  className = '',
}) {
  const [term, setTerm] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (onSearch) onSearch(term.trim());
  };

  return (
    <form className={`${styles.root} ${className}`} onSubmit={handleSubmit} role="search">
      <label className={styles.field}>
        <Icon name="search" size={20} className={styles.icon} />
        <span className={styles.srOnly}>Buscar peça</span>
        <input
          className={styles.input}
          type="search"
          value={term}
          placeholder={placeholder}
          onChange={(event) => setTerm(event.target.value)}
        />
      </label>
      <button className={styles.submit} type="submit">
        {buttonLabel}
      </button>
    </form>
  );
}
