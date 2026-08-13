'use client';

/**
 * AddressFields — endereço por CEP (ViaCEP).
 *
 * Só ficam como campo os dados que o CEP NÃO resolve: número, complemento e
 * município. Logradouro, bairro e UF vêm da consulta e aparecem como resumo em
 * leitura — o estado é exibido, nunca digitado.
 *
 * Município continua editável porque CEP de zona rural e de cidade pequena
 * costuma vir genérico; sem ele editável, esse usuário não conclui o cadastro.
 *
 * A busca é abortada a cada nova digitação: sem isso, a resposta lenta de um
 * CEP antigo chega depois e sobrescreve o que o usuário acabou de digitar.
 *
 * Trocar a URL por um endpoint próprio quando o backend existir — permite cache
 * e evita expor o padrão de uso.
 */

import { useEffect, useRef, useState } from 'react';
import Field from '@/components/Field/Field';
import Input from '@/components/Input/Input';
import Icon from '@/components/Icon/Icon';
import styles from './AddressFields.module.css';

const EMPTY = {
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
};

function maskCep(value) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

export default function AddressFields({ idPrefix = 'end', onChange }) {
  const [address, setAddress] = useState(EMPTY);
  const [status, setStatus] = useState('idle');
  const controllerRef = useRef(null);
  const numeroRef = useRef(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  function update(patch) {
    setAddress((current) => {
      const next = { ...current, ...patch };
      if (onChange) onChange(next);
      return next;
    });
  }

  async function lookup(digits) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus('loading');

    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
        signal: controller.signal,
      });
      const data = await response.json();

      if (data.erro) {
        setStatus('notfound');
        update({ logradouro: '', bairro: '', uf: '' });
        return;
      }

      update({
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        uf: data.uf || '',
      });
      setStatus('ok');
      numeroRef.current?.focus();
    } catch (error) {
      if (error.name !== 'AbortError') setStatus('error');
    }
  }

  function onCepChange(event) {
    const masked = maskCep(event.target.value);
    update({ cep: masked });

    const digits = masked.replace(/\D/g, '');
    if (digits.length === 8) lookup(digits);
    else {
      controllerRef.current?.abort();
      setStatus('idle');
    }
  }

  const cepError = {
    notfound: 'CEP não encontrado. Confira o número.',
    error: 'Não foi possível consultar agora.',
  }[status];

  const found = status === 'ok' && (address.logradouro || address.bairro);

  return (
    <div className={styles.root}>
      <div className={styles.row}>
        <Field
          label="CEP"
          htmlFor={`${idPrefix}-cep`}
          hint={status === 'loading' ? 'Buscando…' : 'O endereço é preenchido pelo CEP.'}
          error={cepError}
          className={styles.cep}
          required
        >
          <Input
            id={`${idPrefix}-cep`}
            inputMode="numeric"
            placeholder="00000-000"
            autoComplete="postal-code"
            value={address.cep}
            onChange={onCepChange}
            invalid={status === 'notfound'}
          />
        </Field>

        <Field label="Número" htmlFor={`${idPrefix}-num`} className={styles.numero} required>
          <Input
            id={`${idPrefix}-num`}
            ref={numeroRef}
            inputMode="numeric"
            placeholder="000"
            value={address.numero}
            onChange={(e) => update({ numero: e.target.value })}
          />
        </Field>

        {/* exibido, nunca digitado: vem do CEP */}
        <Field label="Estado" htmlFor={`${idPrefix}-uf`} className={styles.uf}>
          <Input
            id={`${idPrefix}-uf`}
            value={address.uf}
            placeholder="—"
            readOnly
            tabIndex={-1}
            aria-readonly="true"
            className={styles.readonly}
          />
        </Field>
      </div>

      {found ? (
        <p className={styles.found}>
          <Icon name="pin" size={15} />
          <span>
            {address.logradouro}
            {address.logradouro && address.bairro ? ' · ' : ''}
            {address.bairro}
          </span>
        </p>
      ) : null}

      <div className={styles.row}>
        <Field
          label="Município"
          htmlFor={`${idPrefix}-cidade`}
          hint="Confira — em zona rural o CEP costuma ser genérico."
          className={styles.grow}
          required
        >
          <Input
            id={`${idPrefix}-cidade`}
            placeholder="Ex.: Tangará da Serra"
            autoComplete="address-level2"
            value={address.cidade}
            onChange={(e) => update({ cidade: e.target.value })}
          />
        </Field>

        <Field label="Complemento" htmlFor={`${idPrefix}-compl`} className={styles.grow}>
          <Input
            id={`${idPrefix}-compl`}
            placeholder="Sala, galpão, km…"
            value={address.complemento}
            onChange={(e) => update({ complemento: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}
