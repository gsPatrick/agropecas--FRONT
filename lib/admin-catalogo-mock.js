/**
 * ⚠️ PROVISÓRIO — catálogo da plataforma, sem API.
 *
 * Aqui está o **vocabulário fechado** que as telas do produto usam: categorias
 * de anúncio, marcas, culturas, tipos de máquina, serviços prestados, formas de
 * entrega e raios de atendimento.
 *
 * Hoje essas listas vivem espalhadas em `lib/exclusivas-mock.js`,
 * `lib/anuncio-form.js` e `lib/anuncios.js`, escritas à mão no código do
 * front. Isso é dívida, não desenho: significa que **acrescentar uma marca
 * exige um deploy** e que a Aline depende de programador para uma decisão de
 * produto que é dela.
 *
 * Por que precisa ser fechado, e não campo livre: a busca depende disso. Em
 * texto solto, “retífica de cabeçote” e “retificar cabecote” viram dois
 * serviços diferentes, e nenhum aparece na busca do outro — o prestador some
 * do resultado achando que está cadastrado.
 *
 * Cada coleção diz **onde é usada**. É o que impede alguém apagar “Pulverizador”
 * sem perceber que quinze produtores têm um cadastrado.
 */

export const COLECOES = [
  {
    id: 'categorias-peca',
    rotulo: 'Categorias de peça',
    icone: 'gear',
    onde: 'Cadastro de anúncio de peça · filtros da busca',
    /* trocar o nome de uma categoria não quebra nada; apagar tira o anúncio
       de qualquer resultado filtrado por ela */
    aviso: 'Apagar uma categoria deixa os anúncios dela sem classificação.',
  },
  {
    id: 'categorias-servico',
    rotulo: 'Categorias de serviço',
    icone: 'wrench',
    onde: 'Cadastro de anúncio de serviço · filtros da busca',
    aviso: 'Apagar uma categoria deixa os anúncios dela sem classificação.',
  },
  {
    id: 'marcas',
    rotulo: 'Marcas',
    icone: 'store',
    onde: 'Cadastro de anúncio · maquinário do produtor · filtros da busca',
    aviso: 'É a lista que aparece ao cadastrar peça e máquina.',
  },
  {
    id: 'servicos',
    rotulo: 'Serviços prestados',
    icone: 'wrench',
    onde: 'Tela “Meus serviços”, do prestador',
    aviso: 'Só o que está aqui pode ser selecionado — e só isso entra na busca por serviço.',
  },
  {
    id: 'culturas',
    rotulo: 'Culturas',
    icone: 'leaf',
    onde: 'Tela “Minha propriedade”, do produtor',
    aviso: 'Define o que o produtor pode marcar como produção.',
  },
  {
    id: 'tipos-maquina',
    rotulo: 'Tipos de máquina',
    icone: 'tractor',
    onde: 'Maquinário do produtor · anúncio de máquina',
    aviso: 'É o que liga o maquinário cadastrado às peças compatíveis.',
  },
  {
    id: 'entregas',
    rotulo: 'Formas de entrega',
    icone: 'pump',
    onde: 'Tela “Atendimento”, da loja',
    aviso: 'Aparece no perfil público da loja.',
  },
  {
    id: 'raios',
    rotulo: 'Raios de atendimento',
    icone: 'pin',
    onde: 'Tela “Meus serviços”, do prestador',
    aviso: 'Define até onde o prestador aparece na busca por proximidade.',
  },
];

/* `usos` é quantas contas ou anúncios dependem do item — é o número que decide
   se dá para apagar ou se o certo é desativar */
const item = (id, nome, usos, ativo = true, grupo = null) => ({ id, nome, usos, ativo, grupo });

