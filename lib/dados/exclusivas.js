/**
 * Origem dos dados das telas exclusivas do painel — `/painel/propriedade`
 * (produtor) e `/painel/servicos` (prestador).
 *
 * As duas eram servidas por `lib/exclusivas-mock.js`: o formulário salvava em
 * memória e o dado sumia no refresh. A API passou a ter onde gravar
 * (`perfil_culturas`, `perfil_maquinas`, `perfil_servicos` e `enderecos`), e
 * este arquivo é a tradução entre os dois vocabulários.
 *
 * O adaptador mora AQUI e não dentro da tela pelo mesmo motivo de
 * `lib/dados/perfil.js`: a tela não deve mudar quando um nome de campo mudar do
 * outro lado, e assim existe um lugar só para conferir o que está integrado.
 *
 * ⚠️ O DESENHO DAS TELAS NÃO MUDOU. O que mudou foi de onde vêm os dados —
 * cada campo que a tela já desenhava continua com o mesmo rótulo, a mesma
 * ordem e o mesmo formato de texto ("1.400", "200 km", "Sorriso · MT").
 */

import api from '@/lib/api';

/* ─────────────────────────────────────────────────────────
   FORMATO — a tela fala texto, a API fala número
   ───────────────────────────────────────────────────────── */

/** 1400 → "1.400". A tela sempre mostrou área com separador de milhar */
const areaParaTexto = (valor) =>
  valor === null || valor === undefined ? '' : Number(valor).toLocaleString('pt-BR');

/** "1.400" ou "1400,5" → 1400 / 1400.5 */
function areaParaNumero(texto) {
  const limpo = String(texto || '').replace(/\./g, '').replace(',', '.').trim();
  if (!limpo) return null;
  const numero = Number(limpo);
  return Number.isFinite(numero) ? numero : null;
}

/** { nome, uf } → "Sorriso · MT", que é como a tela sempre escreveu */
const cidadeParaTexto = (municipio, uf) =>
  municipio?.nome ? `${municipio.nome} · ${municipio.uf || uf || ''}`.trim() : '';

/**
 * "Sorriso · MT" → o id do município na nossa base.
 *
 * O campo é livre na tela e continua livre — resolver o texto aqui é o que
 * permite integrar sem transformá-lo em `<select>`, que seria mudar o desenho.
 * Não achou? Devolve `undefined` e o município simplesmente não é alterado:
 * apagar a localização por causa de um erro de digitação seria pior do que
 * ignorar a edição.
 */
