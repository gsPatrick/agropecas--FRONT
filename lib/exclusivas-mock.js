/**
 * ⚠️ PROVISÓRIO — as telas exclusivas de cada perfil, sem API.
 *
 * Uma por tipo, conforme Maturacao/05 §2: o produtor tem propriedade, a loja
 * tem atendimento, o prestador tem serviços. São as únicas telas do painel que
 * NÃO são compartilhadas — o resto os três usam igual.
 *
 * Cada uma existe por um motivo prático, não decorativo:
 *
 *  · **Propriedade** — o maquinário é o que torna a busca de peça útil. Sem
 *    saber que a fazenda tem um John Deere 6110J, "bomba hidráulica" é uma
 *    busca cega entre mil peças parecidas.
 *  · **Atendimento** — horário e entrega são as duas perguntas que a loja mais
 *    responde no WhatsApp. Publicadas no perfil, param de ser perguntadas.
 *  · **Serviços** — o que o prestador faz e até onde ele vai. É o que decide
 *    se ele aparece na busca de quem está a 120 km.
 */

/* ─────────────────────────────────────────────────────────
   PRODUTOR — MINHA PROPRIEDADE
   ───────────────────────────────────────────────────────── */

export const CULTURAS = [
  'Soja',
  'Milho',
  'Milho safrinha',
  'Algodão',
  'Feijão',
  'Sorgo',
  'Girassol',
  'Cana-de-açúcar',
  'Pastagem',
  'Gado de corte',
  'Gado de leite',
];

/* os 8 valores batem com o ENUM do banco (`maquinas.categoria_maquina` e
   `perfil_maquinas.tipo`, ver `perfil.constants.js:TIPOS_MAQUINA` na API) —
   por isso ficam aqui como rótulo/ícone, e não viram uma chamada de rede: são
   vocabulário de código dos dois lados, não conteúdo editável pelo Admin */
export const TIPOS_MAQUINA = [
  { id: 'trator', rotulo: 'Trator', icone: 'tractor' },
  { id: 'colheitadeira', rotulo: 'Colheitadeira', icone: 'tractor' },
  { id: 'pulverizador', rotulo: 'Pulverizador', icone: 'pump' },
  { id: 'plantadeira', rotulo: 'Plantadeira', icone: 'grid' },
  { id: 'implemento', rotulo: 'Implemento', icone: 'gear' },
  { id: 'caminhao', rotulo: 'Caminhão', icone: 'store' },
  { id: 'motor', rotulo: 'Motor', icone: 'gear' },
  { id: 'outro', rotulo: 'Outro', icone: 'grid' },
];

export const dadosDaPropriedade = () => ({
  nome: 'Fazenda Santa Luzia',
  inscricao: '',
  cidade: 'Sorriso · MT',
  referencia: 'Rodovia MT-242, km 38 — entrada à direita depois da ponte',
  area: '1.400',
  culturas: ['Soja', 'Milho safrinha'],
  /* o telefone da sede é diferente do pessoal: em fazenda grande quem atende
     o portão não é quem anuncia */
  contatoSede: '',
  maquinas: [
    { id: 'm1', tipo: 'trator', marca: 'John Deere', modelo: '6110J', ano: '2018' },
    { id: 'm2', tipo: 'colheitadeira', marca: 'Case', modelo: 'Axial-Flow 7250', ano: '2020' },
    { id: 'm3', tipo: 'pulverizador', marca: 'Jacto', modelo: 'Uniport 3030', ano: '2016' },
  ],
});

/* ─────────────────────────────────────────────────────────
   LOJA — ATENDIMENTO
   ───────────────────────────────────────────────────────── */

export const DIAS = [
  { id: 'seg', rotulo: 'Segunda' },
  { id: 'ter', rotulo: 'Terça' },
  { id: 'qua', rotulo: 'Quarta' },
  { id: 'qui', rotulo: 'Quinta' },
  { id: 'sex', rotulo: 'Sexta' },
  { id: 'sab', rotulo: 'Sábado' },
  { id: 'dom', rotulo: 'Domingo' },
];

export const FORMAS_ENTREGA = [
  { id: 'retirada', rotulo: 'Retirada na loja', descricao: 'O comprador busca no balcão' },
  { id: 'regiao', rotulo: 'Entrega na região', descricao: 'Até o raio que você definir' },
  { id: 'transportadora', rotulo: 'Envio por transportadora', descricao: 'Frete por conta do comprador' },
  { id: 'campo', rotulo: 'Entrega na propriedade', descricao: 'Leva até a fazenda do cliente' },
];

