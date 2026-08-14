'use client';

/**
 * `/painel/boas-vindas` — assistente de primeiro acesso dos três tipos que
 * vendem (produtor, loja, prestador). Quem só compra (`cliente`) não tem
 * painel de vendedor — `PainelShell` já redireciona esse tipo para `/conta`
 * antes deste componente montar, então o equivalente dele mora em
 * `/conta/boas-vindas`.
 *
 * Fica dentro de `app/painel` de propósito: herda o `PainelShell` (sidebar,
 * barra do topo) do `layout.js` da pasta, então o assistente já nasce com a
 * mesma moldura do resto do painel — a pessoa não sente que saiu para uma
 * tela separada.
 */

import { useSessao, rotaDaConta } from '@/lib/sessao';
import Onboarding from '@/components/Onboarding/Onboarding';

export default function BoasVindasPage() {
  const { perfil, tipoPerfil, usuario, carregando } = useSessao();

  if (carregando || !usuario) return null;

  return (
    <Onboarding
      tipoPerfil={tipoPerfil}
      perfil={perfil}
      usuario={usuario}
      rotaFinal={rotaDaConta(tipoPerfil) === '/conta' ? '/conta' : '/painel/perfil'}
    />
  );
}
