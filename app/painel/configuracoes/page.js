'use client';

/**
 * Configurações — dividida por tópicos, com navegação própria.
 *
 * Empilhar conta, senha, sessões, notificações, privacidade e LGPD numa página
 * só daria uma rolagem de dois metros em que ninguém acha nada. Com a lista de
 * tópicos à esquerda, cada assunto cabe numa tela e a pessoa vê de saída tudo
 * o que existe para configurar.
 *
 * O tópico aberto vive na URL (`?secao=seguranca`). É o que permite a
 * notificação de "novo acesso" levar direto às sessões, e o que faz o botão
 * de voltar do navegador andar tópico a tópico em vez de sair da página.
 *
 * Cada tópico é um componente à parte: seis blocos de formulário num arquivo
 * só viraria a tela mais difícil de mexer do painel.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PainelTopo from '@/components/PainelTopo/PainelTopo';
import Icon from '@/components/Icon/Icon';
import ConfigConta from '@/components/Configuracoes/ConfigConta/ConfigConta';
import ConfigSeguranca from '@/components/Configuracoes/ConfigSeguranca/ConfigSeguranca';
import ConfigNotificacoes from '@/components/Configuracoes/ConfigNotificacoes/ConfigNotificacoes';
import ConfigPrivacidade from '@/components/Configuracoes/ConfigPrivacidade/ConfigPrivacidade';
import ConfigDados from '@/components/Configuracoes/ConfigDados/ConfigDados';
import ConfigPlano from '@/components/Configuracoes/ConfigPlano/ConfigPlano';
import { useSessao } from '@/lib/sessao';
import { SECOES } from '@/lib/configuracoes-mock';
import styles from './page.module.css';

const TELAS = {
  conta: ConfigConta,
  seguranca: ConfigSeguranca,
  notificacoes: ConfigNotificacoes,
  privacidade: ConfigPrivacidade,
  dados: ConfigDados,
  plano: ConfigPlano,
};

export default function ConfiguracoesPage() {
  const { perfil, usuario } = useSessao();
  const router = useRouter();

  const [secao, setSecao] = useState('conta');

  /**
   * Lido de `window` e não de `useSearchParams`: o hook obriga a envolver a
   * página num Suspense só por causa disto, e aqui o parâmetro só interessa
   * depois da montagem.
   */
  useEffect(() => {
    const pedida = new URLSearchParams(window.location.search).get('secao');
    if (pedida && TELAS[pedida]) setSecao(pedida);
  }, []);

  if (!usuario) return null;

  function abrir(id) {
    setSecao(id);

    /* troca a URL sem recarregar nem rolar a página: a navegação por tópicos
       é interna, e um salto para o topo a cada clique cansaria */
    router.replace(`/painel/configuracoes?secao=${id}`, { scroll: false });
  }

  const Tela = TELAS[secao] || ConfigConta;
  const atual = SECOES.find((item) => item.id === secao);

  return (
    <>
      <PainelTopo
        perfil={perfil}
        titulo="Configurações"
        descricao="Conta, segurança, avisos e privacidade"
      />

      <div className={styles.grade}>
        {/* navegação dos tópicos: barra à esquerda no computador, tiras
            roláveis no celular — onde uma coluna lateral comeria a tela */}
        <nav className={styles.topicos} aria-label="Tópicos de configuração">
          {SECOES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.topico} ${item.id === secao ? styles.topicoAtivo : ''}`}
              onClick={() => abrir(item.id)}
              aria-current={item.id === secao ? 'page' : undefined}
            >
              <span className={styles.topicoIcone}>
                <Icon name={item.icone} size={17} />
              </span>

              <span className={styles.topicoTexto}>
                <strong>{item.rotulo}</strong>
                <span>{item.descricao}</span>
              </span>
            </button>
          ))}
        </nav>

        <section className={styles.conteudo} aria-label={atual?.rotulo}>
          <Tela />
        </section>
      </div>
    </>
  );
}