export const dadosDeAtendimento = () => ({
  endereco: 'Av. das Indústrias, 1420 — Distrito Industrial',
  cidade: 'Cuiabá · MT',
  telefone: '(65) 3025-8890',
  whatsapp: '',
  /* dias úteis abertos, fim de semana meio período: o padrão do setor, para a
     loja ajustar em vez de preencher sete linhas do zero */
  horarios: {
    seg: { aberto: true, de: '07:30', ate: '18:00' },
    ter: { aberto: true, de: '07:30', ate: '18:00' },
    qua: { aberto: true, de: '07:30', ate: '18:00' },
    qui: { aberto: true, de: '07:30', ate: '18:00' },
    sex: { aberto: true, de: '07:30', ate: '18:00' },
    sab: { aberto: true, de: '08:00', ate: '12:00' },
    dom: { aberto: false, de: '', ate: '' },
  },
  entregas: ['retirada', 'regiao'],
  raioEntrega: '150',
  prazoResposta: 'Mesmo dia',
  observacao: 'Atendemos pedidos por WhatsApp fora do horário; a resposta sai no próximo dia útil.',
});

/* ─────────────────────────────────────────────────────────
   PRESTADOR — MEUS SERVIÇOS
   ───────────────────────────────────────────────────────── */

/**
 * Catálogo de serviços, agrupado.
 *
 * Escolher de uma lista e não digitar livremente é o que faz a busca funcionar:
 * "retífica de cabeçote" e "retificar cabecote" seriam dois serviços diferentes
 * num campo de texto, e nenhum dos dois apareceria na busca do outro.
 */
export const CATALOGO_SERVICOS = [
  {
    grupo: 'Mecânica',
    itens: [
      'Retífica de motor',
      'Retífica de cabeçote',
      'Reparo de transmissão',
      'Troca de embreagem',
      'Revisão preventiva',
      'Diagnóstico eletrônico',
    ],
  },
  {
    grupo: 'Hidráulica',
    itens: [
      'Reparo de bomba hidráulica',
      'Reparo de cilindro',
      'Troca de mangueiras',
      'Montagem de kit hidráulico',
    ],
  },
  {
    grupo: 'Elétrica',
    itens: [
      'Sistema elétrico 12V/24V',
      'Alternador e motor de partida',
      'Chicote e painel',
      'Instalação de piloto automático',
    ],
  },
  {
    grupo: 'Solda e usinagem',
    itens: [
      'Solda de chassi',
      'Recuperação de peça',
      'Usinagem de pinos e buchas',
      'Torno e fresa',
    ],
  },
  {
    grupo: 'Pulverização e plantio',
    itens: [
      'Regulagem de bicos',
      'Manutenção de pulverizador',
      'Regulagem de plantadeira',
      'Aferição de vazão',
    ],
  },
];

export const RAIOS = ['50 km', '100 km', '200 km', '300 km', 'Todo o estado'];

export const FORMAS_ATENDIMENTO = [
  { id: 'campo', rotulo: 'Vou até a propriedade', descricao: 'Atendimento em campo, com deslocamento' },
  { id: 'oficina', rotulo: 'Atendo na oficina', descricao: 'O cliente leva o equipamento' },
  { id: 'emergencia', rotulo: 'Emergência fora do horário', descricao: 'Chamado urgente, inclusive fim de semana' },
];

export const dadosDosServicos = () => ({
  servicos: [
    'Reparo de bomba hidráulica',
    'Reparo de cilindro',
    'Troca de mangueiras',
    'Retífica de cabeçote',
    'Sistema elétrico 12V/24V',
  ],
  raio: '200 km',
  base: 'Lucas do Rio Verde · MT',
  formas: ['campo', 'oficina'],
  cobraDeslocamento: 'Sim, acima do raio informado',
  prazo: 'Em até 48 h',
  equipe: '2',
  observacao: 'Equipamento próprio e peças de reposição em estoque para os reparos mais comuns.',
});

/** o que falta para a tela render resultado — vale para as três */
export function pendenciasExclusivas(tipo, dados) {
  if (tipo === 'produtor') {
    return [
      !dados.maquinas.length && 'Cadastre pelo menos uma máquina',
      !dados.culturas.length && 'Informe o que você produz',
      !dados.contatoSede && 'Informe um telefone da sede',
    ].filter(Boolean);
  }

  if (tipo === 'loja') {
    return [
      !dados.whatsapp && 'Informe o WhatsApp do balcão',
      !dados.entregas.length && 'Escolha ao menos uma forma de entrega',
      !Object.values(dados.horarios).some((dia) => dia.aberto) && 'Marque os dias em que abre',
    ].filter(Boolean);
  }

  return [
    dados.servicos.length < 3 && 'Selecione ao menos três serviços',
    !dados.formas.length && 'Diga como você atende',
    !dados.base && 'Informe sua base de atendimento',
  ].filter(Boolean);
}
