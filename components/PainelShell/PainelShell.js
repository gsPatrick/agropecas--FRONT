'use client';

/**
 * Estrutura do painel: sidebar no desktop, barra inferior no celular.
 *
 * As duas navegações leem o MESMO menu (`lib/painel-menu.js`) — é o que impede
 * uma seção existir no computador e sumir no celular.
 *
 * O estado de recolhida vive aqui, e não dentro da sidebar, porque o conteúdo
 * precisa saber a largura disponível para acompanhar.
 */

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import PainelSidebar from '@/components/PainelSidebar/PainelSidebar';
import PainelBarraTopo from '@/components/PainelBarraTopo/PainelBarraTopo';
import PainelTabBar from '@/components/PainelTabBar/PainelTabBar';
import PerfilChaveta from '@/components/PerfilChaveta/PerfilChaveta';
import { useSessao, rotaDaConta } from '@/lib/sessao';
import { useChat } from '@/components/ChatProvider/ChatProvider';
import { carregarPerfilPublico, completudeDoPerfil } from '@/lib/dados/perfil-publico';
import { onboardingFoiDispensado, precisaDeOnboarding } from '@/lib/onboarding';
import styles from './PainelShell.module.css';

const CHAVE_RECOLHIDA = 'agropecas:painel-recolhido';
const ROTA_ONBOARDING = '/painel/boas-vindas';

export default function PainelShell({ children }) {
  const { perfil, tipoPerfil, trocarPerfil, usuario, sair, autenticado, carregando } = useSessao();
  const { naoLidas } = useChat();
  const caminho = usePathname();
  const router = useRouter();

  /* a sessão agora é real: sem ela o painel não tem o que mostrar. Antes o
     componente devolvia `null` e a pessoa via uma tela BRANCA sem explicação —
     agora vai para o login. O `carregando` é o que impede o redirecionamento
     de disparar no primeiro render, antes de o `GET /auth/eu` responder */
  useEffect(() => {
    if (carregando) return;
    if (!autenticado) {
      router.replace('/entrar');
      return;
    }

    /* quem só compra não tem painel de vendedor — a barra inteira é atalho
       para anunciar e gerir anúncio, nada disso existe para esse perfil. Um
       link antigo ou digitado à mão manda para a conta, não para uma tela
       cheia de botão que a API vai recusar */
    if (tipoPerfil === 'cliente') router.replace(rotaDaConta(tipoPerfil));
  }, [carregando, autenticado, tipoPerfil, router]);

  /* gatilho do assistente de primeiro acesso — só para quem vende (produtor,
     loja, prestador; `cliente` já foi mandado para `/conta` acima, onde tem o
     próprio checkpoint em `app/conta/page.js`). Ver `lib/onboarding.js` para
     o motivo de usar completude em vez de um sinal de "primeiro login". */
  useEffect(() => {
    if (carregando || !autenticado || tipoPerfil === 'cliente') return;
    if (caminho === ROTA_ONBOARDING) return;
    if (onboardingFoiDispensado(usuario?.id)) return;

    let cancelado = false;

    carregarPerfilPublico()
      .then((dados) => {
        if (cancelado) return;
        const { porcentagem } = completudeDoPerfil(dados, tipoPerfil);
        if (precisaDeOnboarding(porcentagem)) router.replace(ROTA_ONBOARDING);
      })
      .catch(() => {
        /* API fora do ar não pode travar o painel num redirecionamento —
           melhor deixar a pessoa seguir do que insistir num assistente que
           não vai conseguir carregar dado nenhum */
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregando, autenticado, tipoPerfil, caminho, usuario?.id]);

  const [recolhida, setRecolhida] = useState(false);
  const [pronto, setPronto] = useState(false);

  /* a preferência do usuário, guardada à parte do estado atual: telas que
     pedem largura recolhem a barra sem apagar o que ele escolheu */
  const preferencia = useRef(false);

  /* a preferência é lida depois da montagem: ler no primeiro render
     divergiria do HTML do servidor e o React reclamaria de hidratação */
  useEffect(() => {
    const salvo = localStorage.getItem(CHAVE_RECOLHIDA) === '1';
    preferencia.current = salvo;
    setPronto(true);
  }, []);

  useEffect(() => {
    setRecolhida(preferencia.current);
  }, []);

  /* anuncia a altura da barra de navegação para a raiz do documento.
     
     Quem flutua por cima de tudo — os avisos de ação, por exemplo — vive FORA
     deste componente e não herdaria a variável. Sem isso, o aviso nasceria
     atrás da barra no celular. Some ao sair do painel, onde a barra não existe */
  useEffect(() => {
    const raiz = document.documentElement;
    raiz.style.setProperty('--altura-barra-inferior', '56px');

    return () => raiz.style.removeProperty('--altura-barra-inferior');
  }, []);

  function alternar() {
    setRecolhida((valor) => {
      const proximo = !valor;

      preferencia.current = proximo;
      localStorage.setItem(CHAVE_RECOLHIDA, proximo ? '1' : '0');

      return proximo;
    });
  }

  /* só mensagens: o número de notificações vive no store delas, lido pelo
     próprio sino — dois lugares guardando a mesma contagem divergiriam */
  const contadores = { mensagens: naoLidas };

  if (!usuario) return null;

  return (
    <div
      className={`${styles.root} ${recolhida ? styles.compacto : ''} ${
        pronto ? styles.pronto : ''
      }`}
    >
      <PainelSidebar
        perfil={perfil}
        recolhida={recolhida}
        onAlternar={alternar}
        contadores={contadores}
      />

      <div className={styles.coluna}>
        {/* a barra encosta na sidebar: as duas bordas formam o "L" da moldura */}
        <PainelBarraTopo
          perfil={perfil}
          usuario={usuario}
          contadores={contadores}
          onSair={sair}
        />

        <div className={styles.conteudo}>
          {/* ⚠️ provisório: com sessão real o tipo de perfil é o do cadastro,
              então o seletor não tem efeito — mostrá-lo seria oferecer um
              botão morto. Só aparece sem sessão, onde ainda serve para
              conferir as três variações do desenho */}
          {autenticado ? null : <PerfilChaveta atual={tipoPerfil} onTrocar={trocarPerfil} />}

          {children}
        </div>
      </div>

      <PainelTabBar perfil={perfil} contadores={contadores} />
    </div>
  );
}