async function resolverMunicipio(texto) {
  const [nome, uf] = String(texto || '')
    .split('·')
    .map((parte) => parte.trim());

  if (!nome) return undefined;

  try {
    /* o parâmetro é `busca` e não `q`: a feature de localização usa esse nome
       (ver `localizacao.validators`), e `q` seria descartado em silêncio —
       trazendo a primeira página do estado inteiro em vez do município certo */
    const { dados } = await api.listar('/localizacao/municipios', {
      busca: nome,
      uf,
      porPagina: 20,
    });
    const semAcento = (v) => String(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

    const exato = dados.find((item) => semAcento(item.nome) === semAcento(nome));
    return (exato || dados[0])?.id;
  } catch {
    return undefined;
  }
}

/* ─────────────────────────────────────────────────────────
   PRODUTOR — MINHA PROPRIEDADE
   ───────────────────────────────────────────────────────── */

/**
 * `GET /perfis/meu` → o objeto que a tela já usava.
 *
 * As chaves são as MESMAS do mock (`nome`, `area`, `cidade`, `referencia`,
 * `contatoSede`, `culturas`, `maquinas`), então nenhum JSX precisou mudar.
 */
export function paraPropriedade(perfil) {
  return {
    nome: perfil.propriedadeNome || '',
    inscricao: '',
    cidade: cidadeParaTexto(perfil.municipio, perfil.uf),
    /* ponto de referência é do ENDEREÇO, não do perfil: é o que orienta quem
       vai entregar peça na porteira */
    referencia: perfil.endereco?.referencia || '',
    area: areaParaTexto(perfil.areaHectares),
    culturas: (perfil.culturas || []).map((cultura) => cultura.nome),
    /* o telefone da sede é o secundário do perfil — o principal é o WhatsApp
       pessoal de quem anuncia, e a tela sempre disse que são diferentes */
    contatoSede: perfil.telefoneSecundario || '',
    maquinas: (perfil.maquinas || []).map((maquina) => ({
      id: maquina.id,
      tipo: maquina.tipo,
      marca: maquina.marca || '',
      modelo: maquina.modelo || '',
      /* a tela edita ano em `<input>`; número viraria "2018" mesmo, mas texto
         evita que um campo limpo vire 0 */
      ano: maquina.ano ? String(maquina.ano) : '',
    })),
  };
}

export const carregarPropriedade = () => api.get('/perfis/meu').then(paraPropriedade);

/**
 * As fichas de cultura vêm de `GET /catalogo/culturas` — a lista já nasceu
 * seedada (11 itens, ver a migração de culturas e maquinário) e passou a ter
 * rota de leitura própria. A tela continua marcando por NOME, igual ao mock:
 * `salvarPropriedade` já manda `dados.culturas` como rótulo, e a API resolve
 * contra este mesmo catálogo.
 */
export async function carregarCulturasDisponiveis() {
  const itens = await api.get('/catalogo/culturas');
  return (itens || []).map((cultura) => cultura.nome);
}

/**
 * O inverso: a tela → `PATCH /perfis/meu`.
 *
 * Culturas vão como RÓTULO ("Soja"), que é o que as fichas exibem: a API
 * resolve contra o catálogo `culturas` e recusa o que não existe. Mandar id
 * obrigaria a tela a manter um mapa rótulo→id que já vive no servidor.
 *
 * Máquinas com `id` de UUID são preservadas pela API; as adicionadas na tela
 * têm id local (`m1770...`) e nascem no banco.
 */
export async function salvarPropriedade(dados, { cidadeOriginal } = {}) {
  const corpo = {
    propriedadeNome: dados.nome || null,
    areaHectares: areaParaNumero(dados.area),
    telefoneSecundario: dados.contatoSede || null,
    culturas: dados.culturas,
    maquinas: dados.maquinas.map((maquina) => ({
      id: maquina.id,
      tipo: maquina.tipo,
      marca: maquina.marca,
      modelo: maquina.modelo,
      ano: maquina.ano ? Number(maquina.ano) : undefined,
    })),
    endereco: { referencia: dados.referencia || null },
  };

  /* só resolve o município quando o texto mudou: uma busca a cada salvamento
     seria uma requisição extra para reconfirmar o que já estava certo */
  if (dados.cidade && dados.cidade !== cidadeOriginal) {
    const municipioId = await resolverMunicipio(dados.cidade);
    if (municipioId) corpo.municipioId = municipioId;
  }

  return paraPropriedade(await api.patch('/perfis/meu', corpo));
}

/* ─────────────────────────────────────────────────────────
   PRESTADOR — MEUS SERVIÇOS
   ───────────────────────────────────────────────────────── */

/**
 * Catálogo de serviços, agrupado — agora de `GET /catalogo/servicos`.
 *
 * Os grupos são as categorias do catálogo, e batem com os que a tela já
 * mostrava (Mecânica, Hidráulica, Elétrica, Solda e usinagem, Pulverização e
 * plantio). A lista sair do servidor é o que garante que a ficha marcada
 * corresponda a um serviço que a busca conhece: item digitado ou fora do
 * catálogo é prestador que some da procura achando estar cadastrado.
 */
export async function carregarCatalogoServicos() {
  const itens = await api.get('/catalogo/servicos', { ativo: true });

  const grupos = new Map();

  (itens || []).forEach((servico) => {
    const nome = servico.categoria?.nome || 'Outros';
    if (!grupos.has(nome)) grupos.set(nome, { grupo: nome, itens: [] });
    grupos.get(nome).itens.push(servico.nome);
  });

  return [...grupos.values()];
}

/** raio: 200 → "200 km"; sem raio → "Todo o estado", como a lista da tela */
function raioParaTexto(km) {
  if (!km) return '200 km';
  return km >= 1000 ? 'Todo o estado' : `${km} km`;
}

function raioParaNumero(texto) {
  const digitos = String(texto || '').replace(/\D/g, '');
  return digitos ? Number(digitos) : null;
}

export function paraServicos(perfil) {
  return {
    servicos: (perfil.servicos || []).map((servico) => servico.nome),
    raio: raioParaTexto(perfil.raioAtendimentoKm),
    base: cidadeParaTexto(perfil.municipio, perfil.uf),
    formas: perfil.formasAtendimento?.length ? perfil.formasAtendimento : perfil.atendeNoCampo ? ['campo'] : [],
    /* a API ainda não tem coluna para estes três — seguem só na tela,
       preservados no round-trip (ver `salvarServicos`) */
    cobraDeslocamento: 'Sim, acima do raio informado',
    prazo: 'Em até 48 h',
    equipe: '',
    observacao: '',
  };
}

export const carregarServicos = () => api.get('/perfis/meu').then(paraServicos);

export async function salvarServicos(dados, { baseOriginal } = {}) {
  const corpo = {
    servicos: dados.servicos,
    raioAtendimentoKm: raioParaNumero(dados.raio),
    formasAtendimento: dados.formas,
    /* mantido em paralelo por compatibilidade: é o campo que o perfil
       PÚBLICO ainda lê para "atende em campo" — ver `perfil.mapper.js` */
    atendeNoCampo: dados.formas.includes('campo'),
  };

  if (dados.base && dados.base !== baseOriginal) {
    const municipioId = await resolverMunicipio(dados.base);
    if (municipioId) corpo.municipioId = municipioId;
  }

  const perfil = await api.patch('/perfis/meu', corpo);

  /* o que a API ainda não guarda volta como estava na tela: reescrever com o
     padrão faria os campos "voltarem sozinhos" depois de salvar */
  return {
    ...paraServicos(perfil),
    cobraDeslocamento: dados.cobraDeslocamento,
    prazo: dados.prazo,
    equipe: dados.equipe,
    observacao: dados.observacao,
  };
}

/* ─────────────────────────────────────────────────────────
   LOJA — ATENDIMENTO
   ───────────────────────────────────────────────────────── */

/* `dia_semana` no banco é 0=domingo, como `Date.getDay()` (ver
   `perfil.constants.js:DIAS_SEMANA` na API) — a tela sempre falou
   seg/ter/qua/qui/sex/sab/dom, então a tradução mora só aqui */
const DIA_ID_PARA_NUMERO = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 };
const DIA_NUMERO_PARA_ID = Object.fromEntries(
  Object.entries(DIA_ID_PARA_NUMERO).map(([id, numero]) => [numero, id])
);

