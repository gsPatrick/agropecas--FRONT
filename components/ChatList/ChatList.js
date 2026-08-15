'use client';

import Link from 'next/link';
import Icon from '@/components/Icon/Icon';
import { iniciais } from '@/lib/anuncios';
import styles from './ChatList.module.css';

/**
 * ChatList — as conversas, sempre com o anúncio que as originou.
 * O mesmo componente serve ao balão e à página; só muda a densidade.
 */
export default function ChatList({ conversas, ativa, onSelecionar, compacto = false }) {
  if (!conversas.length) {
    return (
      <div className={`${styles.vazio} ${compacto ? styles.vazioCompacto : ''}`}>
        <span className={styles.vazioIcone}>
          <Icon name="mail" size={compacto ? 22 : 28} />
        </span>
        <p className={styles.vazioTitulo}>Nenhuma mensagem ainda</p>
        <p className={styles.vazioTexto}>
          Encontre uma peça, serviço ou máquina e chame o vendedor — a
          conversa aparece aqui.
        </p>
        <Link href="/anuncios" className={styles.vazioAcao}>
          <Icon name="grid" size={15} />
          Ver anúncios
        </Link>
      </div>
    );
  }

  return (
    <ul className={`${styles.root} ${compacto ? styles.compacto : ''}`}>
      {conversas.map((conversa) => {
        /* a lista chega sem `mensagens` carregadas (ver `ChatProvider`: o
           histórico só é buscado quando a conversa é aberta) — até lá, a
           prévia vem de `ultimaMensagem`, que a API já manda pronta para
           isto. As duas formas têm o mesmo formato (`de`/`texto`/`hora`), e
           o componente não precisa saber qual das duas está usando */
        const ultima = conversa.mensagens.length
          ? conversa.mensagens[conversa.mensagens.length - 1]
          : conversa.ultimaMensagem
            ? {
                de: conversa.ultimaMensagem.minha ? 'eu' : 'ela',
                texto: conversa.ultimaMensagem.texto,
                hora: conversa.ultimaMensagem.hora,
              }
            : null;

        return (
          <li key={conversa.id}>
            <button
              type="button"
              className={`${styles.item} ${ativa === conversa.id ? styles.ativo : ''}`}
              onClick={() => onSelecionar(conversa.id)}
            >
              <span className={styles.avatar}>
                {iniciais(conversa.pessoa)}
                {conversa.online ? <span className={styles.online} aria-hidden="true" /> : null}
              </span>

              <span className={styles.body}>
                <span className={styles.top}>
                  <strong className={styles.nome}>{conversa.pessoa}</strong>
                  <span className={styles.hora}>{ultima?.hora}</span>
                </span>

                <span className={styles.anuncio}>
                  <Icon name={conversa.anuncio.icone} size={12} />
                  {conversa.anuncio.titulo}
                </span>

                <span className={styles.previa}>
                  {ultima?.de === 'eu' ? 'Você: ' : ''}
                  {ultima?.texto}
                </span>
              </span>

              {conversa.naoLidas > 0 ? (
                <span className={styles.badge}>{conversa.naoLidas}</span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
