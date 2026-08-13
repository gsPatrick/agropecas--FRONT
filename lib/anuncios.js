/**
 * Dados de exemplo até o backend existir.
 * A forma dos campos é a que a listagem espera — trocar a origem, não o formato.
 */

/* fallback: qualquer anúncio sem ficha/descrição própria continua abrindo a
   página de detalhe com conteúdo coerente */
const PADRAO = {
  perfil: 'Anunciante',
  membroDesde: 'este ano',
  whatsapp: '5565999999999',
  descricao:
    'Anúncio publicado na AgroPeças MT. Fale com o anunciante pelo WhatsApp ou pelo chat da plataforma para combinar valores, condição da peça e entrega.',
  ficha: [],
};

/* Coordenada da sede do município: usada quando o anúncio não tem endereço
   exato — o mapa mostra a cidade, marcado como aproximado. */
const SEDES = {
  'Tangará da Serra': { lat: -14.6229, lng: -57.4933 },
  Sorriso: { lat: -12.5453, lng: -55.7211 },
  'Campo Novo do Parecis': { lat: -13.6752, lng: -57.8917 },
  'Barra do Bugres': { lat: -15.0725, lng: -57.1811 },
  'Nova Mutum': { lat: -13.8375, lng: -56.0736 },
  Diamantino: { lat: -14.4086, lng: -56.4461 },
  'Lucas do Rio Verde': { lat: -13.0508, lng: -55.9114 },
  Sinop: { lat: -11.8642, lng: -55.5025 },
};

export function getAnuncio(id) {
  const anuncio = ANUNCIOS.find((item) => item.id === id);
  if (!anuncio) return null;

  const local =
    anuncio.local ||
    {
      origem: 'municipio',
      cidade: anuncio.cidade,
      uf: anuncio.uf,
      ...(SEDES[anuncio.cidade] || {}),
      aproximado: true,
    };

  const perfilBase = PERFIS[anuncio.autor] || PERFIL_PADRAO;

  return {
    ...PADRAO,
    ...perfilBase,
    ...anuncio,
    local,
    autorSlug: slugify(anuncio.autor),
    autorIniciais: iniciais(anuncio.autor),
    verificado: perfilBase.verificado || false,
  };
}

export function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function iniciais(nome) {
  return nome
    .split(' ')
    .filter((parte) => parte.length > 2)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase();
}

/* Perfis públicos. Enquanto não há backend, o anunciante é derivado dos
   anúncios: o nome é a chave e o slug é o identificador da rota. */
const PERFIS = {
  'Peças Tangará': {
    tipo: 'loja',
    perfil: 'Loja de Peças',
    icone: 'store',
    membroDesde: 'março de 2026',
    bio: 'Loja de peças agrícolas no centro de Tangará da Serra. Trabalhamos com John Deere, Massey, Valtra e New Holland. Entregamos na região.',
    whatsapp: '5565999999999',
    verificado: true,
    endereco: {
      origem: 'cep',
      cep: '78300-000',
      logradouro: 'Av. Brasil',
      numero: '1420',
      bairro: 'Centro',
      cidade: 'Tangará da Serra',
      uf: 'MT',
      lat: -14.6229,
      lng: -57.4933,
      aproximado: false,
    },
    horario: [
      { dia: 'Segunda a sexta', hora: '07h30 às 18h' },
      { dia: 'Sábado', hora: '07h30 às 12h' },
      { dia: 'Domingo', hora: 'Fechado' },
    ],
    marcas: ['John Deere', 'Massey Ferguson', 'Valtra', 'New Holland', 'Case IH'],
    entrega: 'Entrega em Tangará da Serra e região em até 24h.',
  },
  'AgroDiesel Sorriso': {
    tipo: 'loja',
    perfil: 'Loja de Peças',
    icone: 'store',
    membroDesde: 'janeiro de 2026',
    bio: 'Especializada em sistemas de injeção e peças de motor para maquinário pesado.',
    whatsapp: '5566999999999',
    verificado: true,
    endereco: {
      origem: 'municipio',
      cidade: 'Sorriso',
      uf: 'MT',
      lat: -12.5453,
      lng: -55.7211,
      aproximado: true,
    },
    horario: [
      { dia: 'Segunda a sexta', hora: '08h às 18h' },
      { dia: 'Sábado', hora: '08h às 12h' },
    ],
    marcas: ['Bosch', 'Delphi', 'Cummins', 'John Deere'],
  },
  'Oficina do Zé': {
    tipo: 'prestador',
    perfil: 'Prestador de Serviços',
    icone: 'wrench',
    membroDesde: 'fevereiro de 2026',
    bio: 'Mecânica agrícola com atendimento na propriedade. Mais de 20 anos consertando trator no campo.',
    whatsapp: '5565988888888',
    servicos: ['Mecânica agrícola', 'Hidráulica', 'Elétrica', 'Manutenção preventiva'],
    atendeNoCampo: true,
    areaAtendimento: ['Campo Novo do Parecis', 'Sapezal', 'Tangará da Serra', 'Diamantino'],
    endereco: {
      origem: 'municipio',
      cidade: 'Campo Novo do Parecis',
      uf: 'MT',
      lat: -13.6752,
      lng: -57.8917,
      aproximado: true,
    },
  },
  'Metalúrgica Serra': {
    tipo: 'prestador',
    perfil: 'Prestador de Serviços',
    icone: 'wrench',
    membroDesde: 'abril de 2026',
    bio: 'Solda, recuperação e fabricação de implementos agrícolas sob medida.',
    whatsapp: '5565977777777',
    servicos: ['Solda', 'Funilaria', 'Fabricação sob medida'],
    atendeNoCampo: false,
    areaAtendimento: ['Tangará da Serra', 'Barra do Bugres'],
    endereco: {
      origem: 'municipio',
      cidade: 'Tangará da Serra',
      uf: 'MT',
      lat: -14.6229,
      lng: -57.4933,
      aproximado: true,
    },
  },
  'Fazenda Santa Luzia': {
    tipo: 'produtor',
    perfil: 'Produtor Rural',
    icone: 'tractor',
    membroDesde: 'maio de 2026',
    bio: 'Produtor de soja e milho em Barra do Bugres. Anuncio peças que sobram das nossas máquinas e procuro o que falta.',
    whatsapp: '5565966666666',
    propriedade: 'Fazenda Santa Luzia',
    culturas: ['Soja', 'Milho'],
    maquinario: ['John Deere 6110J', 'Massey Ferguson 275', 'Colhedora New Holland'],
    endereco: {
      origem: 'municipio',
      cidade: 'Barra do Bugres',
      uf: 'MT',
      lat: -15.0725,
      lng: -57.1811,
      aproximado: true,
    },
  },
};