export const catalogoInicial = () => ({
  'categorias-peca': [
    item('c1', 'Motor', 412),
    item('c2', 'Hidráulica', 388),
    item('c3', 'Transmissão', 265),
    item('c4', 'Elétrica', 214),
    item('c5', 'Rodado e pneus', 190),
    item('c6', 'Filtros e lubrificantes', 176),
    item('c7', 'Implementos', 143),
    item('c8', 'Cabine e acessórios', 61),
    item('c9', 'Refrigeração', 0, false),
  ],

  'categorias-servico': [
    item('s1', 'Mecânica', 122),
    item('s2', 'Hidráulica', 98),
    item('s3', 'Elétrica', 76),
    item('s4', 'Solda e usinagem', 54),
    item('s5', 'Pulverização e plantio', 47),
    item('s6', 'Transporte', 12),
  ],

  marcas: [
    item('m1', 'John Deere', 507),
    item('m2', 'Valtra', 341),
    item('m3', 'Massey Ferguson', 298),
    item('m4', 'New Holland', 276),
    item('m5', 'Case IH', 241),
    item('m6', 'Jacto', 128),
    item('m7', 'Stara', 96),
    item('m8', 'Agrale', 44),
    item('m9', 'Outra', 210),
  ],

  servicos: [
    item('v1', 'Retífica de motor', 31, true, 'Mecânica'),
    item('v2', 'Retífica de cabeçote', 27, true, 'Mecânica'),
    item('v3', 'Reparo de transmissão', 19, true, 'Mecânica'),
    item('v4', 'Revisão preventiva', 44, true, 'Mecânica'),
    item('v5', 'Reparo de bomba hidráulica', 36, true, 'Hidráulica'),
    item('v6', 'Troca de mangueiras', 28, true, 'Hidráulica'),
    item('v7', 'Sistema elétrico 12V/24V', 22, true, 'Elétrica'),
    item('v8', 'Instalação de piloto automático', 9, true, 'Elétrica'),
    item('v9', 'Solda de chassi', 17, true, 'Solda e usinagem'),
    item('v10', 'Usinagem de pinos e buchas', 11, true, 'Solda e usinagem'),
    item('v11', 'Regulagem de bicos', 25, true, 'Pulverização e plantio'),
    item('v12', 'Aferição de vazão', 8, true, 'Pulverização e plantio'),
  ],

  culturas: [
    item('t1', 'Soja', 640),
    item('t2', 'Milho', 588),
    item('t3', 'Milho safrinha', 402),
    item('t4', 'Algodão', 233),
    item('t5', 'Feijão', 88),
    item('t6', 'Gado de corte', 176),
    item('t7', 'Gado de leite', 54),
    item('t8', 'Sorgo', 31),
    item('t9', 'Girassol', 12, false),
  ],

  'tipos-maquina': [
    item('q1', 'Trator', 512),
    item('q2', 'Colheitadeira', 288),
    item('q3', 'Pulverizador', 196),
    item('q4', 'Plantadeira', 174),
    item('q5', 'Implemento', 143),
    item('q6', 'Caminhão', 67),
  ],

  entregas: [
    item('e1', 'Retirada na loja', 96),
    item('e2', 'Entrega na região', 71),
    item('e3', 'Envio por transportadora', 48),
    item('e4', 'Entrega na propriedade', 33),
  ],

  raios: [
    item('r1', '50 km', 24),
    item('r2', '100 km', 41),
    item('r3', '200 km', 36),
    item('r4', '300 km', 12),
    item('r5', 'Todo o estado', 19),
  ],
});

/* ─────────────────────────────────────────────────────────
   COMUNICADOS
   ───────────────────────────────────────────────────────── */

export const PUBLICOS = [
  { id: 'todos', rotulo: 'Todo mundo' },
  { id: 'produtor', rotulo: 'Só produtores' },
  { id: 'loja', rotulo: 'Só lojas' },
  { id: 'prestador', rotulo: 'Só prestadores' },
];

