'use client';

/**
 * Sidebar do painel — só existe no desktop.
 *
 * Retrátil por escolha do usuário, e a escolha é lembrada: quem trabalha o dia
 * inteiro na tela de anúncios quer o máximo de largura para a tabela; quem está
 * navegando quer os rótulos. Impor um dos dois erra metade das vezes.
 *
 * Recolhida, vira uma faixa de ícones com `title` — não some. Sidebar que
 * desaparece obriga a lembrar onde as coisas estavam.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import BrandMark from '@/components/BrandMark/BrandMark';
import Icon from '@/components/Icon/Icon';
import { montarMenu, acaoPrincipal, estaAtivo } from '@/lib/painel-menu';
import styles from './PainelSidebar.module.css';

export default function PainelSidebar({ perfil, recolhida, onAlternar, contadores = {} }) {
  const caminho = usePathname();
  const grupos = montarMenu(perfil);
  const acao = acaoPrincipal(perfil);

  return (
    <aside
      className={`${styles.root} ${recolhida ? styles.recolhida : ''}`}
      data-recolhida={recolhida ? 'sim' : 'nao'}
    >
      {/* o botão fica montado NA BORDA, metade para fora: assim ele pertence à
          divisa entre menu e conteúdo, que é o que ele move. Dentro do
          cabeçalho ele disputava espaço com a marca e sumia quando recolhida */}
      <button
        type="button"
        className={styles.alternar}
        onClick={onAlternar}
        aria-label={recolhida ? 'Expandir menu' : 'Recolher menu'}
        title={recolhida ? 'Expandir menu' : 'Recolher menu'}
        aria-expanded={!recolhida}
      >
        <Icon name={recolhida ? 'chevron-right' : 'chevron-left'} size={15} />
      </button>

      <div className={styles.topo}>
        <Link href="/" className={styles.marca} aria-label="AgroPeças MT — início">
          {recolhida ? <Icon name="leaf" size={22} /> : <BrandMark size="sm" />}
        </Link>
      </div>

      {/* a ação principal fica acima do menu: é o que a pessoa vem fazer */}
      <Link href={acao.href} className={styles.acao} title={acao.rotulo}>
        <span className={styles.acaoIcone}>
          <Icon name={acao.icone} size={18} />
        </span>
        <span className={styles.acaoTexto}>{acao.rotulo}</span>
      </Link>

      <nav className={styles.nav} aria-label="Menu do painel">
        {grupos.map((grupo) => (
          <div key={grupo.titulo} className={styles.grupo}>
            <span className={styles.grupoTitulo} aria-hidden={recolhida}>
              {grupo.titulo}
            </span>

            <ul className={styles.lista}>
              {grupo.itens.filter(Boolean).map((item) => {
                const ativo = estaAtivo(item, caminho);
                const contador = contadores[item.contador];

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`${styles.item} ${ativo ? styles.itemAtivo : ''}`}
                      title={recolhida ? item.rotulo : undefined}
                      aria-current={ativo ? 'page' : undefined}
                    >
                      <span className={styles.itemIcone}>
                        <Icon name={item.icone} size={19} />
                        {/* recolhida, o número não cabe: vira um ponto */}
                        {contador > 0 && recolhida ? <span className={styles.ponto} /> : null}
                      </span>

                      <span className={styles.itemTexto}>{item.rotulo}</span>

                      {contador > 0 && !recolhida ? (
                        <span className={styles.contador}>{contador > 9 ? '9+' : contador}</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
