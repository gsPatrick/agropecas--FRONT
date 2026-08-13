'use client';

/**
 * ChatWidget — o balão flutuante.
 *
 * Some nas telas de acesso e dentro do painel — ver `OCULTO_EM` abaixo.
 *
 * Lê o mesmo estado da página /mensagens, então mensagem lida aqui aparece
 * lida lá.
 */

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/components/Icon/Icon';
import ChatList from '@/components/ChatList/ChatList';
import ChatThread from '@/components/ChatThread/ChatThread';
import { useChat } from '@/components/ChatProvider/ChatProvider';
import { useSessao } from '@/lib/sessao';
import styles from './ChatWidget.module.css';

/**
 * Onde o balão NÃO aparece.
 *
 * `/entrar` — o usuário está numa tarefa fechada e um balão pulando no canto é
 * interrupção pura.
 *
 * `/mensagens` e `/painel` — ali o chat já é uma página inteira. Balão sobre a
 * própria conversa seria a mesma coisa duas vezes na tela, uma cobrindo a
 * outra, com dois lugares para responder a mesma mensagem.
 */
/* `/admin` entra na lista por outro motivo que as demais: ali quem está
   logado está trabalhando SOBRE as conversas dos outros, e um balão do chat
   pessoal por cima disso confunde os dois papéis */
const OCULTO_EM = ['/entrar', '/mensagens', '/painel', '/admin'];

export default function ChatWidget() {
  const caminho = usePathname();
  const { conversas, ativa, conversaAtiva, aberto, naoLidas, setAberto, abrirConversa, enviar } =
    useChat();
  const { autenticado, tipoPerfil } = useSessao();

  /* visitante não tem conversa: contador de mensagens sem login é promessa
     falsa. E o balão é exclusivo de quem só compra — quem vende já tem
     "Mensagens" na barra do painel, e um balão flutuante por cima seria a
     mesma caixa de entrada disputando espaço com ela mesma na tela */
  if (!autenticado || tipoPerfil !== 'cliente') return null;
  if (OCULTO_EM.some((rota) => caminho.startsWith(rota))) return null;

  /* a página de detalhe tem barra fixa de contato no rodapé em mobile:
     o balão precisa subir para não cobrir o botão de WhatsApp */
  const temBarraInferior = /^\/anuncios\/[^/]+$/.test(caminho);

  return (
    <>
      {aberto ? (
        <section
          className={`${styles.painel} ${temBarraInferior ? styles.acimaDaBarra : ''}`}
          aria-label="Mensagens"
        >
          <header className={styles.head}>
            <div className={styles.headText}>
              <strong className={styles.titulo}>Mensagens</strong>
              <span className={styles.sub}>
                {naoLidas > 0 ? `${naoLidas} não lida${naoLidas > 1 ? 's' : ''}` : 'Tudo em dia'}
              </span>
            </div>

            <div className={styles.headActions}>
              <Link href="/mensagens" className={styles.iconBtn} aria-label="Abrir em tela cheia">
                <Icon name="grid" size={16} />
              </Link>

              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => setAberto(false)}
                aria-label="Fechar"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          </header>

          <div className={styles.corpo}>
            {conversaAtiva ? (
              /* a thread controla a própria rolagem (mensagens) */
              <ChatThread
                conversa={conversaAtiva}
                onEnviar={enviar}
                onVoltar={() => abrirConversa(null)}
              />
            ) : (
              <div className={styles.rolagem}>
                <ChatList
                  conversas={conversas}
                  ativa={ativa}
                  onSelecionar={abrirConversa}
                  compacto
                />
              </div>
            )}
          </div>
        </section>
      ) : null}

      {/* com o painel aberto o balão sai de cena: o X do cabeçalho já fecha */}
      {!aberto ? (
        <button
          type="button"
          className={`${styles.balao} ${temBarraInferior ? styles.acimaDaBarra : ''}`}
          onClick={() => setAberto(true)}
          aria-label="Abrir mensagens"
        >
          <Icon name="mail" size={24} />
          {naoLidas > 0 ? (
            <span className={styles.contador}>{naoLidas > 9 ? '9+' : naoLidas}</span>
          ) : null}
        </button>
      ) : null}
    </>
  );
}
