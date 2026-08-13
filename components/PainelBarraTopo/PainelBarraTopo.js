'use client';

/**
 * Barra do topo do painel.
 *
 * Ocupa a coluna do conteúdo e encosta na sidebar: as duas bordas se encontram
 * e formam um "L", que é o que faz o painel parecer uma aplicação e não uma
 * página com elementos soltos.
 *
 * Fica FIXA no topo porque conta e notificações precisam estar sempre à mão —
 * rolar até o fim de uma lista de anúncios e não achar mais o sino é o tipo de
 * coisa que faz a pessoa voltar ao começo à toa.
 *
 * No celular ela vira o cabeçalho do aplicativo: a marca aparece (a sidebar
 * não existe lá) e o rótulo da seção some, porque o título grande da página
 * logo abaixo já diz onde a pessoa está.
 *
 * E **some ao rolar para baixo**, voltando ao primeiro movimento para cima —
 * o padrão dos aplicativos. Numa tela de 5 polegadas, cabeçalho e barra
 * inferior fixos ao mesmo tempo comem um terço do visor justamente quando a
 * pessoa está lendo uma lista longa.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import BrandMark from '@/components/BrandMark/BrandMark';
import PainelMenuUsuario from '@/components/PainelMenuUsuario/PainelMenuUsuario';
import PainelNotificacoes from '@/components/PainelNotificacoes/PainelNotificacoes';
import { rotuloAtual } from '@/lib/painel-menu';
import styles from './PainelBarraTopo.module.css';

/* só esconde depois deste ponto: sumir logo no primeiro pixel faria a barra
   piscar a cada toque de rolagem no topo da página */
const LIMITE = 90;

export default function PainelBarraTopo({ perfil, usuario, contadores = {}, onSair }) {
  const caminho = usePathname();
  const secao = rotuloAtual(perfil, caminho);

  const [oculta, setOculta] = useState(false);
  const ultimo = useRef(0);
  const agendado = useRef(false);

  useEffect(() => {
    function aoRolar() {
      /* uma leitura por quadro: o evento de rolagem dispara dezenas de vezes
         por segundo, e ler a posição em todas causa engasgo */
      if (agendado.current) return;
      agendado.current = true;

      requestAnimationFrame(() => {
        const atual = window.scrollY;
        const desceu = atual > ultimo.current;

        setOculta(desceu && atual > LIMITE);
        ultimo.current = atual;
        agendado.current = false;
      });
    }

    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => window.removeEventListener('scroll', aoRolar);
  }, []);

  /* ao trocar de tela a barra volta: a nova página começa do topo e uma barra
     escondida ali pareceria defeito */
  useEffect(() => {
    setOculta(false);
    ultimo.current = 0;
  }, [caminho]);

  return (
    <header className={`${styles.root} ${oculta ? styles.oculta : ''}`}>
      <div className={styles.esquerda}>
        <Link href="/" className={styles.marca} aria-label="AgroPeças MT — início">
          <BrandMark size="sm" />
        </Link>

        <span className={styles.secao}>{secao}</span>
      </div>

      <div className={styles.direita}>
        {/* dropdown, e não link para uma tela: notificação pede um olhar de
            dois segundos, e abrir uma página tira a pessoa de onde ela estava */}
        <PainelNotificacoes />

        <PainelMenuUsuario
          perfil={perfil}
          usuario={usuario}
          contadores={contadores}
          onSair={onSair}
        />
      </div>
    </header>
  );
}
