'use client';

/**
 * Cartão do painel — a caixa que quase toda seção usa.
 *
 * Existe para que espaçamento, borda e cabeçalho não sejam redecididos em cada
 * tela. Quando dez telas desenham a própria caixa, elas divergem em dois
 * pixels e o painel parece montado por pessoas diferentes.
 */

import Link from 'next/link';
import Icon from '@/components/Icon/Icon';
import styles from './PainelCartao.module.css';

export default function PainelCartao({
  titulo,
  descricao,
  /* atalho para outra tela: `{ href, rotulo }` */
  acao,
  /* controle que age SOBRE o cartão — um filtro de período, por exemplo.
     Separado de `acao` porque aquela é sempre um link, e passar um componente
     ali fazia o Link nascer sem href */
  controle,
  icone,
  children,
  className = '',
  semPadding = false,
  /* deixa o conteúdo passar da borda. Necessário em cartão que contém dica
     (tooltip): o corte padrão existe para a lista não vazar o canto
     arredondado, e é ele que decapita o balão que sobe além do topo */
  permiteEstouro = false,
}) {
  return (
    <section
      className={`${styles.root} ${permiteEstouro ? styles.semCorte : ''} ${className}`}
    >
      {titulo ? (
        <header className={styles.topo}>
          <div className={styles.texto}>
            <h2 className={styles.titulo}>
              {icone ? <Icon name={icone} size={17} className={styles.icone} /> : null}
              {titulo}
            </h2>
            {descricao ? <p className={styles.descricao}>{descricao}</p> : null}
          </div>

          {controle ? <div className={styles.controle}>{controle}</div> : null}

          {acao ? (
            <Link href={acao.href} className={styles.acao}>
              {acao.rotulo}
              <Icon name="chevron-right" size={15} />
            </Link>
          ) : null}
        </header>
      ) : null}

      <div className={semPadding ? styles.corpoSemPadding : styles.corpo}>{children}</div>
    </section>
  );
}
