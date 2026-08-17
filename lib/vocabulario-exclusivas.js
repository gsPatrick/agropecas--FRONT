/**
 * Vocabulário fechado das telas exclusivas de cada perfil (Maturacao/05 §2):
 * o produtor tem propriedade, a loja tem atendimento, o prestador tem
 * serviços. Sem dado de conta nenhum aqui — as três telas leem o próprio
 * conteúdo de `lib/dados/exclusivas.js` (API real); isto é só rótulo fixo
 * de formulário (dias da semana, tipos de máquina, formas de entrega...),
 * do mesmo jeito que `STATUS_ANUNCIO`/`PERIODOS` são vocabulário fixo em
 * outras telas.
 *
 * `TIPOS_MAQUINA` bate com o ENUM do banco (`perfil.constants.js:TIPOS_MAQUINA`
 * na API) — por isso vive aqui como rótulo/ícone, e não vira chamada de
 * rede: é vocabulário de código dos dois lados, não conteúdo editável pelo
 * Admin.
 */

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

export const RAIOS = ['50 km', '100 km', '200 km', '300 km', 'Todo o estado'];

export const FORMAS_ATENDIMENTO = [
  { id: 'campo', rotulo: 'Vou até a propriedade', descricao: 'Atendimento em campo, com deslocamento' },
  { id: 'oficina', rotulo: 'Atendo na oficina', descricao: 'O cliente leva o equipamento' },
  { id: 'emergencia', rotulo: 'Emergência fora do horário', descricao: 'Chamado urgente, inclusive fim de semana' },
];

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