const PERFIL_PADRAO = {
  tipo: 'produtor',
  perfil: 'Anunciante',
  icone: 'tractor',
  membroDesde: 'este ano',
  bio: 'Anunciante da AgroPeças MT.',
  whatsapp: '5565999999999',
};

export function getAnunciante(slug) {
  const anuncio = ANUNCIOS.find((item) => slugify(item.autor) === slug);
  if (!anuncio) return null;

  const base = PERFIS[anuncio.autor] || PERFIL_PADRAO;
  const anuncios = ANUNCIOS.filter((item) => item.autor === anuncio.autor);

  return {
    ...base,
    nome: anuncio.autor,
    slug,
    iniciais: iniciais(anuncio.autor),
    cidade: anuncio.cidade,
    uf: anuncio.uf,
    anuncios,
  };
}

export function getRelacionados(anuncio, limite = 3) {
  if (!anuncio) return [];
  const mesmaCategoria = ANUNCIOS.filter(
    (item) => item.id !== anuncio.id && item.categoria === anuncio.categoria
  );
  const restante = ANUNCIOS.filter(
    (item) => item.id !== anuncio.id && item.categoria !== anuncio.categoria
  );
  return [...mesmaCategoria, ...restante].slice(0, limite);
}

export const CATEGORIAS = [
  { id: 'todas', label: 'Todas', icone: 'grid' },
  { id: 'correia', label: 'Correias', icone: 'belt' },
  { id: 'rolamento', label: 'Rolamentos', icone: 'bearing' },
  { id: 'filtro', label: 'Filtros', icone: 'filter' },
  { id: 'bomba', label: 'Bombas', icone: 'pump' },
  { id: 'cruzeta', label: 'Cruzetas', icone: 'cross' },
  { id: 'servico', label: 'Serviços', icone: 'wrench' },
];

