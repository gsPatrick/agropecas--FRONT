'use client';

/**
 * Numbers — a prova social sobre a paisagem em linha.
 *
 * Camadas:  landscape (desenho, ancorado na base) · conteúdo
 * Driver:   interseção — colunas entram escalonadas
 * Mobile:   2 colunas; a paisagem continua colada embaixo
 *
 * Os quatro números vêm de `GET /relatorios/publico` (contagem real da
 * plataforma). Eram fixos no código — "+500 fazendas" — e número inflado em
 * produto novo é dívida: quem confere uma vez deixa de acreditar no resto da
 * página. O desenho, a grade e os rótulos não mudaram; só a origem do valor.
 */

import { useEffect, useState } from 'react';
import Reveal from '@/components/Reveal/Reveal';
import Icon from '@/components/Icon/Icon';
import StatBlock from '@/components/StatBlock/StatBlock';
import { buscarNumerosDaPlataforma } from '@/lib/dados/home';
import styles from './Numbers.module.css';

/* `campo` é o nome que a API devolve; o resto é o que a seção sempre teve */
const STATS = [
  { id: 'fazendas', campo: 'produtores', label: 'Fazendas conectadas', icon: 'tractor' },
  { id: 'lojas', campo: 'lojas', label: 'Lojas parceiras', icon: 'store' },
  { id: 'prestadores', campo: 'prestadores', label: 'Prestadores de serviços', icon: 'wrench' },
  { id: 'pecas', campo: 'anunciosAtivos', label: 'Peças disponíveis todos os dias', icon: 'gear' },
];

/* O "+" do texto antigo não voltou de propósito: ele promete "mais que isso",
   e o que a API manda é a contagem exata. Separador de milhar em pt-BR mantém
   a leitura que a tela já tinha ("2.000"). */
const formatar = (valor) => valor.toLocaleString('pt-BR');

/* Traço enquanto carrega e se a API falhar. É o único estado honesto: repetir
   o número antigo seria inventar, e esconder a seção deslocaria a página
   inteira depois que ela aparecesse. A largura do traço é próxima à de um
   número, então a coluna não pula quando o valor chega. */
const SEM_VALOR = '—';

export default function Numbers() {
  const [numeros, setNumeros] = useState(null);

  useEffect(() => {
    const controle = new AbortController();

    buscarNumerosDaPlataforma({ sinal: controle.signal })
      .then(setNumeros)
      .catch((erro) => {
        /* seção sem número ainda é seção: a home não pode quebrar porque o
           contador não respondeu */
        if (erro.name !== 'AbortError') setNumeros(null);
      });

    return () => controle.abort();
  }, []);

  return (
    <section className={styles.root} id="numeros">
      <div className={styles.landscape} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.grid}>
          {STATS.map((stat, i) => (
            <Reveal key={stat.id} delay={i * 90} className={styles.cell}>
              <StatBlock
                value={numeros ? formatar(numeros[stat.campo]) : SEM_VALOR}
                label={stat.label}
              />
              <Icon name={stat.icon} size={46} className={styles.icon} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
