/**
 * Origem de dados de notificações — hoje só o que o `ComunicadoModal`
 * precisa: os avisos que o Admin manda para a base inteira (ou um segmento
 * dela) via `POST /notificacoes/massa` (`lib/dados/admin-comunicados.js`).
 *
 * Comunicado NÃO é uma entidade própria na API — é uma notificação como
 * qualquer outra (`tipo: 'sistema'`), só que criada em lote e marcada com
 * `entidade: 'comunicados'` (ver `notificacao.constants.js:ENTIDADE_COMUNICADO`
 * na API). Por isso a busca é "notificações não lidas, filtradas por
 * entidade" — não existe `GET /comunicados` nem filtro `entidade` na API
 * (`notificacao.validators.js` só aceita `lida`/`tipo`/`canal`), então o
 * filtro por entidade acontece aqui, no cliente.
 */

import api from '@/lib/api';

const ENTIDADE_COMUNICADO = 'comunicados';

function paraComunicado(item) {
  return {
    id: item.id,
    titulo: item.titulo,
    mensagem: item.mensagem,
    link: item.link,
    criadoEm: item.criadoEm,
  };
}

/** os avisos em massa ainda não vistos, mais antigo primeiro — é o que chega
    primeiro que deve ser mostrado primeiro */
export async function carregarComunicadosNaoLidos({ sinal } = {}) {
  const { dados } = await api.listar(
    '/notificacoes',
    { lida: false, porPagina: 20 },
    { sinal }
  );

  return (dados || [])
    .filter((item) => item.entidade === ENTIDADE_COMUNICADO)
    .map(paraComunicado)
    .reverse();
}

export const marcarComoLida = (id) => api.patch(`/notificacoes/${id}/ler`);
