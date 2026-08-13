/**
 * ⚠️ PROVISÓRIO — dados do painel administrativo, sem API.
 *
 * Derivado de listas fixas e do índice, nunca sorteado: com `Math.random` a
 * tela mudaria a cada render e não daria para conferir uma ação contra o que
 * estava escrito antes dela.
 *
 * O vocabulário segue o do backend (`src/features/admin`) — status, motivos de
 * denúncia, tipos de sanção. Inventar nomes diferentes aqui obrigaria a uma
 * tradução no meio do caminho, que é onde os erros se escondem.
 */

/* ─────────────────────────────────────────────────────────
   VOCABULÁRIO
   ───────────────────────────────────────────────────────── */

export const SITUACAO_USUARIO = {
  /* aguardando existe por causa da aprovação prévia (ver
     `/admin/configuracoes`): com a chave ligada, quem se cadastra entra aqui
     em vez de ir direto para "ativo" */
  aguardando: { rotulo: 'Aguardando aprovação', tom: 'info' },
  ativo: { rotulo: 'Ativo', tom: 'ok' },
  suspenso: { rotulo: 'Suspenso', tom: 'alerta' },
  banido: { rotulo: 'Banido', tom: 'perigo' },
  inativo: { rotulo: 'Desativado', tom: 'neutro' },
  recusado: { rotulo: 'Cadastro recusado', tom: 'perigo' },
};

export const SITUACAO_ANUNCIO = {
  publicado: { rotulo: 'No ar', tom: 'ok' },
  em_analise: { rotulo: 'Em análise', tom: 'alerta' },
  reprovado: { rotulo: 'Reprovado', tom: 'perigo' },
  oculto: { rotulo: 'Oculto', tom: 'neutro' },
  pausado: { rotulo: 'Pausado', tom: 'neutro' },
  expirado: { rotulo: 'Expirado', tom: 'neutro' },
};

export const MOTIVOS_DENUNCIA = {
  golpe: 'Suspeita de golpe',
  preco: 'Preço enganoso',
  duplicado: 'Anúncio duplicado',
  ofensivo: 'Conteúdo ofensivo',
  errado: 'Categoria errada',
  contato: 'Dado de contato indevido',
};

export const TIPOS_PERFIL = {
  produtor: 'Produtor Rural',
  loja: 'Loja de Peças',
  prestador: 'Prestador de Serviços',
};

/* ─────────────────────────────────────────────────────────
   PESSOAS
   ───────────────────────────────────────────────────────── */

const NOMES = [
  ['Carlos Menezes', 'produtor', 'Nova Mutum'],
  ['Agropeças Sinop', 'loja', 'Sinop'],
  ['Marcos Vinícius', 'prestador', 'Sorriso'],
  ['Fazenda Boa Vista', 'produtor', 'Lucas do Rio Verde'],
  ['Mecânica Três Irmãos', 'prestador', 'Diamantino'],
  ['Joana Ribeiro', 'produtor', 'Campo Novo do Parecis'],
  ['Tratorpeças Rondonópolis', 'loja', 'Rondonópolis'],
  ['Sítio Santa Helena', 'produtor', 'Tangará da Serra'],
  ['Elton Marques', 'prestador', 'Primavera do Leste'],
  ['Agro Nova Era', 'loja', 'Sapezal'],
  ['Fazenda Céu Azul', 'produtor', 'Querência'],
  ['Oficina do Zé', 'prestador', 'Barra do Garças'],
  ['Peças & Cia', 'loja', 'Várzea Grande'],
  ['Fazenda Três Lagoas', 'produtor', 'Canarana'],
  ['Diesel Center', 'prestador', 'Cuiabá'],
  ['Rural Máquinas', 'loja', 'Nova Xavantina'],
  ['Adriana Pauli', 'produtor', 'Campo Verde'],
  ['Hidráulica MT', 'prestador', 'Alta Floresta'],
];

/**
 * Cadastros novos, esperando aprovação.
 *
 * Ficam numa lista à parte da base porque são outra coisa: não têm anúncio,
 * não têm histórico e o que importa neles é o que dá para conferir antes de
 * deixar entrar — documento, telefone, de onde vieram.
 */
