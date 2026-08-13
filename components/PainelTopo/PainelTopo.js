'use client';

/**
 * Cabeçalho da PÁGINA — o título grande e a ação da tela.
 *
 * Não confundir com `PainelBarraTopo`, que é a barra fixa com conta e
 * notificações. Aqui é conteúdo: rola junto com a página, e é isso que devolve
 * altura útil no celular. Fixar as duas coisas comeria um terço do visor num
 * aparelho de 5 polegadas.
 */

import Icon from '@/components/Icon/Icon';
import styles from './PainelTopo.module.css';

export default function PainelTopo({ perfil, titulo, descricao, acoes }) {

  return (
    <header className={styles.root}>
      <div className={styles.linha}>
        <div className={styles.texto}>
          {/* o tipo de perfil fica visível: é o que explica por que a tela
              deste usuário tem "Meus serviços" e a do vizinho não */}
          <span className={styles.chapeu}>
            <Icon name={perfil.icone} size={13} />
            {perfil.rotulo}
          </span>

          <h1 className={styles.titulo}>{titulo}</h1>
          {descricao ? <p className={styles.descricao}>{descricao}</p> : null}
        </div>

        {/* conta e notificações vivem na barra do topo, fixa. Aqui fica só a
            ação da tela — repetir os dois blocos daria dois lugares para a
            mesma coisa, um logo acima do outro */}
        {acoes ? <div className={styles.acoes}>{acoes}</div> : null}
      </div>
    </header>
  );
}
