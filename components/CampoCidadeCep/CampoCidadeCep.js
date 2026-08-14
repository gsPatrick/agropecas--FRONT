'use client';

/**
 * Campo "Cidade e estado" — o mesmo `Field`+`Input` de texto livre que já
 * existia em `/conta`, `/painel/perfil`, `/painel/propriedade`,
 * `/painel/atendimento` e no Onboarding, só que também aceita um CEP
 * digitado no lugar do nome da cidade.
 *
 * Digitar um nome continua funcionando exatamente como antes — o valor só é
 * substituído quando os dígitos do texto batem 8 (mesma extração de
 * `AddressFields.js`), e aí a busca no ViaCEP substitui o campo por
 * "Cidade · UF", no mesmo formato que `cidadeParaTexto()` já produz nos
 * adaptadores de `lib/dados/*`.
 *
 * A busca é abortada a cada nova digitação, pelo mesmo motivo de
 * `AddressFields.js`: sem isso, a resposta de um CEP antigo pode chegar
 * depois e sobrescrever o que a pessoa acabou de digitar.
 */

import { useEffect, useRef, useState } from 'react';
import Field from '@/components/Field/Field';
import Input from '@/components/Input/Input';
import { extrairDigitosCep, buscarCidadePorCep, formatarCidadeUf } from '@/lib/cidade-por-cep';

export default function CampoCidadeCep({
  id = 'cidade',
  label = 'Cidade e estado',
  hint,
  required = false,
  value,
  onChange,
  placeholder = 'Sorriso · MT — ou digite o CEP',
  className,
}) {
  const [status, setStatus] = useState('idle');
  const controllerRef = useRef(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  async function resolverPorCep(digitos) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus('loading');

    try {
      const achado = await buscarCidadePorCep(digitos, { signal: controller.signal });
      if (!achado) {
        setStatus('notfound');
        return;
      }
      onChange(formatarCidadeUf(achado.cidade, achado.uf));
      setStatus('ok');
    } catch (erro) {
      if (erro.name !== 'AbortError') setStatus('error');
    }
  }

  function mudar(evento) {
    const texto = evento.target.value;
    onChange(texto);

    const digitos = extrairDigitosCep(texto);
    if (digitos.length === 8) resolverPorCep(digitos);
    else {
      controllerRef.current?.abort();
      setStatus('idle');
    }
  }

  const hintFinal =
    status === 'loading' ? 'Buscando…' : status === 'notfound' ? 'CEP não encontrado — digite o nome da cidade.' : hint;

  return (
    <Field label={label} htmlFor={id} hint={hintFinal} required={required} className={className}>
      <Input id={id} value={value} onChange={mudar} placeholder={placeholder} iconLeft="pin" />
    </Field>
  );
}
