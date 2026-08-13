'use client';

/**
 * Estrutura do painel administrativo.
 *
 * Separado do `PainelShell` de propósito, e não uma variação dele. São dois
 * produtos com riscos diferentes: no painel do usuário o pior que acontece é
 * um anúncio mal editado; aqui, banir a pessoa errada. A moldura distinta —
 * marca com distintivo, identificação de quem está administrando — existe para
 * ninguém confundir onde está.
 *
 * No computador, barra lateral retrátil com a preferência lembrada. No
 * celular, barra inferior: a Aline vai olhar denúncia no domingo pelo
 * telefone, e gaveta lateral custa dois toques para o que a barra resolve em
 * um.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessao } from '@/lib/sessao';
import AdminSidebar from '@/components/AdminSidebar/AdminSidebar';
import AdminBarraTopo from '@/components/AdminBarraTopo/AdminBarraTopo';
import AdminTabBar from '@/components/AdminTabBar/AdminTabBar';
import { carregarContadoresAdmin } from '@/lib/dados/admin';
import styles from './AdminShell.module.css';

const CHAVE_RECOLHIDA = 'agropecas:admin-recolhido';

const ROTULO_PAPEL = { admin: 'Administrador(a)', moderador: 'Moderação', suporte: 'Suporte' };

/** o rótulo do papel mais "forte" que a pessoa tem — quem é admin não
    precisa ver "moderador, suporte" empilhado */
function papelPrincipal(papeis) {
  const chave = ['admin', 'moderador', 'suporte'].find((item) => papeis.includes(item));
  return ROTULO_PAPEL[chave] || 'Administração';
}

export default function AdminShell({ children }) {
  const [recolhida, setRecolhida] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [contadores, setContadores] = useState({});

  const { autenticado, carregando, ehAdmin, papeis, usuario } = useSessao();
  const router = useRouter();

  /* administração exige sessão E papel administrativo. Sem sessão, não há o
     que revalidar — manda para o login geral (não existe um separado). Com
     sessão mas sem papel (produtor/loja/prestador/cliente comuns), a pessoa
     nunca deveria ter chegado aqui: devolve para a home, não para o login,
     porque logar de novo não muda o papel de ninguém. A autorização de
     verdade continua sendo do servidor — todo endpoint de `/admin` exige
     `admin.acessar` por conta própria; isto aqui só evita montar a tela
     inteira para quem visivelmente não vai conseguir usar nada nela */
  useEffect(() => {
    if (carregando) return;
    if (!autenticado) router.replace('/entrar?retorno=/admin');
    else if (!ehAdmin) router.replace('/');
  }, [carregando, autenticado, ehAdmin, router]);

  useEffect(() => {
    if (!ehAdmin) return undefined;

    const controle = new AbortController();

    carregarContadoresAdmin({ sinal: controle.signal })
      .then(setContadores)
      .catch(() => {});

    return () => controle.abort();
  }, [ehAdmin]);

  /* a preferência é lida depois da montagem: ler no primeiro render divergiria
     do HTML do servidor e o React reclamaria de hidratação */
  useEffect(() => {
    setRecolhida(localStorage.getItem(CHAVE_RECOLHIDA) === '1');
    setPronto(true);
  }, []);

  /* anuncia a altura da barra inferior para a raiz do documento: quem flutua
     por cima de tudo — os avisos, por exemplo — vive fora deste componente e
     nasceria atrás da barra no celular */
  useEffect(() => {
    const raiz = document.documentElement;
    raiz.style.setProperty('--altura-barra-inferior', '56px');

    return () => raiz.style.removeProperty('--altura-barra-inferior');
  }, []);

  function alternar() {
    setRecolhida((valor) => {
      const proximo = !valor;
      localStorage.setItem(CHAVE_RECOLHIDA, proximo ? '1' : '0');
      return proximo;
    });
  }

  /* nada de administração é desenhado enquanto a sessão não confirma o
     papel — a tela vazia é melhor do que piscar o painel para quem vai ser
     redirecionado no instante seguinte */
  if (carregando || !autenticado || !ehAdmin) return null;

  const admin = {
    nome: usuario?.nome || 'Administração',
    iniciais: usuario?.iniciais || 'AD',
    papel: papelPrincipal(papeis),
  };

  return (
    <div
      className={`${styles.root} ${recolhida ? styles.compacto : ''} ${
        pronto ? styles.pronto : ''
      }`}
    >
      <AdminSidebar contadores={contadores} recolhida={recolhida} onAlternar={alternar} />

      <div className={styles.coluna}>
        <AdminBarraTopo admin={admin} />

        <main className={styles.conteudo}>{children}</main>
      </div>

      <AdminTabBar contadores={contadores} />
    </div>
  );
}
