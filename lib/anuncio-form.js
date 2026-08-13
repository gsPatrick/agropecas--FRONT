/**
 * ⚠️ **Vem do catálogo do admin, não daqui.**
 *
 * CATEGORIAS e MARCAS são vocabulário de produto, administrado em
 * `/admin/catalogo`, e devem chegar por `GET /admin/catalogo/:colecao`. Estão
 * escritas aqui só enquanto não há API — hoje, acrescentar uma marca exige
 * deploy.
 *
 * Fechadas e não campo livre porque a busca depende delas: em texto solto,
 * "John Deere" e "john deere " viram marcas diferentes e nenhuma aparece no
 * filtro da outra.
 */
/**
 * ⚠️ PROVISÓRIO — opções do formulário de anúncio.
 *
 * No sistema pronto isso vem do módulo `catalogo` da API, que é gerenciado
 * pela Admin justamente para ela ajustar sem depender de deploy. Aqui é uma
 * amostra para a tela existir sem backend.
 *
 * As categorias mudam por tipo: quem anuncia serviço não deve escolher
 * "Filtros", e quem anuncia peça não deve escolher "Solda".
 */

export const CATEGORIAS = {
  peca: [
    'Motor',
    'Hidráulica',
    'Transmissão',
    'Elétrica',
    'Filtros',
    'Rolamentos e retentores',
    'Pneus e rodas',
    'Freios',
    'Cabine e acabamento',
    'Outros',
  ],
  servico: [
    'Manutenção mecânica',
    'Elétrica e eletrônica',
    'Solda e caldeiraria',
    'Retífica',
    'Usinagem',
    'Pintura',
    'Socorro em campo',
    'Instalação de equipamentos',
    'Outros',
  ],
  maquina: [
    'Trator',
    'Colheitadeira',
    'Pulverizador',
    'Plantadeira',
    'Implemento de solo',
    'Carreta e transbordo',
    'Outros',
  ],
};

export const CONDICOES = [
  { id: 'nova', rotulo: 'Nova' },
  { id: 'usada', rotulo: 'Usada' },
  { id: 'recondicionada', rotulo: 'Recondicionada' },
];

export const NEGOCIACOES = [
  { id: 'venda', rotulo: 'Venda' },
  { id: 'troca', rotulo: 'Troca' },
  { id: 'venda_ou_troca', rotulo: 'Venda ou troca' },
];

/**
 * Sugestões de marca — não é lista fechada.
 *
 * O campo aceita qualquer texto. Estas são só as que aparecem no `datalist`,
 * para poupar digitação de quem anuncia uma das comuns. Fechar a lista faria
 * a peça de marca menos conhecida virar "Outra", e o filtro da busca perderia
 * justamente a informação que o comprador procurou.
 */
export const MARCAS = [
  'John Deere',
  'Valtra',
  'Massey Ferguson',
  'New Holland',
  'Case IH',
  'Fendt',
  'Bosch',
  'Jacto',
  'Stara',
];
