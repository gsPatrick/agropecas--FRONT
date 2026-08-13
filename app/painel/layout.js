import PainelShell from '@/components/PainelShell/PainelShell';

export const metadata = {
  title: 'Painel — AgroPeças MT',
};

/**
 * Layout do painel.
 *
 * A estrutura vive num layout e não em cada página porque a sidebar não pode
 * remontar ao navegar: remontar reinicia a animação de recolher e perde a
 * posição da rolagem do menu a cada clique.
 */
export default function PainelLayout({ children }) {
  return <PainelShell>{children}</PainelShell>;
}
