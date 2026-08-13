/**
 * ⚠️ PROVISÓRIO — configurações gerais da plataforma, sem API.
 *
 * O coração desta tela é a **aprovação prévia**. Por padrão o sistema funciona
 * sozinho: quem se cadastra já entra, quem anuncia já vai ao ar. Ligando a
 * chave, tudo daquele tipo passa a esperar aprovação no painel.
 *
 * Uma regra atravessa todas elas: **vale do momento em que é ligada para
 * frente**. Quem já estava dentro continua dentro. Aplicar para trás
 * derrubaria mil e duzentos cadastros e três mil anúncios de uma vez — a
 * plataforma inteira sairia do ar por causa de um clique, e o trabalho de
 * revisar isso não caberia em ninguém.
 *
 * Cada chave carrega quem ligou e quando, porque é uma decisão que muda o
 * funcionamento do produto para todo mundo: sem autor e data, ninguém sabe se
 * a fila de aprovação de hoje é a política em vigor ou um teste esquecido.
 */

export const PORTOES = [
  {
    id: 'usuarios',
    rotulo: 'Cadastro de usuários',
    icone: 'user',
    descricao: 'Quem se cadastrar precisa da sua aprovação para usar a plataforma.',
    /* o que a pessoa pode fazer enquanto espera. Sem isso a fila vira reclamação
       no suporte: "me cadastrei e não consigo nada" */
    enquantoEspera: 'Consegue entrar e ver anúncios, mas não anunciar nem conversar.',
    fila: '/admin/usuarios?filtro=aguardando',
    aguardando: 0,
  },
  {
    id: 'anuncios',
    rotulo: 'Anúncios de peças',
    icone: 'gear',
    descricao: 'Todo anúncio de peça novo vai para a fila de moderação antes de ir ao ar.',
    enquantoEspera: 'O anúncio fica salvo como “em análise” e só o dono enxerga.',
    fila: '/admin/moderacao',
    aguardando: 3,
  },
  {
    id: 'servicos',
    rotulo: 'Anúncios de serviços',
    icone: 'wrench',
    descricao: 'Serviços novos passam pela sua aprovação antes de aparecer na busca.',
    enquantoEspera: 'O serviço fica salvo como “em análise” e só o dono enxerga.',
    fila: '/admin/moderacao',
    aguardando: 1,
  },
  {
    id: 'maquinas',
    rotulo: 'Anúncios de máquinas',
    icone: 'tractor',
    descricao: 'Máquinas e implementos passam pela sua aprovação.',
    /* costuma vir ligado: é onde o valor por anúncio é maior e o golpe
       compensa mais */
    enquantoEspera: 'A máquina fica salva como “em análise” e só o dono enxerga.',
    fila: '/admin/moderacao',
    aguardando: 0,
  },
  {
    id: 'fotos',
    rotulo: 'Fotos enviadas',
    icone: 'image',
    descricao: 'Cada foto nova é conferida antes de aparecer no anúncio.',
    enquantoEspera: 'O anúncio vai ao ar com as fotos já aprovadas; as novas ficam ocultas.',
    fila: '/admin/moderacao',
    aguardando: 0,
  },
  {
    id: 'perfis',
    rotulo: 'Selo de verificação',
    icone: 'check',
    descricao: 'O selo de perfil verificado só é concedido por você, nunca automaticamente.',
    enquantoEspera: 'O perfil funciona normalmente, apenas sem o selo.',
    fila: '/admin/usuarios?filtro=nao-verificados',
    aguardando: 4,
  },
];

/**
 * As demais configurações gerais.
 *
 * Agrupadas por assunto e não numa lista só: "dias até expirar" e "tamanho
 * máximo de foto" não têm nada em comum além de serem números, e misturá-las
 * obriga a ler tudo para achar uma.
 */
