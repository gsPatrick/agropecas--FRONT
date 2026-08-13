'use client';

/**
 * Avisos de ação — o retorno de "deu certo" ou "deu errado".
 *
 * Sem isso, clicar em «pausar» mudava a lista e mais nada: quem não estava
 * olhando exatamente aquela linha não sabia se a ação aconteceu. Ação sem
 * confirmação faz a pessoa clicar de novo, e clicar de novo em «remover» é
 * como se perde o anúncio errado.
 *
 * Minimalista de propósito: uma faixa curta, um ícone, some sozinha. Diálogo
 * de confirmação para cada ação bem-sucedida seria pior que silêncio — obriga
 * a fechar algo que só queria informar.
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Icon from '@/components/Icon/Icon';
import styles from './AvisoProvider.module.css';

const AvisoContexto = createContext(null);

export function useAviso() {
  const contexto = useContext(AvisoContexto);
  if (!contexto) throw new Error('useAviso precisa estar dentro de AvisoProvider');
  return contexto;
}

const ICONES = { sucesso: 'check', erro: 'close', info: 'bell' };

/* erro fica mais tempo: quem errou precisa ler o motivo, quem acertou não */
const DURACAO = { sucesso: 3200, erro: 5200, info: 4000 };

export default function AvisoProvider({ children }) {
  const [avisos, setAvisos] = useState([]);
  const sequencia = useRef(0);

  const fechar = useCallback((id) => {
    setAvisos((atual) => atual.filter((aviso) => aviso.id !== id));
  }, []);

  const mostrar = useCallback(
    (texto, { tipo = 'sucesso', acao } = {}) => {
      sequencia.current += 1;
      const id = sequencia.current;

      setAvisos((atual) => {
        /* teto de três: uma pilha maior cobre a tela justamente de quem está
           executando várias ações seguidas */
        const proximos = [...atual, { id, texto, tipo, acao }];
        return proximos.slice(-3);
      });

      const tempo = setTimeout(() => fechar(id), DURACAO[tipo]);
      return () => clearTimeout(tempo);
    },
    [fechar]
  );

  const valor = useMemo(
    () => ({
      mostrar,
      sucesso: (texto, opcoes) => mostrar(texto, { ...opcoes, tipo: 'sucesso' }),
      erro: (texto, opcoes) => mostrar(texto, { ...opcoes, tipo: 'erro' }),
      info: (texto, opcoes) => mostrar(texto, { ...opcoes, tipo: 'info' }),
    }),
    [mostrar]
  );

  return (
    <AvisoContexto.Provider value={valor}>
      {children}

      {/* `polite` e não `assertive`: o aviso não deve interromper a leitura em
          andamento, só entrar na fila */}
      <div className={styles.pilha} role="status" aria-live="polite">
        {avisos.map((aviso) => (
          <div key={aviso.id} className={`${styles.aviso} ${styles[aviso.tipo]}`}>
            <span className={styles.icone}>
              <Icon name={ICONES[aviso.tipo]} size={15} />
            </span>

            <span className={styles.texto}>{aviso.texto}</span>

            {aviso.acao ? (
              <button
                type="button"
                className={styles.acao}
                onClick={() => {
                  aviso.acao.executar();
                  fechar(aviso.id);
                }}
              >
                {aviso.acao.rotulo}
              </button>
            ) : null}

            <button
              type="button"
              className={styles.fechar}
              onClick={() => fechar(aviso.id)}
              aria-label="Fechar aviso"
            >
              <Icon name="close" size={13} />
            </button>
          </div>
        ))}
      </div>
    </AvisoContexto.Provider>
  );
}
