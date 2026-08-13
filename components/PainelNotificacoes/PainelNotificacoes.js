'use client';

/**
 * Sino do cabeçalho, com a lista em dropdown.
 *
 * Antes o sino era um link para uma tela inteira. Notificação quase sempre
 * pede um olhar de dois segundos — abrir uma página para isso tira a pessoa de
 * onde ela estava e obriga a voltar. Aqui ela olha, resolve e continua.
 *
 * **Marcar como visualizado remove o item da lista**, na hora. O sino é caixa
 * de pendências, não histórico: item lido que fica ali só empurra o próximo
 * para baixo. O aviso de "Desfazer" cobre o toque errado.
 *
 * Fechamento por clique fora e Escape, com o foco voltando ao sino — mesmo
 * comportamento do menu do avatar, para os dois controles vizinhos não
 * responderem de jeitos diferentes.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/Icon/Icon';
import Dica from '@/components/Dica/Dica';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import { useNotificacoes } from '@/lib/notificacoes';
import styles from './PainelNotificacoes.module.css';

export default function PainelNotificacoes() {
  const { lista, total, marcarUma, marcarTodas, restaurar } = useNotificacoes();
  const aviso = useAviso();
  const caminho = usePathname();

  const [aberto, setAberto] = useState(false);
  const raiz = useRef(null);
  const gatilho = useRef(null);

  /* fecha ao navegar: sem isto o dropdown fica aberto sobre a tela nova */
  useEffect(() => {
    setAberto(false);
  }, [caminho]);

  useEffect(() => {
    if (!aberto) return undefined;

    function aoClicarFora(evento) {
      if (!raiz.current?.contains(evento.target)) setAberto(false);
    }

    function aoTeclar(evento) {
      if (evento.key !== 'Escape') return;
      setAberto(false);
      gatilho.current?.focus();
    }

    document.addEventListener('pointerdown', aoClicarFora);
    document.addEventListener('keydown', aoTeclar);

    return () => {
      document.removeEventListener('pointerdown', aoClicarFora);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto]);

  function visualizar(notificacao) {
    marcarUma(notificacao.id);

    aviso.sucesso('Marcada como visualizada.', {
      acao: { rotulo: 'Desfazer', executar: () => restaurar(notificacao.id) },
    });
  }

  function limpar() {
    marcarTodas();
    setAberto(false);
    aviso.sucesso('Todas marcadas como visualizadas.');
  }

  return (
    <div className={styles.root} ref={raiz}>
      <button
        type="button"
        ref={gatilho}
        className={styles.sino}
        onClick={() => setAberto((valor) => !valor)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label={total > 0 ? `Notificações — ${total} não lidas` : 'Notificações'}
      >
        <Icon name="bell" size={19} />
        {total > 0 ? <span className={styles.selo}>{total > 9 ? '9+' : total}</span> : null}
      </button>

      {aberto ? (
        <div className={styles.painel} role="menu">
          <header className={styles.cabecalho}>
            <strong className={styles.titulo}>
              Notificações
              {total > 0 ? <span className={styles.contagem}>{total}</span> : null}
            </strong>

            {total > 0 ? (
              <button type="button" className={styles.limpar} onClick={limpar}>
                Marcar todas
              </button>
            ) : null}
          </header>

          {lista.length ? (
            <ul className={styles.lista}>
              {lista.map((notificacao) => (
                <li
                  key={notificacao.id}
                  className={`${styles.item} ${notificacao.urgente ? styles.itemUrgente : ''}`}
                >
                  <Link href={notificacao.href} className={styles.conteudo} role="menuitem">
                    <span className={styles.icone}>
                      <Icon name={notificacao.icone} size={16} />
                    </span>

                    <span className={styles.texto}>
                      <strong className={styles.itemTitulo}>{notificacao.titulo}</strong>
                      <span className={styles.itemDescricao}>{notificacao.texto}</span>
                      <span className={styles.quando}>{notificacao.quando}</span>
                    </span>
                  </Link>

                  <Dica texto="Marcar como visualizado" alinhamento="fim">
                    <button
                      type="button"
                      className={styles.visualizar}
                      onClick={() => visualizar(notificacao)}
                      aria-label={`Marcar "${notificacao.titulo}" como visualizado`}
                    >
                      <Icon name="check" size={15} />
                    </button>
                  </Dica>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.vazio}>
              <span className={styles.vazioIcone}>
                <Icon name="check" size={20} />
              </span>

              <p className={styles.vazioTitulo}>Tudo em dia</p>
              <p className={styles.vazioTexto}>
                Nada pendente por aqui. Novas notificações aparecem neste sino.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
