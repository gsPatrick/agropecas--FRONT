'use client';

/**
 * Configurações → Notificações.
 *
 * Uma grade de assunto × canal, e não uma chave geral. "Recebo tudo ou não
 * recebo nada" na prática vira ninguém recebendo: o excesso ensina a ignorar,
 * e aí some junto o aviso que valia dinheiro — alguém chamando sobre o anúncio.
 *
 * Cada chave salva na hora — a API já faz substituição parcial por
 * assunto/canal (`notificacao.preferencia.service.js`), então não existe
 * "descartar": o que está na tela é sempre o que está salvo, como qualquer
 * outra chave liga/desliga do painel.
 *
 * ⚠️ Só 4 dos 6 assuntos do mock têm tipo de notificação real na API — "Anúncio
 * favoritado" e "Resumo semanal" saíram (ver `lib/dados/configuracoes.js`).
 * WhatsApp também saiu dos canais: `CANAIS_ENTREGUES` (o que a API realmente
 * entrega) é só sistema/e-mail — WhatsApp e push existem no enum do banco mas
 * não têm provedor por trás ainda.
 */

import { useEffect, useState } from 'react';
import PainelCartao from '@/components/PainelCartao/PainelCartao';
import PainelChave from '@/components/PainelChave/PainelChave';
import Icon from '@/components/Icon/Icon';
import Dica from '@/components/Dica/Dica';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import { ASSUNTOS, CANAIS, carregarPreferencias, salvarPreferencia } from '@/lib/dados/configuracoes';
import styles from './ConfigNotificacoes.module.css';

export default function ConfigNotificacoes() {
  const aviso = useAviso();

  const [dados, setDados] = useState(null);

  useEffect(() => {
    const controle = new AbortController();

    carregarPreferencias({ sinal: controle.signal })
      .then(setDados)
      .catch((erro) => {
        if (erro.name !== 'AbortError') aviso.erro('Não foi possível carregar as preferências.');
      });

    return () => controle.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function alternar(tipo, canal, valor) {
    /* otimista: a grade tem até 4×2 chaves, esperar a rede em cada clique
       faria a tela parecer travada */
    setDados((atual) => ({ ...atual, [tipo]: { ...atual[tipo], [canal]: { ativo: valor } } }));

    try {
      await salvarPreferencia(tipo, canal, valor);
    } catch (erro) {
      setDados((atual) => ({ ...atual, [tipo]: { ...atual[tipo], [canal]: { ativo: !valor } } }));
      aviso.erro(erro.message);
    }
  }

  if (!dados) {
    return (
      <PainelCartao titulo="O que você quer receber" icone="bell">
        <div className={styles.carregando}>
          <Esqueleto altura={54} raio={10} />
          <Esqueleto altura={54} raio={10} />
          <Esqueleto altura={54} raio={10} />
        </div>
      </PainelCartao>
    );
  }

  return (
    <PainelCartao
      titulo="O que você quer receber"
      descricao="Cada aviso, em cada canal. O sino do topo é o canal “No site”."
      icone="bell"
      semPadding
      permiteEstouro
    >
      <div className={styles.tabela}>
        <div className={styles.cabecalho}>
          <span className={styles.colunaAssunto}>Aviso</span>

          {CANAIS.map((canal) => (
            <span key={canal.id} className={styles.colunaCanal}>
              <Icon name={canal.icone} size={14} />
              {canal.rotulo}
            </span>
          ))}
        </div>

        {ASSUNTOS.map((assunto) => (
          <div key={assunto.tipo} className={styles.linha}>
            <div className={styles.assunto}>
              <strong>{assunto.rotulo}</strong>
              <span>{assunto.descricao}</span>
            </div>

            {CANAIS.map((canal) => {
              const info = dados[assunto.tipo]?.[canal.id] || {};
              const travado = Boolean(info.bloqueado);

              const chave = (
                <PainelChave
                  ligada={Boolean(info.ativo)}
                  desabilitada={travado}
                  onMudar={(valor) => alternar(assunto.tipo, canal.id, valor)}
                  rotulo={`${assunto.rotulo} por ${canal.rotulo}`}
                />
              );

              return (
                <div key={canal.id} className={styles.celula}>
                  <span className={styles.rotuloCanal}>{canal.rotulo}</span>

                  {travado ? (
                    <Dica texto="Sempre ligado — é o aviso de que a sua conta precisa de atenção">
                      {chave}
                    </Dica>
                  ) : (
                    chave
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </PainelCartao>
  );
}
