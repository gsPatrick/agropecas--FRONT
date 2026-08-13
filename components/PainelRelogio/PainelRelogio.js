'use client';

/**
 * Data e hora — em texto, na linha de apoio do título.
 *
 * Não é enfeite: quem anuncia precisa da data de hoje para ler "expira em 3
 * dias" e "há 2 h" sem calcular, e do horário para decidir se ainda vale ligar
 * para o interessado — no campo, ninguém atende às 21h.
 *
 * Texto e não cartão: era informação de apoio ocupando um bloco do grid, o que
 * dava a ela mais peso visual do que ela merece.
 *
 * Renderiza vazio no servidor de propósito. A hora do servidor não é a hora do
 * usuário, e mandá-la no HTML causaria diferença na hidratação e um segundo de
 * horário errado na tela.
 */

import { useEffect, useState } from 'react';
import styles from './PainelRelogio.module.css';

const DATA = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const HORA = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
});

const maiuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

export default function PainelRelogio() {
  const [agora, setAgora] = useState(null);

  useEffect(() => {
    setAgora(new Date());

    /* alinha o primeiro tique com a virada do minuto: um intervalo de 60s
       cravado na montagem mostraria 14:59 por até 59 segundos depois das 15h */
    const ate = 60000 - (Date.now() % 60000);

    let intervalo;
    const primeiro = setTimeout(() => {
      setAgora(new Date());
      intervalo = setInterval(() => setAgora(new Date()), 60000);
    }, ate);

    return () => {
      clearTimeout(primeiro);
      clearInterval(intervalo);
    };
  }, []);

  /* segura a altura da linha até a hora do cliente chegar: sem isto o
     parágrafo nasce vazio e a página inteira pula um degrau */
  if (!agora) return <span className={styles.reserva} aria-hidden="true" />;

  return (
    <span className={styles.root}>
      {maiuscula(DATA.format(agora))}
      <span className={styles.separador}>·</span>
      <time className={styles.hora} dateTime={agora.toISOString()}>
        {HORA.format(agora)}
      </time>
    </span>
  );
}
