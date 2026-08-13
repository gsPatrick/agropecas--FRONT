'use client';

/**
 * Menu do avatar, no cabeçalho do painel.
 *
 * Existe por duas razões diferentes em cada tamanho de tela:
 *
 *  · **No celular**, é a porta dos itens que não cabem na barra inferior. A
 *    barra tem quatro vagas por limite de toque, o menu tem nove itens — sem
 *    este dropdown, cinco deles existiriam no computador e sumiriam no
 *    celular. A lista vem de `itensExtras`, derivada da própria barra, para
 *    nunca divergir dela.
 *
 *  · **No computador**, a sidebar já mostra tudo. Aqui sobram só as ações de
 *    conta — ver perfil público, configurações, sair. Repetir o menu inteiro
 *    seria oferecer dois caminhos para a mesma coisa e obrigar a pessoa a
 *    escolher entre eles a cada vez.
 *
 * A diferença é feita em CSS, não em JavaScript: decidir por `window.innerWidth`
 * no primeiro render divergiria do HTML do servidor e quebraria a hidratação.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Icon from '@/components/Icon/Icon';
import { itensExtras, estaAtivo } from '@/lib/painel-menu';
import styles from './PainelMenuUsuario.module.css';

export default function PainelMenuUsuario({ perfil, usuario, contadores = {}, onSair }) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef(null);
  const gatilho = useRef(null);
  const caminho = usePathname();
  const router = useRouter();

  const grupos = itensExtras(perfil);

  /* fecha ao navegar: sem isto o menu fica aberto sobre a tela nova */
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
      /* devolve o foco ao gatilho: quem fechou pelo teclado não pode ser
         despejado no começo da página */
      gatilho.current?.focus();
    }

    document.addEventListener('pointerdown', aoClicarFora);
    document.addEventListener('keydown', aoTeclar);

    return () => {
      document.removeEventListener('pointerdown', aoClicarFora);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto]);

  function sair() {
    setAberto(false);
    onSair?.();
    router.push('/');
  }

  return (
    <div className={styles.root} ref={raiz}>
      <button
        type="button"
        ref={gatilho}
        className={styles.gatilho}
        onClick={() => setAberto((valor) => !valor)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label={`Conta de ${usuario.nome}`}
      >
        <span className={styles.avatar}>{usuario.iniciais}</span>

        <span className={styles.identidade}>
          <strong className={styles.nome}>{usuario.nome}</strong>
          <span className={styles.local}>
            {usuario.cidade} · {usuario.uf}
          </span>
        </span>

        <Icon name="chevron-right" size={14} className={styles.seta} />
      </button>

      {aberto ? (
        <div className={styles.painel} role="menu">
          <header className={styles.cabecalho}>
            <span className={styles.avatarGrande}>{usuario.iniciais}</span>

            <span className={styles.cabecalhoTexto}>
              <strong className={styles.cabecalhoNome}>{usuario.nome}</strong>
              <span className={styles.cabecalhoPerfil}>
                <Icon name={perfil.icone} size={12} />
                {perfil.rotulo}
                {usuario.verificado ? (
                  <span className={styles.verificado} title="Perfil verificado">
                    <Icon name="check" size={11} />
                  </span>
                ) : null}
              </span>
            </span>
          </header>

          <Link href={`/perfil/${usuario.slug}`} className={styles.verPerfil} role="menuitem">
            <Icon name="eye" size={16} />
            Ver meu perfil público
          </Link>

          {/* só no celular: no computador estes itens já estão na sidebar */}
          <div className={styles.extras}>
            {grupos.map((grupo) => (
              <div key={grupo.titulo} className={styles.grupo}>
                <span className={styles.grupoTitulo}>{grupo.titulo}</span>

                {grupo.itens.map((item) => {
                  const contador = contadores[item.contador];

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      className={`${styles.item} ${estaAtivo(item, caminho) ? styles.itemAtivo : ''}`}
                    >
                      <Icon name={item.icone} size={17} />
                      <span className={styles.itemTexto}>{item.rotulo}</span>

                      {contador > 0 ? (
                        <span className={styles.contador}>{contador > 9 ? '9+' : contador}</span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          {/* no computador o menu é só isto: as ações de conta */}
          <div className={styles.conta}>
            <Link href="/painel/configuracoes" role="menuitem" className={styles.item}>
              <Icon name="gear" size={17} />
              <span className={styles.itemTexto}>Configurações</span>
            </Link>

            <button type="button" role="menuitem" className={styles.sair} onClick={sair}>
              <Icon name="logout" size={17} />
              <span className={styles.itemTexto}>Sair da conta</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
