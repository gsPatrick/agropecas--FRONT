'use client';

/**
 * Barra inferior — a navegação do painel no celular.
 *
 * Barra inferior e não sidebar porque o polegar alcança a base da tela sem
 * reposicionar a mão. Menu lateral em celular exige duas ações (abrir, depois
 * escolher) para o que aqui custa uma.
 *
 * Quatro destinos e uma ação central, que é o teto do padrão: acima disso os
 * alvos ficam estreitos demais e o toque erra.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/Icon/Icon';
import { itensMobile, acaoPrincipal, estaAtivo } from '@/lib/painel-menu';
import styles from './PainelTabBar.module.css';

export default function PainelTabBar({ perfil, contadores = {} }) {
  const caminho = usePathname();
  const itens = itensMobile(perfil);
  const acao = acaoPrincipal(perfil);

  /* a ação central divide a barra ao meio: dois destinos de cada lado */
  const meio = Math.ceil(itens.length / 2);
  const esquerda = itens.slice(0, meio);
  const direita = itens.slice(meio);

  const aba = (item) => {
    const ativo = estaAtivo(item, caminho);
    const contador = contadores[item.contador];

    return (
      <li key={item.href} className={styles.celula}>
        <Link
          href={item.href}
          className={`${styles.aba} ${ativo ? styles.abaAtiva : ''}`}
          aria-current={ativo ? 'page' : undefined}
        >
          <span className={styles.icone}>
            <Icon name={item.icone} size={22} />
            {contador > 0 ? (
              <span className={styles.selo}>{contador > 9 ? '9+' : contador}</span>
            ) : null}
          </span>

          <span className={styles.rotulo}>{item.rotulo}</span>
        </Link>
      </li>
    );
  };

  return (
    <nav className={styles.root} aria-label="Navegação do painel">
      <ul className={styles.lista}>
        {esquerda.map(aba)}

        <li className={styles.celulaAcao}>
          <Link href={acao.href} className={styles.acao} aria-label={acao.rotulo}>
            <Icon name={acao.icone} size={24} />
          </Link>
        </li>

        {direita.map(aba)}
      </ul>
    </nav>
  );
}
