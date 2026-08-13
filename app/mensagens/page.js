'use client';

/**
 * /mensagens — a caixa de entrada em tela cheia.
 *
 * Duas colunas no desktop; no celular, uma tela por vez (lista OU conversa),
 * porque conversa espremida ao lado de lista não serve a nenhuma das duas.
 */

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader/AppHeader';
import ChatList from '@/components/ChatList/ChatList';
import ChatThread from '@/components/ChatThread/ChatThread';
import Icon from '@/components/Icon/Icon';
import { useChat } from '@/components/ChatProvider/ChatProvider';
import { useSessao } from '@/lib/sessao';
import styles from './page.module.css';

export default function MensagensPage() {
  const router = useRouter();
  const { conversas, ativa, conversaAtiva, naoLidas, abrirConversa, enviar } = useChat();
  const { autenticado, tipoPerfil, carregando } = useSessao();

  /* essa caixa de entrada é do cliente. Quem vende tem a própria em
     `/painel/mensagens` — a mesma separação de `/conta` vs `/painel` */
  useEffect(() => {
    if (carregando) return;
    if (!autenticado) {
      router.replace('/entrar?retorno=/mensagens');
      return;
    }
    if (tipoPerfil !== 'cliente') router.replace('/painel/mensagens');
  }, [carregando, autenticado, tipoPerfil, router]);

  if (!autenticado || tipoPerfil !== 'cliente') return null;

  return (
    <>
      <AppHeader showSearch={false} />

      <main className={styles.main}>
        <div className={styles.inner}>
          <header className={styles.head}>
            <div>
              <h1 className={styles.titulo}>Mensagens</h1>
              <p className={styles.sub}>
                {naoLidas > 0
                  ? `${naoLidas} mensagem${naoLidas > 1 ? 's' : ''} não lida${naoLidas > 1 ? 's' : ''}`
                  : 'Nenhuma mensagem nova'}
              </p>
            </div>

            <Link href="/anuncios" className={styles.som}>
              <Icon name="search" size={16} />
              Ver anúncios
            </Link>
          </header>

          <div className={`${styles.painel} ${conversaAtiva ? styles.comConversa : ''}`}>
            <aside className={styles.lista} aria-label="Conversas">
              <ChatList conversas={conversas} ativa={ativa} onSelecionar={abrirConversa} />
            </aside>

            <section className={styles.conversa}>
              <ChatThread
                conversa={conversaAtiva}
                onEnviar={enviar}
                onVoltar={() => abrirConversa(null)}
              />
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