export const CANAIS_COMUNICADO = [
  { id: 'painel', rotulo: 'Aviso no painel', icone: 'bell' },
  { id: 'email', rotulo: 'E-mail', icone: 'mail' },
  { id: 'faixa', rotulo: 'Faixa no topo do site', icone: 'grid' },
];

export const comunicadosAdmin = () => [
  {
    id: 'k1',
    titulo: 'Manutenção programada no domingo',
    texto:
      'O site ficará fora do ar entre 2h e 5h de domingo para atualização. Anúncios e conversas não são afetados.',
    publico: 'todos',
    canais: ['painel', 'faixa'],
    situacao: 'agendado',
    quando: 'domingo, 03h',
    alcance: 1284,
  },
  {
    id: 'k2',
    titulo: 'Nova aba de serviços para prestadores',
    texto:
      'Agora dá para selecionar os serviços que você presta e definir o raio de atendimento. Quem preenche aparece primeiro na busca por proximidade.',
    publico: 'prestador',
    canais: ['painel', 'email'],
    situacao: 'enviado',
    quando: 'há 4 dias',
    alcance: 214,
    abertura: 68,
  },
  {
    id: 'k3',
    titulo: 'Cuidado com pedidos de adiantamento',
    texto:
      'Nunca faça PIX antes de ver a peça. Negocie pelo chat da plataforma — conversas fora dele não podem ser verificadas em caso de golpe.',
    publico: 'todos',
    canais: ['painel', 'email', 'faixa'],
    situacao: 'enviado',
    quando: 'há 2 semanas',
    alcance: 1198,
    abertura: 74,
  },
  {
    id: 'k4',
    titulo: 'Horário de atendimento no perfil da loja',
    texto: 'Preencha os horários para aparecer como “aberto agora” na busca.',
    publico: 'loja',
    canais: ['painel'],
    situacao: 'rascunho',
    quando: 'salvo há 1 dia',
    alcance: 0,
  },
];

/* ─────────────────────────────────────────────────────────
   LGPD
   ───────────────────────────────────────────────────────── */

export const TIPOS_PEDIDO = {
  acesso: { rotulo: 'Acesso aos dados', prazo: 15 },
  exclusao: { rotulo: 'Exclusão da conta', prazo: 15 },
  correcao: { rotulo: 'Correção de dados', prazo: 15 },
  portabilidade: { rotulo: 'Portabilidade', prazo: 15 },
};

export const solicitacoesLgpd = () => [
  {
    id: 'g1',
    tipo: 'exclusao',
    pessoa: { id: 'u6', nome: 'Joana Ribeiro', iniciais: 'JR' },
    pedidoEm: 'há 11 dias',
    /* o prazo legal é o que ordena a fila: pedido de LGPD sem resposta em 15
       dias é infração, e a tela precisa mostrar isso antes de acontecer */
    diasRestantes: 4,
    situacao: 'aberta',
    texto: 'Quero apagar minha conta e todos os meus dados da plataforma.',
  },
  {
    id: 'g2',
    tipo: 'acesso',
    pessoa: { id: 'u2', nome: 'Agropeças Sinop', iniciais: 'AS' },
    pedidoEm: 'há 3 dias',
    diasRestantes: 12,
    situacao: 'aberta',
    texto: 'Solicito cópia de todos os dados que vocês guardam sobre a empresa.',
  },
  {
    id: 'g3',
    tipo: 'correcao',
    pessoa: { id: 'u9', nome: 'Elton Marques', iniciais: 'EM' },
    pedidoEm: 'há 1 mês',
    diasRestantes: 0,
    situacao: 'respondida',
    texto: 'Meu CPF está com um dígito errado no cadastro.',
    resposta: 'Documento corrigido após conferência. Respondido em 2 dias.',
  },
];