const AGUARDANDO = [
  ['Rondon Máquinas Agrícolas', 'loja', 'Rondonópolis', 'CNPJ conferido na Receita'],
  ['Fazenda Alvorada', 'produtor', 'Sinop', 'Cadastro completo'],
  ['Willian Torres', 'prestador', 'Cuiabá', 'Sem telefone verificado'],
  ['Agro Sul Peças', 'loja', 'Rondonópolis', 'Mesmo IP de conta banida'],
  ['Sítio Bela Vista', 'produtor', 'Nova Mutum', 'Cadastro completo'],
];

const iniciais = (nome) =>
  nome.split(' ').slice(0, 2).map((parte) => parte[0]).join('');

const QUANDO = [
  'há 5 min', 'há 40 min', 'há 2 h', 'há 6 h', 'ontem',
  'há 2 dias', 'há 4 dias', 'há 1 semana', 'há 2 semanas', 'há 1 mês',
];

/**
 * A base de usuários.
 *
 * As situações não são distribuídas por acaso: a lista precisa conter
 * suspenso, banido e inativo em quantidade suficiente para os filtros terem o
 * que filtrar — com um só de cada, não dá para conferir se a tela agrupa.
 */
export function usuariosAdmin() {
  const pendentes = AGUARDANDO.map(([nome, tipo, cidade, nota], indice) => ({
    id: `p${indice + 1}`,
    nome,
    iniciais: iniciais(nome),
    tipo,
    cidade: `${cidade} · MT`,
    email: `${nome.toLowerCase().replace(/[^a-z]+/g, '.')}@exemplo.com.br`,
    telefone: `(65) 9${9100 + indice * 41}-${2000 + indice * 17}`.slice(0, 15),
    documento: tipo === 'loja' ? '**.***.***/0001-**' : '***.***.***-**',
    situacao: 'aguardando',
    verificado: false,
    anuncios: 0,
    denuncias: 0,
    cadastro: QUANDO[indice],
    ultimoAcesso: QUANDO[indice],
    papeis: ['usuario'],
    sancao: null,
    /* o que a conferência automática achou. É o que separa "aprovar sem ler"
       de "olhar este com atenção" */
    nota,
    suspeita: nota.includes('banida') || nota.includes('Sem telefone'),
  }));

  const base = NOMES.map(([nome, tipo, cidade], indice) => {
    const situacao =
      indice % 11 === 3 ? 'banido' : indice % 7 === 2 ? 'suspenso' : indice % 9 === 8 ? 'inativo' : 'ativo';

    return {
      id: `u${indice + 1}`,
      nome,
      iniciais: iniciais(nome),
      tipo,
      cidade: `${cidade} · MT`,
      email: `${nome.toLowerCase().replace(/[^a-z]+/g, '.')}@exemplo.com.br`,
      telefone: `(65) 9${8000 + indice * 37}-${1000 + indice * 13}`.slice(0, 15),
      documento: indice % 3 === 1 ? '**.***.***/0001-**' : '***.***.***-**',
      situacao,
      verificado: indice % 4 !== 1 && situacao === 'ativo',
      anuncios: situacao === 'banido' ? 0 : 2 + ((indice * 5) % 14),
      denuncias: indice % 6 === 0 ? 1 + (indice % 3) : 0,
      cadastro: QUANDO[(indice + 4) % QUANDO.length],
      ultimoAcesso: QUANDO[indice % QUANDO.length],
      papeis: indice === 0 ? ['usuario', 'moderador'] : ['usuario'],
      /* o motivo fica junto da sanção: sem ele, o próximo administrador não
         sabe se pode restaurar, e a decisão vira aposta */
      sancao:
        situacao === 'suspenso'
          ? { motivo: 'Anúncios repetidos com preço divergente', ate: 'em 5 dias', por: 'Aline' }
          : situacao === 'banido'
            ? { motivo: 'Tentativa de golpe confirmada em duas denúncias', ate: 'permanente', por: 'Aline' }
            : null,
    };
  });

  /* os pendentes primeiro: é o que espera decisão, e decisão parada custa mais
     que qualquer linha da base já resolvida */
  return [...pendentes, ...base];
}