/* "Poucos minutos" etc. era só rótulo no mock; a coluna nova
   (`prazo_resposta_horas`) guarda número — o valor do meio de cada faixa,
   que é o que o perfil público usa para dizer "responde em até Xh" */
const PRAZO_RESPOSTA_HORAS = {
  'Poucos minutos': 1,
  'Poucas horas': 4,
  'Mesmo dia': 24,
  'Próximo dia útil': 48,
};

function prazoRespostaParaTexto(horas) {
  if (!horas) return 'Poucas horas';
  const par = Object.entries(PRAZO_RESPOSTA_HORAS).reduce((maisProximo, atual) =>
    Math.abs(atual[1] - horas) < Math.abs(maisProximo[1] - horas) ? atual : maisProximo
  );
  return par[0];
}

/** "HH:MM:SS" (o que `PUT .../horarios` devolve) → "HH:MM" (o que o
    `<input type="time">` da tela aceita) */
const paraHoraCurta = (valor) => (valor ? valor.slice(0, 5) : '');

function paraHorarios(linhas) {
  const base = Object.fromEntries(
    Object.keys(DIA_ID_PARA_NUMERO).map((id) => [id, { aberto: false, de: '', ate: '' }])
  );

  (linhas || []).forEach((linha) => {
    const id = DIA_NUMERO_PARA_ID[linha.diaSemana];
    if (!id) return;

    base[id] = {
      aberto: !linha.fechado,
      de: paraHoraCurta(linha.abreAs),
      ate: paraHoraCurta(linha.fechaAs),
    };
  });

  return base;
}

function horariosParaApi(horarios) {
  return Object.entries(horarios).map(([id, dia]) => ({
    diaSemana: DIA_ID_PARA_NUMERO[id],
    fechado: !dia.aberto,
    ...(dia.aberto && dia.de ? { abreAs: dia.de } : {}),
    ...(dia.aberto && dia.ate ? { fechaAs: dia.ate } : {}),
  }));
}

function paraAtendimento(perfil, horarios) {
  return {
    endereco: perfil.endereco?.referencia || '',
    cidade: cidadeParaTexto(perfil.municipio, perfil.uf),
    telefone: perfil.telefoneSecundario || '',
    whatsapp: perfil.whatsapp || '',
    horarios: paraHorarios(horarios),
    entregas: perfil.formasEntrega || [],
    raioEntrega: perfil.raioEntregaKm ? String(perfil.raioEntregaKm) : '',
    prazoResposta: prazoRespostaParaTexto(perfil.prazoRespostaHoras),
    observacao: perfil.entregaObservacao || '',
  };
}

export async function carregarAtendimento() {
  const [perfil, horarios] = await Promise.all([
    api.get('/perfis/meu'),
    api.get('/perfis/meu/horarios'),
  ]);

  return paraAtendimento(perfil, horarios);
}

export async function salvarAtendimento(dados, { cidadeOriginal } = {}) {
  const corpo = {
    telefoneSecundario: dados.telefone || null,
    whatsapp: dados.whatsapp || null,
    formasEntrega: dados.entregas,
    raioEntregaKm: dados.entregas.includes('regiao') ? raioParaNumero(dados.raioEntrega) || null : null,
    prazoRespostaHoras: PRAZO_RESPOSTA_HORAS[dados.prazoResposta] || null,
    entregaObservacao: dados.observacao || null,
    endereco: { referencia: dados.endereco || null },
  };

  if (dados.cidade && dados.cidade !== cidadeOriginal) {
    const municipioId = await resolverMunicipio(dados.cidade);
    if (municipioId) corpo.municipioId = municipioId;
  }

  /* duas rotas, uma tela: o formulário salva endereço/entrega/telefone (PATCH)
     e a semana inteira de horário (PUT) juntos, como um envio só */
  const [perfil, horarios] = await Promise.all([
    api.patch('/perfis/meu', corpo),
    api.put('/perfis/meu/horarios', { horarios: horariosParaApi(dados.horarios) }),
  ]);

  return paraAtendimento(perfil, horarios);
}
