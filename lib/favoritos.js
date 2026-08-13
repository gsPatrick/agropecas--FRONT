'use client';

/**
 * ⚠️ PROVISÓRIO — contatos favoritos, sem API.
 *
 * Mora fora das telas porque duas páginas dependem da mesma lista: em
 * Mensagens o coração marca, em Favoritos a pessoa aparece. Com o estado
 * dentro de cada página, favoritar numa não mudaria nada na outra — e o
 * usuário veria a lista de favoritos vazia logo depois de favoritar alguém.
 *
 * Guarda no sessionStorage e avisa quem estiver ouvindo. `useSyncExternalStore`
 * não serve aqui: o servidor não tem sessionStorage e o primeiro render
 * divergiria do HTML. Por isso a leitura acontece depois da montagem.
 *
 * Quando a API existir, só este arquivo muda — as telas já consomem
 * `useFavoritos()` e não sabem de onde vem.
 */

import { useEffect, useState } from 'react';

const CHAVE = 'agropecas:favoritos';

let memoria = [];
const ouvintes = new Set();

function ler() {
  try {
    const bruto = sessionStorage.getItem(CHAVE);
    return bruto ? JSON.parse(bruto) : [];
  } catch {
    /* sessionStorage pode estar bloqueado (navegação privada em alguns
       navegadores). Favoritar é secundário: melhor perder a marcação do que
       derrubar a tela inteira */
    return [];
  }
}

function gravar(lista) {
  memoria = lista;

  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {}

  ouvintes.forEach((avisar) => avisar(lista));
}

export function useFavoritos() {
  const [favoritos, setFavoritos] = useState(memoria);

  useEffect(() => {
    memoria = ler();
    setFavoritos(memoria);

    ouvintes.add(setFavoritos);
    return () => ouvintes.delete(setFavoritos);
  }, []);

  /** devolve `true` se a pessoa PASSOU a ser favorita — quem chama usa isso
      para escolher a mensagem do aviso sem recalcular o estado anterior */
  function alternar(pessoaId) {
    const jaEra = memoria.includes(pessoaId);

    gravar(jaEra ? memoria.filter((id) => id !== pessoaId) : [...memoria, pessoaId]);

    return !jaEra;
  }

  return {
    favoritos,
    alternar,
    ehFavorito: (pessoaId) => favoritos.includes(pessoaId),
  };
}