export const GRUPOS_CONFIG = [
  {
    id: 'anuncios',
    titulo: 'Anúncios',
    icone: 'grid',
    campos: [
      {
        chave: 'diasExpiracao',
        rotulo: 'Dias até o anúncio expirar',
        tipo: 'numero',
        dica: 'Depois disso ele sai do ar e o dono precisa renovar',
      },
      {
        chave: 'avisoExpiracao',
        rotulo: 'Avisar quantos dias antes de expirar',
        tipo: 'numero',
        dica: 'O aviso é o que evita o anúncio cair sem ninguém perceber',
      },
      {
        chave: 'maxFotos',
        rotulo: 'Máximo de fotos por anúncio',
        tipo: 'numero',
      },
      {
        chave: 'limiteGratuito',
        rotulo: 'Anúncios ativos no plano gratuito',
        tipo: 'numero',
        dica: 'Zero significa sem limite',
      },
    ],
  },
  {
    id: 'contato',
    titulo: 'Contato e conversas',
    icone: 'mail',
    campos: [
      {
        chave: 'contatoSoLogado',
        rotulo: 'Só mostrar telefone para quem está logado',
        tipo: 'chave',
        dica: 'É o que impede o número virar lista de disparo',
      },
      {
        chave: 'chatAtivo',
        rotulo: 'Chat interno ativo',
        tipo: 'chave',
        dica: 'Desligado, o contato acontece só por WhatsApp e telefone',
      },
      {
        chave: 'exigirTelefoneVerificado',
        rotulo: 'Exigir telefone verificado para anunciar',
        tipo: 'chave',
        dica: 'Reduz conta descartável, mas atrasa o primeiro anúncio',
      },
    ],
  },
  {
    id: 'cadastro',
    titulo: 'Cadastro',
    icone: 'user',
    campos: [
      {
        chave: 'exigirDocumento',
        rotulo: 'Exigir CPF ou CNPJ no cadastro',
        tipo: 'chave',
      },
      {
        chave: 'exigirEmailConfirmado',
        rotulo: 'Exigir e-mail confirmado para anunciar',
        tipo: 'chave',
        dica: 'Sem isso não há como recuperar a conta depois',
      },
      {
        chave: 'permitirNovosCadastros',
        rotulo: 'Aceitar novos cadastros',
        tipo: 'chave',
        dica: 'Desligar fecha a porta de entrada da plataforma',
        grave: true,
      },
    ],
  },
];

export const dadosDaPlataforma = () => ({
  /* nenhum portão ligado por padrão: o sistema funciona sozinho, e a
     aprovação prévia é a exceção que a Aline liga quando precisa */
  portoes: {
    usuarios: false,
    anuncios: false,
    servicos: false,
    maquinas: true,
    fotos: false,
    perfis: true,
  },

  ligadoEm: {
    maquinas: { quem: 'Aline', quando: 'há 2 semanas' },
    perfis: { quem: 'Aline', quando: 'há 3 meses' },
  },

  diasExpiracao: '60',
  avisoExpiracao: '7',
  maxFotos: '8',
  limiteGratuito: '5',

  contatoSoLogado: true,
  chatAtivo: true,
  exigirTelefoneVerificado: false,

  exigirDocumento: true,
  exigirEmailConfirmado: true,
  permitirNovosCadastros: true,

  /* modo manutenção fica à parte de tudo: é a única chave que derruba o site
     inteiro, e ela não pode dividir espaço com "máximo de fotos" */
  manutencao: false,
  avisoManutencao: 'Estamos em manutenção programada. Voltamos em instantes.',
});

/** histórico — quem mudou o quê, e quando */
export const historicoConfig = () => [
  { id: 'h1', chave: 'Anúncios de máquinas', de: 'automático', para: 'aprovação prévia', quem: 'Aline', quando: 'há 2 semanas' },
  { id: 'h2', chave: 'Dias até expirar', de: '45', para: '60', quem: 'Aline', quando: 'há 1 mês' },
  { id: 'h3', chave: 'Máximo de fotos', de: '6', para: '8', quem: 'Aline', quando: 'há 2 meses' },
  { id: 'h4', chave: 'Selo de verificação', de: 'automático', para: 'aprovação prévia', quem: 'Aline', quando: 'há 3 meses' },
];