export const documentosLegais = () => [
  {
    id: 'd1',
    nome: 'Termos de Uso',
    versao: '1.3',
    vigenteDesde: 'há 3 meses',
    aceites: 1198,
    pendentes: 86,
  },
  {
    id: 'd2',
    nome: 'Política de Privacidade',
    versao: '1.1',
    vigenteDesde: 'há 6 meses',
    aceites: 1240,
    pendentes: 44,
  },
  {
    id: 'd3',
    nome: 'Política de Cookies',
    versao: '1.0',
    vigenteDesde: 'há 8 meses',
    aceites: 1284,
    pendentes: 0,
  },
];

/* ─────────────────────────────────────────────────────────
   AUDITORIA
   ───────────────────────────────────────────────────────── */

export const TIPOS_REGISTRO = [
  { id: 'todos', rotulo: 'Tudo' },
  { id: 'sancao', rotulo: 'Sanções' },
  { id: 'conteudo', rotulo: 'Conteúdo' },
  { id: 'acesso', rotulo: 'Acesso a dados' },
  { id: 'config', rotulo: 'Configurações' },
];

/**
 * O registro de tudo que a administração fez.
 *
 * `acesso` tem peso próprio: é a leitura de dado pessoal — conversa, documento,
 * telefone. Registrar isso é exigência da LGPD e é o que transforma "a Aline
 * pode ler as conversas" de risco em poder auditável.
 */
export const registrosAuditoria = () => [
  { id: 'a1', tipo: 'sancao', quem: 'Aline', acao: 'Suspendeu a conta', alvo: 'Marcos Vinícius', motivo: 'Anúncios repetidos com preço divergente', quando: 'há 1 h', ip: '177.**.**.14' },
  { id: 'a2', tipo: 'acesso', quem: 'Aline', acao: 'Leu conversa', alvo: 'Carlos Menezes e Agropeças Sinop', motivo: 'Apuração de denúncia de golpe', quando: 'há 2 h', ip: '177.**.**.14' },
  { id: 'a3', tipo: 'conteudo', quem: 'Aline', acao: 'Ocultou anúncio', alvo: 'Peça importada — entrega imediata', motivo: 'Preço enganoso confirmado', quando: 'há 3 h', ip: '177.**.**.14' },
  { id: 'a4', tipo: 'config', quem: 'Aline', acao: 'Ligou aprovação prévia', alvo: 'Anúncios de máquinas', motivo: 'Aumento de tentativas de golpe em máquinas', quando: 'há 2 semanas', ip: '177.**.**.14' },
  { id: 'a5', tipo: 'conteudo', quem: 'Sistema', acao: 'Expirou anúncios', alvo: '14 anúncios', motivo: 'Prazo de 60 dias atingido', quando: 'há 3 h', ip: '—' },
  { id: 'a6', tipo: 'acesso', quem: 'Aline', acao: 'Exportou dados de usuário', alvo: 'Joana Ribeiro', motivo: 'Pedido de acesso via LGPD', quando: 'ontem', ip: '177.**.**.14' },
  { id: 'a7', tipo: 'sancao', quem: 'Aline', acao: 'Baniu a conta', alvo: 'Fazenda Boa Vista', motivo: 'Tentativa de golpe confirmada em duas denúncias', quando: 'há 2 dias', ip: '177.**.**.14' },
  { id: 'a8', tipo: 'conteudo', quem: 'Aline', acao: 'Apagou mensagem', alvo: 'conversa sobre “Bico injetor”', motivo: 'Telefone para negociar fora da plataforma', quando: 'há 3 dias', ip: '177.**.**.14' },
  { id: 'a9', tipo: 'config', quem: 'Aline', acao: 'Alterou dias até expirar', alvo: '45 → 60', motivo: 'Anúncios caindo antes da safra', quando: 'há 1 mês', ip: '177.**.**.14' },
  { id: 'a10', tipo: 'acesso', quem: 'Aline', acao: 'Abriu documento de cadastro', alvo: 'Rondon Máquinas Agrícolas', motivo: 'Conferência para aprovar cadastro', quando: 'há 5 min', ip: '177.**.**.14' },
];