/* ─────────────────────────────────────────────────────────
   ANÚNCIOS
   ───────────────────────────────────────────────────────── */

const TITULOS = [
  ['Bomba hidráulica John Deere 6110J', 'R$ 1.850'],
  ['Kit embreagem completo — Massey 292', 'R$ 2.390'],
  ['Pneu agrícola 18.4-34 (novo)', 'R$ 3.100'],
  ['Retífica de cabeçote em oficina', 'R$ 950'],
  ['Turbina do turbo — linha John Deere', 'R$ 1.980'],
  ['Colheitadeira Case 7250 — 2020', 'R$ 890.000'],
  ['Manutenção hidráulica em campo', 'A combinar'],
  ['Bico injetor — linha New Holland', 'R$ 460'],
  ['Trator Valtra BM110 revisado', 'R$ 178.000'],
  ['Óleo hidráulico 20L', 'R$ 285'],
  ['Solda de chassi e longarina', 'A combinar'],
  ['Cabeçote retificado 6 cilindros', 'R$ 3.700'],
  ['Plantadeira 11 linhas', 'R$ 96.000'],
  ['Filtro de ar duplo', 'R$ 185'],
  ['Diagnóstico eletrônico com scanner', 'R$ 320'],
  ['Peça importada — entrega imediata', 'R$ 12.000'],
];

export function anunciosAdmin() {
  const pessoas = usuariosAdmin();

  return TITULOS.map(([titulo, preco], indice) => {
    const dono = pessoas[indice % pessoas.length];

    const situacao =
      indice % 8 === 7
        ? 'reprovado'
        : indice % 5 === 0
          ? 'em_analise'
          : indice % 9 === 4
            ? 'oculto'
            : 'publicado';

    return {
      id: `a${indice + 1}`,
      titulo,
      preco,
      tipo: preco === 'A combinar' ? 'servico' : indice % 6 === 5 ? 'maquina' : 'peca',
      situacao,
      dono: { id: dono.id, nome: dono.nome, iniciais: dono.iniciais, tipo: dono.tipo },
      cidade: dono.cidade,
      vistas: situacao === 'em_analise' ? 0 : 40 + ((indice * 53) % 620),
      contatos: situacao === 'em_analise' ? 0 : (indice * 3) % 14,
      denuncias: indice % 5 === 3 ? 1 + (indice % 2) : 0,
      destacado: indice % 7 === 1,
      fotos: 1 + (indice % 5),
      quando: QUANDO[indice % QUANDO.length],
      /* por que caiu na fila: sem isso, moderar é ler o anúncio inteiro em
         busca do problema que outra pessoa já tinha identificado */
      alerta:
        indice % 8 === 7
          ? 'Preço muito abaixo do praticado — possível isca'
          : indice % 5 === 3
            ? 'Denunciado por outros usuários'
            : null,
    };
  });
}

/* ─────────────────────────────────────────────────────────
   DENÚNCIAS
   ───────────────────────────────────────────────────────── */

export function denunciasAdmin() {
  const anuncios = anunciosAdmin();
  const pessoas = usuariosAdmin();
  const motivos = Object.keys(MOTIVOS_DENUNCIA);

  return Array.from({ length: 9 }, (_, indice) => {
    const anuncio = anuncios[(indice * 3) % anuncios.length];
    const autor = pessoas[(indice * 5) % pessoas.length];

    return {
      id: `d${indice + 1}`,
      motivo: motivos[indice % motivos.length],
      alvo: { tipo: indice % 4 === 3 ? 'usuario' : 'anuncio', anuncio, usuario: anuncio.dono },
      autor: { nome: autor.nome, iniciais: autor.iniciais },
      texto: [
        'O preço não bate com o que ele cobra no WhatsApp.',
        'Mesmo anúncio publicado três vezes na mesma semana.',
        'Pediu depósito antecipado e sumiu.',
        'Está no lugar errado, isso é serviço e não peça.',
        'Colocou o telefone dentro da foto para escapar do chat.',
      ][indice % 5],
      quando: QUANDO[indice % QUANDO.length],
      /* denúncias repetidas sobre o mesmo alvo pesam mais que o dobro de uma:
         é o sinal mais forte de que o problema é real */
      repetidas: indice % 3 === 0 ? 2 + (indice % 3) : 1,
      situacao: indice > 6 ? 'resolvida' : 'aberta',
    };
  });
}