export const ANUNCIOS = [
  {
    id: 'correia-john-deere-6110',
    precoNumero: 320,
    dias: 0,
    tipo: 'peca',
    categoria: 'correia',
    icone: 'belt',
    titulo: 'Correia do alternador John Deere 6110J',
    preco: 'R$ 320,00',
    condicao: 'Nova',
    cidade: 'Tangará da Serra',
    uf: 'MT',
    autor: 'Peças Tangará',
    perfilIcone: 'store',
    perfil: 'Loja de Peças',
    quando: 'há 2 horas',
    descricao:
      'Correia do alternador original, na embalagem lacrada. Serve nos modelos 6110J, 6110E e 6115J. Temos duas unidades em estoque. Entregamos na região ou o cliente retira na loja, no centro de Tangará da Serra.',
    ficha: [
      { rotulo: 'Marca', valor: 'John Deere' },
      { rotulo: 'Modelo da máquina', valor: '6110J / 6110E / 6115J' },
      { rotulo: 'Código da peça', valor: 'AL120234' },
      { rotulo: 'Quantidade', valor: '2 unidades' },
      { rotulo: 'Entrega', valor: 'Retirada ou entrega na região' },
    ],
    whatsapp: '5565999999999',
    membroDesde: 'março de 2026',
    local: {
      origem: 'cep',
      cep: '78300-000',
      logradouro: 'Av. Brasil',
      numero: '1420',
      bairro: 'Centro',
      cidade: 'Tangará da Serra',
      uf: 'MT',
      lat: -14.6229,
      lng: -57.4933,
      aproximado: false,
    },
  },
  {
    id: 'rolamento-colhedora',
    precoNumero: 890,
    dias: 0,
    tipo: 'peca',
    categoria: 'rolamento',
    icone: 'bearing',
    titulo: 'Rolamento do eixo traseiro para colhedora',
    preco: 'R$ 890,00',
    condicao: 'Novo',
    cidade: 'Sorriso',
    uf: 'MT',
    autor: 'AgroDiesel Sorriso',
    perfilIcone: 'store',
    quando: 'há 5 horas',
  },
  {
    id: 'mecanica-campo',
    precoNumero: null,
    dias: 1,
    tipo: 'servico',
    categoria: 'servico',
    icone: 'wrench',
    titulo: 'Mecânica agrícola com atendimento na propriedade',
    preco: null,
    cidade: 'Campo Novo do Parecis',
    uf: 'MT',
    autor: 'Oficina do Zé',
    perfilIcone: 'wrench',
    quando: 'há 1 dia',
  },
  {
    id: 'bomba-hidraulica-massey',
    precoNumero: 2450,
    dias: 1,
    tipo: 'peca',
    categoria: 'bomba',
    icone: 'pump',
    titulo: 'Bomba hidráulica Massey Ferguson 275 revisada',
    preco: 'R$ 2.450,00',
    condicao: 'Usada',
    cidade: 'Barra do Bugres',
    uf: 'MT',
    autor: 'Fazenda Santa Luzia',
    perfilIcone: 'tractor',
    quando: 'há 1 dia',
  },
  {
    id: 'filtro-combustivel-lote',
    precoNumero: 540,
    dias: 2,
    tipo: 'peca',
    categoria: 'filtro',
    icone: 'filter',
    titulo: 'Lote com 12 filtros de combustível diversos',
    preco: 'R$ 540,00',
    condicao: 'Novos',
    cidade: 'Nova Mutum',
    uf: 'MT',
    autor: 'Mutum Peças',
    perfilIcone: 'store',
    quando: 'há 2 dias',
  },
  {
    id: 'cruzeta-cardan',
    precoNumero: null,
    dias: 3,
    tipo: 'peca',
    categoria: 'cruzeta',
    icone: 'cross',
    titulo: 'Cruzeta de cardan para implemento — troca por correia',
    preco: null,
    condicao: 'Usada',
    cidade: 'Diamantino',
    uf: 'MT',
    autor: 'Sítio Boa Vista',
    perfilIcone: 'tractor',
    quando: 'há 3 dias',
  },
  {
    id: 'solda-implementos',
    precoNumero: null,
    dias: 3,
    tipo: 'servico',
    categoria: 'servico',
    icone: 'wrench',
    titulo: 'Solda e recuperação de implementos agrícolas',
    preco: null,
    cidade: 'Tangará da Serra',
    uf: 'MT',
    autor: 'Metalúrgica Serra',
    perfilIcone: 'wrench',
    quando: 'há 3 dias',
  },
  {
    id: 'correia-trator-valtra',
    precoNumero: 210,
    dias: 4,
    tipo: 'peca',
    categoria: 'correia',
    icone: 'belt',
    titulo: 'Correia dentada Valtra BM 125 — sobra de estoque',
    preco: 'R$ 210,00',
    condicao: 'Nova',
    cidade: 'Lucas do Rio Verde',
    uf: 'MT',
    autor: 'Fazenda Três Irmãos',
    perfilIcone: 'tractor',
    quando: 'há 4 dias',
  },
  {
    id: 'rolamento-roda-dianteira',
    precoNumero: 465,
    dias: 5,
    tipo: 'peca',
    categoria: 'rolamento',
    icone: 'bearing',
    titulo: 'Rolamento de roda dianteira New Holland TL 75',
    preco: 'R$ 465,00',
    condicao: 'Novo',
    cidade: 'Sinop',
    uf: 'MT',
    autor: 'Sinop Agropeças',
    perfilIcone: 'store',
    quando: 'há 5 dias',
  },
];
