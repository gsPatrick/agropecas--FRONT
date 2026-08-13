'use client';

/**
 * ChatThread — a conversa aberta.
 *
 * O cartão do anúncio fica fixo no topo: quem responde precisa ver do que se
 * trata sem rolar. Rolagem sempre vai para o fim ao entrar e a cada mensagem.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon/Icon';
import { iniciais } from '@/lib/anuncios';
import styles from './ChatThread.module.css';

export default function ChatThread({ conversa, onEnviar, onVoltar }) {
  const [texto, setTexto] = useState('');
  const fimRef = useRef(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: 'end' });
  }, [conversa?.id, conversa?.mensagens.length]);

  if (!conversa) {
    return (
      <div className={styles.vazio}>
        <span className={styles.vazioIcone} aria-hidden="true">
          <Icon name="mail" size={28} />
        </span>
        <p className={styles.vazioTexto}>Escolha uma conversa para começar.</p>
      </div>
    );
  }

  function enviar(event) {
    event.preventDefault();
    onEnviar(conversa.id, texto);
    setTexto('');
  }

  return (
    <div className={styles.root}>
      <header className={styles.head}>
        {onVoltar ? (
          <button type="button" className={styles.voltar} onClick={onVoltar} aria-label="Voltar">
            <Icon name="chevron-right" size={18} className={styles.voltarIcone} />
          </button>
        ) : null}

        <span className={styles.avatar}>{iniciais(conversa.pessoa)}</span>

        <div className={styles.headText}>
          <Link href={`/perfil/${conversa.slug}`} className={styles.nome}>
            {conversa.pessoa}
          </Link>
          <span className={styles.estado}>
            {conversa.online ? 'Online agora' : 'Responde em algumas horas'}
          </span>
        </div>
      </header>

      <Link href={`/anuncios/${conversa.anuncio.id}`} className={styles.anuncio}>
        <span className={styles.anuncioIcone} aria-hidden="true">
          <Icon name={conversa.anuncio.icone} size={20} />
        </span>
        <span className={styles.anuncioBody}>
          <strong className={styles.anuncioTitulo}>{conversa.anuncio.titulo}</strong>
          <span className={styles.anuncioPreco}>
            {conversa.anuncio.preco || 'Consultar valor'}
          </span>
        </span>
        <Icon name="chevron-right" size={16} className={styles.anuncioSeta} />
      </Link>

      <div className={styles.mensagens}>
        {conversa.mensagens.map((mensagem) => (
          <div
            key={mensagem.id}
            className={`${styles.linha} ${mensagem.de === 'eu' ? styles.minha : ''}`}
          >
            <div className={styles.balao}>
              <p className={styles.texto}>{mensagem.texto}</p>
              <span className={styles.hora}>{mensagem.hora}</span>
            </div>
          </div>
        ))}
        <div ref={fimRef} />
      </div>

      <form className={styles.compositor} onSubmit={enviar}>
        <input
          className={styles.campo}
          value={texto}
          placeholder="Escreva sua mensagem…"
          onChange={(event) => setTexto(event.target.value)}
          aria-label="Mensagem"
        />
        <button
          type="submit"
          className={styles.enviar}
          disabled={!texto.trim()}
          aria-label="Enviar"
        >
          <Icon name="arrow-right" size={18} />
        </button>
      </form>
    </div>
  );
}
