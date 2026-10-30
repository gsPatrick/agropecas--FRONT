'use client';

/**
 * /painel/compras — peças compradas pela plataforma.
 *
 * Loja e produtor também compram: o painel de quem vende precisa do mesmo
 * "Minhas compras" que a `/conta` do cliente tem. A lista é a mesma
 * (`MinhasCompras`); só a moldura muda.
 */

import PainelTopo from '@/components/PainelTopo/PainelTopo';
import MinhasCompras from '@/components/MinhasCompras/MinhasCompras';
import { useSessao } from '@/lib/sessao';

export default function ComprasPage() {
  const { perfil } = useSessao();

  return (
    <>
      <PainelTopo
        perfil={perfil}
        titulo="Minhas compras"
        descricao="O pagamento fica guardado pela AgroPeças até você confirmar que a peça chegou."
      />
      <MinhasCompras />
    </>
  );
}
