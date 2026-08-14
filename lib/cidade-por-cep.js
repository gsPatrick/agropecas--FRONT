/**
 * Resolução de "Cidade e estado" a partir de um CEP digitado no MESMO campo
 * de texto livre.
 *
 * As telas de perfil (/conta, /painel/perfil, /painel/propriedade,
 * /painel/atendimento) e o assistente de primeiro acesso têm um único campo
 * "Cidade e estado" (`"Sorriso · MT"`) que o texto livre já resolve no
 * servidor via `resolverMunicipio` (ver `lib/dados/exclusivas.js` e
 * `lib/dados/perfil-publico.js`). Este arquivo só cobre o atalho: se em vez
 * de um nome a pessoa digitar 8 dígitos de CEP, buscamos no ViaCEP — a MESMA
 * fonte e a MESMA extração de dígitos que `components/AddressFields/AddressFields.js`
 * já usa no cadastro — e devolvemos o texto no formato que o campo já espera.
 *
 * O campo continua 100% texto livre: digitar um nome de cidade não passa por
 * aqui, porque só dispara quando os dígitos batem 8.
 */

/** extrai só os dígitos, igual à máscara de CEP de AddressFields.js */
export function extrairDigitosCep(valor) {
  return String(valor || '').replace(/\D/g, '');
}

/**
 * "Sorriso · MT", como `cidadeParaTexto()` já produz nos adaptadores de
 * `lib/dados/*` — mesmo separador, mesma ordem.
 */
export function formatarCidadeUf(cidade, uf) {
  return cidade ? `${cidade} · ${uf || ''}`.trim() : '';
}

/**
 * Busca o CEP no ViaCEP e devolve { cidade, uf } ou null quando não achar.
 * Lança apenas em erro de rede — CEP inexistente devolve null, não exceção.
 */
export async function buscarCidadePorCep(digitosCep, { signal } = {}) {
  const resposta = await fetch(`https://viacep.com.br/ws/${digitosCep}/json/`, { signal });
  const dados = await resposta.json();
  if (dados.erro) return null;
  return { cidade: dados.localidade || '', uf: dados.uf || '' };
}
