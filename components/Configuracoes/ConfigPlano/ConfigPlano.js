'use client';

/**
 * Configurações → Plano.
 *
 * Só leitura — mostra o que a conta usa hoje, sem botão de trocar de plano.
 * O escopo atual do produto é "gratuito para todo mundo, sem limite
 * artificial"; cobrança e upgrade ficam para uma v2.0. Mostrar aqui evita
 * inventar tela nova quando esse dia chegar — a mesma tela ganha um botão.
 */

import { useEffect, useState } from 'react';
import PainelCartao from '@/components/PainelCartao/PainelCartao';
import Icon from '@/components/Icon/Icon';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import { carregarMeuPlano } from '@/lib/dados/plano';
import styles from './ConfigPlano.module.css';

export default function ConfigPlano() {
  const aviso = useAviso();
  const [plano, setPlano] = useState(null);

  useEffect(() => {
    const controle = new AbortController();

    carregarMeuPlano({ sinal: controle.signal })
      .then(setPlano)
      .catch((erro) => {
        if (erro.name !== 'AbortError') aviso.erro('Não foi possível carregar o plano.');
      });

    return () => controle.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!plano) {
    return (
      <PainelCartao titulo="Seu plano" icone="chart">
        <div className={styles.carregando}>
          <Esqueleto altura={54} raio={10} />
          <Esqueleto altura={54} raio={10} />
        </div>
      </PainelCartao>
    );
  }

  return (
    <>
      <PainelCartao titulo="Seu plano" icone="chart">
        <div className={styles.resumo}>
          <div>
            <strong className={styles.nomePlano}>{plano.nome}</strong>
            <span className={styles.origem}>{plano.origem}</span>
          </div>

          <span className={styles.selo}>Gratuito</span>
        </div>

        <p className={styles.nota}>
          <Icon name="check" size={14} />
          Sem limite artificial hoje — todo mundo usa a plataforma no mesmo plano, sem cobrança.
        </p>
      </PainelCartao>

      <PainelCartao titulo="O que você usa" descricao="Nos limites do plano atual." icone="grid" semPadding>
        <ul className={styles.usos}>
          {plano.uso.map((item) => (
            <li key={item.chave} className={styles.uso}>
              <div className={styles.usoTexto}>
                <strong>{item.descricao}</strong>
                <span>{item.periodo === 'mes' ? 'Por mês' : 'No total'}</span>
              </div>

              <span className={styles.usoValor}>
                {item.usado}
                {item.ilimitado ? (
                  <span className={styles.ilimitado}>sem limite</span>
                ) : (
                  <span className={styles.limite}>de {item.limite}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </PainelCartao>
    </>
  );
}