/* ─────────────────────────────────────────────────────────
   VISÃO GERAL
   ───────────────────────────────────────────────────────── */

export function painelAdmin() {
  const usuarios = usuariosAdmin();
  const anuncios = anunciosAdmin();
  const denuncias = denunciasAdmin();

  const emAnalise = anuncios.filter((anuncio) => anuncio.situacao === 'em_analise');
  const abertas = denuncias.filter((denuncia) => denuncia.situacao === 'aberta');

  return {
    metricas: [
      { chave: 'usuarios', rotulo: 'Usuários', valor: 1284, variacao: 6, icone: 'user' },
      { chave: 'anuncios', rotulo: 'Anúncios no ar', valor: 3126, variacao: 11, icone: 'grid' },
      { chave: 'conversas', rotulo: 'Conversas na semana', valor: 842, variacao: -4, icone: 'mail' },
      { chave: 'novos', rotulo: 'Cadastros na semana', valor: 47, variacao: 18, icone: 'plus' },
    ],

    /* o que espera decisão humana. Vem antes das métricas na tela: número
       bonito não sai da fila, denúncia parada sim */
    pendencias: [
      {
        id: 'aprovacoes',
        rotulo: 'Cadastros a aprovar',
        valor: usuarios.filter((usuario) => usuario.situacao === 'aguardando').length,
        href: '/admin/usuarios?aba=aguardando',
        urgente: true,
        detalhe: 'Sem aprovação, a pessoa não consegue anunciar',
      },
      {
        id: 'moderacao',
        rotulo: 'Anúncios em análise',
        valor: emAnalise.length,
        href: '/admin/moderacao',
        urgente: emAnalise.length > 2,
        detalhe: 'Aguardando aprovação para ir ao ar',
      },
      {
        id: 'denuncias',
        rotulo: 'Denúncias abertas',
        valor: abertas.length,
        href: '/admin/denuncias',
        urgente: abertas.length > 3,
        detalhe: 'Sem resposta da moderação',
      },
      {
        id: 'lgpd',
        rotulo: 'Pedidos de LGPD',
        valor: 2,
        href: '/admin/lgpd',
        urgente: true,
        detalhe: 'Prazo legal de 15 dias corre desde o pedido',
      },
      /* “Perfis a verificar” fica de fora: é a única das cinco filas sem
         ninguém travado do outro lado nem prazo correndo — o perfil funciona
         igual, só não tem o selo. Numa grade de quatro, ela roubaria o lugar
         de uma fila que custa dinheiro ou infração. */
    ],

    /* série de 14 dias — cadastros e anúncios novos */
    serieCadastros: Array.from({ length: 14 }, (_, dia) => ({
      rotulo: `${dia + 1}`,
      valor: 3 + ((dia * 7) % 9),
    })),

    serieAnuncios: Array.from({ length: 14 }, (_, dia) => ({
      rotulo: `${dia + 1}`,
      valor: 9 + ((dia * 11) % 17),
    })),

    atividade: [
      { id: 'l1', quem: 'Aline', acao: 'aprovou o anúncio', alvo: 'Trator Valtra BM110 revisado', quando: 'há 12 min', icone: 'check' },
      { id: 'l2', quem: 'Aline', acao: 'suspendeu', alvo: 'Marcos Vinícius', quando: 'há 1 h', icone: 'eye-off' },
      { id: 'l3', quem: 'Sistema', acao: 'expirou automaticamente', alvo: '14 anúncios', quando: 'há 3 h', icone: 'clock' },
      { id: 'l4', quem: 'Aline', acao: 'resolveu a denúncia sobre', alvo: 'Peça importada — entrega imediata', quando: 'ontem', icone: 'bell' },
      { id: 'l5', quem: 'Aline', acao: 'criou o comunicado', alvo: 'Manutenção programada', quando: 'ontem', icone: 'plus' },
      { id: 'l6', quem: 'Sistema', acao: 'bloqueou foto com telefone em', alvo: 'Bico injetor — linha New Holland', quando: 'há 2 dias', icone: 'image' },
    ],

    saude: [
      { id: 'api', rotulo: 'API', estado: 'ok', detalhe: 'Tempo médio 84 ms' },
      { id: 'banco', rotulo: 'Banco de dados', estado: 'ok', detalhe: '18% de uso' },
      { id: 'redis', rotulo: 'Cache (Redis)', estado: 'ok', detalhe: '94% de acerto' },
      { id: 'filas', rotulo: 'Filas', estado: 'atencao', detalhe: '37 tarefas na fila de mídia' },
      { id: 'websocket', rotulo: 'Tempo real', estado: 'ok', detalhe: '212 conexões abertas' },
    ],
  };
}

