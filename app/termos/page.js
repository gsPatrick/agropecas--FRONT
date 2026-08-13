/**
 * Rota dos Termos de Uso.
 *
 * Fica como componente de servidor apenas para exportar `metadata` — o texto do
 * documento agora vem da API e precisa de estado, o que só existe no cliente.
 * Separar em dois arquivos é o que permite ter as duas coisas na mesma rota.
 */

import DocumentoLegalCliente, { SECTIONS_TERMOS } from './TermosCliente';

export const metadata = {
  title: 'Termos de Uso — AgroPeças MT',
  description: 'Condições de uso da plataforma AgroPeças MT.',
};

export default function TermosPage() {
  return (
    <DocumentoLegalCliente
      tipo="termos_de_uso"
      tituloPadrao="Termos de Uso"
      lead="Estas são as condições para usar a AgroPeças MT. Ao criar uma conta, você declara que leu e concorda com tudo o que está aqui."
      fallbackSections={SECTIONS_TERMOS}
    />
  );
}
