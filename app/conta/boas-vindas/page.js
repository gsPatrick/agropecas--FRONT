'use client';

/**
 * `/conta/boas-vindas` — o assistente de primeiro acesso de quem só compra.
 *
 * `cliente` não tem `PainelShell` (não vende nada, não tem sidebar de
 * vendedor) — por isso este não vive em `app/painel/*` como os outros três, e
 * monta a própria moldura (`AppHeader`/`AppFooter`), do mesmo jeito que
 * `/conta` já faz.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader/AppHeader';
import AppFooter from '@/components/AppFooter/AppFooter';
import Onboarding from '@/components/Onboarding/Onboarding';
import { useSessao } from '@/lib/sessao';
import styles from '../page.module.css';

export default function BoasVindasContaPage() {
  const router = useRouter();
  const { perfil, tipoPerfil, usuario, autenticado, carregando } = useSessao();

  useEffect(() => {
    if (carregando) return;
    if (!autenticado) router.replace('/entrar?retorno=/conta/boas-vindas');
    else if (tipoPerfil !== 'cliente') router.replace('/painel/boas-vindas');
  }, [carregando, autenticado, tipoPerfil, router]);

  if (!autenticado || tipoPerfil !== 'cliente' || !usuario) return null;

  return (
    <>
      <AppHeader showSearch={false} />

      <main className={styles.main}>
        <div className={styles.inner}>
          <Onboarding tipoPerfil={tipoPerfil} perfil={perfil} usuario={usuario} rotaFinal="/conta" />
        </div>
      </main>

      <AppFooter />
    </>
  );
}