/** contadores do menu — o que pede atenção agora */
export function contadoresAdmin() {
  const anuncios = anunciosAdmin();
  const denuncias = denunciasAdmin();

  return {
    usuarios: usuariosAdmin().filter((usuario) => usuario.situacao === 'aguardando').length,
    moderacao: anuncios.filter((anuncio) => anuncio.situacao === 'em_analise').length,
    denuncias: denuncias.filter((denuncia) => denuncia.situacao === 'aberta').length,
    lgpd: 2,
  };
}

/* ─────────────────────────────────────────────────────────
   CONVERSAS
   ───────────────────────────────────────────────────────── */

const FALAS = [
  ['comprador', 'Boa tarde! Esse item ainda está disponível?'],
  ['dono', 'Boa tarde! Tenho sim, pode chamar no WhatsApp.'],
  ['comprador', 'Consegue entregar aqui na região?'],
  ['dono', 'Consigo, o frete fica por sua conta.'],
  ['comprador', 'Fechado. Me passa o PIX que adianto metade.'],
];

const FALAS_SUSPEITAS = [
  ['comprador', 'Tenho interesse. Aceita depósito?'],
  ['dono', 'Aceito. Faz o PIX de 50% que eu já separo a peça.'],
  ['comprador', 'Você tem nota fiscal?'],
  ['dono', 'Nota não sai, mas confia. Manda no 65 9xxxx-xxxx que resolvo por fora.'],
];

/**
 * Conversas, para a leitura administrativa.
 *
 * A administração **pode ler** — é o que permite apurar uma denúncia de golpe,
 * onde a prova está no que foi combinado por mensagem. Mas toda leitura fica
 * registrada em `logs_acesso_dado`, e a tela diz isso em letras visíveis: um
 * poder que não deixa rastro deixa de ser poder e vira risco.
 *
 * `denunciada` marca a conversa que motivou uma denúncia — é por onde a
 * apuração começa, e não pela mais recente.
 */
export function conversasAdmin() {
  const anuncios = anunciosAdmin();
  const pessoas = usuariosAdmin().filter((usuario) => usuario.situacao !== 'aguardando');

  return anuncios.slice(0, 12).map((anuncio, indice) => {
    const comprador = pessoas[(indice * 5 + 3) % pessoas.length];
    const suspeita = indice % 5 === 2;
    const falas = suspeita ? FALAS_SUSPEITAS : FALAS.slice(0, 2 + (indice % 4));

    return {
      id: `cv${indice + 1}`,
      anuncio: { id: anuncio.id, titulo: anuncio.titulo, preco: anuncio.preco },
      dono: anuncio.dono,
      comprador: {
        id: comprador.id,
        nome: comprador.nome,
        iniciais: comprador.iniciais,
      },
      quando: QUANDO[indice % QUANDO.length],
      denunciada: suspeita,
      mensagens: falas.map(([de, texto], posicao) => ({
        id: `${anuncio.id}-m${posicao + 1}`,
        de,
        texto,
        hora: `${9 + posicao}:${posicao % 2 ? '42' : '15'}`,
        /* o que a varredura automática marcou: contato por fora, pedido de
           adiantamento. É o que a apuração procura sem ler tudo */
        alerta:
          texto.includes('PIX') || texto.includes('por fora') || texto.includes('depósito'),
      })),
    };
  });
}

/* ─────────────────────────────────────────────────────────
   DETALHE DE UM ANÚNCIO (visão da administração)
   ───────────────────────────────────────────────────────── */

