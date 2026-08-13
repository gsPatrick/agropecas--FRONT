'use client';

/**
 * Publicar anúncio.
 *
 * A página só resolve o cabeçalho e de onde vem o tipo; o formulário em si é
 * `AnuncioForm`, compartilhado com a edição.
 */

import { useSearchParams } from 'next/navigation';
import PainelTopo from '@/components/PainelTopo/PainelTopo';
import AnuncioForm from '@/components/AnuncioForm/AnuncioForm';
import { useSessao } from '@/lib/sessao';

export default function NovoAnuncioPage() {
  const { perfil, usuario } = useSessao();
  const parametros = useSearchParams();

  if (!usuario) return null;

  return (
    <>
      <PainelTopo
        perfil={perfil}
        titulo="Publicar anúncio"
        descricao="Quanto mais completo, mais contatos você recebe."
      />

      <AnuncioForm tipoInicial={parametros.get('tipo')} />
    </>
  );
}
