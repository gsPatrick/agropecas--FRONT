'use client';

/**
 * ServicePicker — modal para buscar e marcar serviços.
 *
 * O carrossel na tela é vitrine; quem quer conferir a lista inteira abre aqui.
 * Os já marcados sobem para o topo: numa lista longa, encontrar o que você
 * mesmo escolheu não pode depender de rolagem.
 */

import { useMemo, useState } from 'react';
import Modal from '@/components/Modal/Modal';
import Button from '@/components/Button/Button';
import Input from '@/components/Input/Input';
import Icon from '@/components/Icon/Icon';
import styles from './ServicePicker.module.css';

/* ignora acento e caixa: "mecanica" precisa achar "Mecânica agrícola" */
function normalize(value) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export default function ServicePicker({
  open,
  items,
  selected,
  align = 'right',
  onToggle,
  onClear,
  onClose,
}) {
  const [term, setTerm] = useState('');

  const list = useMemo(() => {
    const query = normalize(term);
    const filtered = query ? items.filter((item) => normalize(item).includes(query)) : items;

    return [...filtered].sort((a, b) => {
      const aOn = selected.includes(a);
      const bOn = selected.includes(b);
      if (aOn === bOn) return 0;
      return aOn ? -1 : 1;
    });
  }, [items, selected, term]);

  return (
    <Modal
      open={open}
      title="Serviços que presta"
      description="Busque e marque quantos quiser."
      align={align}
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className={styles.clear}
            onClick={onClear}
            disabled={selected.length === 0}
          >
            Limpar seleção
          </button>

          <Button onClick={onClose}>
            Concluir{selected.length > 0 ? ` (${selected.length})` : ''}
          </Button>
        </>
      }
    >
      <div className={styles.search}>
        <Input
          iconLeft="search"
          placeholder="Buscar serviço…"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          data-autofocus
          aria-label="Buscar serviço"
        />
      </div>

      {list.length === 0 ? (
        <p className={styles.empty}>
          Nenhum serviço encontrado para <strong>{term}</strong>.
        </p>
      ) : (
        <ul className={styles.list}>
          {list.map((item) => {
            const on = selected.includes(item);

            return (
              <li key={item}>
                <button
                  type="button"
                  className={`${styles.row} ${on ? styles.rowOn : ''}`}
                  aria-pressed={on}
                  onClick={() => onToggle(item)}
                >
                  <span className={styles.box} aria-hidden="true">
                    <Icon name="check" size={13} />
                  </span>
                  <span className={styles.label}>{item}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