const DESCRICAO_PADRAO =
  'Peça revisada e testada em bancada. Acompanha nota e garantia de 90 dias contra defeito de montagem. Serve nos modelos da mesma linha — confirme o número da peça antes de comprar. Retirada no local ou envio por transportadora.';

const DESCRICAO_SERVICO =
  'Atendimento com equipamento próprio e peças de reposição em estoque. Deslocamento até a propriedade incluso dentro do raio informado; acima disso, cobrado por quilômetro rodado. Orçamento sem compromisso após a avaliação.';

/**
 * O anúncio inteiro, do ponto de vista de quem modera.
 *
 * Traz o que a tela do dono NÃO mostra e a decisão exige: o histórico de
 * moderação, as denúncias com o texto de quem denunciou, os sinais que a
 * varredura automática levantou e as conversas ligadas ao anúncio.
 *
 * Sem isso, moderar é decidir por aparência — e anúncio bom de aparência é
 * exatamente o que o golpe produz.
 */
export function detalheAnuncioAdmin(id) {
  const anuncio = anunciosAdmin().find((item) => item.id === id);
  if (!anuncio) return null;

  const dono = usuariosAdmin().find((item) => item.id === anuncio.dono.id);
  const denuncias = denunciasAdmin().filter(
    (denuncia) => denuncia.alvo.anuncio?.id === id && denuncia.alvo.tipo === 'anuncio'
  );
  const conversas = conversasAdmin().filter((conversa) => conversa.anuncio.id === id);

  const semente = id.split('').reduce((soma, letra) => soma + letra.charCodeAt(0), 0);

  return {
    ...anuncio,
    dono,
    denuncias,
    conversas,

    descricao: anuncio.tipo === 'servico' ? DESCRICAO_SERVICO : DESCRICAO_PADRAO,
    categoria: anuncio.tipo === 'servico' ? 'Manutenção mecânica' : 'Hidráulica',
    condicao: anuncio.tipo === 'servico' ? null : semente % 2 ? 'Usada' : 'Nova',
    marca: anuncio.tipo === 'servico' ? null : 'John Deere',
    entrega: semente % 3 === 0 ? 'Retirada no local' : 'Entrega na região',
    publicadoEm: anuncio.quando,
    expiraEm: anuncio.situacao === 'publicado' ? `${9 + (semente % 40)} dias` : null,

    /* o que a varredura automática levantou. Não decide nada sozinha — só
       aponta onde olhar, que é a diferença entre moderar e adivinhar */
    sinais: [
      anuncio.denuncias > 0 && {
        id: 'denuncia',
        texto: `${anuncio.denuncias} denúncia(s) recebida(s)`,
        grave: true,
      },
      semente % 4 === 0 && {
        id: 'preco',
        texto: 'Preço 38% abaixo da média da categoria',
        grave: true,
      },
      semente % 3 === 1 && {
        id: 'foto',
        texto: 'Foto idêntica encontrada em outro anúncio',
        grave: false,
      },
      semente % 5 === 2 && {
        id: 'contato',
        texto: 'Número de telefone detectado na descrição',
        grave: false,
      },
    ].filter(Boolean),

    historico: [
      { id: 'e1', acao: 'Anúncio criado', quem: anuncio.dono.nome, quando: anuncio.quando, icone: 'plus' },
      anuncio.situacao !== 'em_analise' && {
        id: 'e2',
        acao: 'Enviado para moderação',
        quem: 'Sistema',
        quando: anuncio.quando,
        icone: 'clock',
      },
      anuncio.situacao === 'publicado' && {
        id: 'e3',
        acao: 'Aprovado e publicado',
        quem: 'Aline',
        quando: anuncio.quando,
        icone: 'check',
      },
      anuncio.situacao === 'oculto' && {
        id: 'e4',
        acao: 'Ocultado pela administração',
        quem: 'Aline',
        quando: 'há 2 dias',
        icone: 'eye-off',
      },
      anuncio.situacao === 'reprovado' && {
        id: 'e5',
        acao: 'Reprovado — preço incompatível com o item',
        quem: 'Aline',
        quando: 'há 3 dias',
        icone: 'close',
      },
    ].filter(Boolean),
  };
}
