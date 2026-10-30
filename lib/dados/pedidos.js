/**
 * Origem de dados da compra com custódia (Maturacao/06): checkout, minhas
 * compras, minhas vendas, extrato de repasses e o financeiro da Admin.
 *
 *   POST /pedidos/checkout                     → cria o pedido e devolve o link do Mercado Pago
 *   GET  /pedidos/compras | /pedidos/vendas    → listas do comprador / vendedor
 *   GET  /pedidos/:id                          → detalhe (a API recorta pelo papel de quem pede)
 *   POST /pedidos/:id/sincronizar              → volta do checkout: reconsulta o pagamento
 *   POST /pedidos/:id/confirmar-recebimento | /disputa | /cancelar
 *   GET  /repasses  ·  GET|PUT /repasses/chave-pix
 *   GET  /admin/vendas · /admin/repasses · POST /admin/vendas/:id/liberar|reembolsar
 *   POST /admin/repasses/:id/pagar
 *
 * Dinheiro chega em centavos e sai daqui já formatado — a tela nunca soma.
 */

import api, { listar } from '@/lib/api';

const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const reais = (centavos) =>
  centavos === null || centavos === undefined ? '—' : MOEDA.format(Number(centavos) / 100);

export function dataCurta(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** rótulo e tom do selo de cada status — o mesmo vocabulário em todas as telas */
export const STATUS_PEDIDO = {
  aguardando_pagamento: { rotulo: 'Aguardando pagamento', tom: 'warning' },
  pago: { rotulo: 'Pago · em custódia', tom: 'info' },
  em_disputa: { rotulo: 'Em disputa', tom: 'danger' },
  entregue: { rotulo: 'Recebido', tom: 'success' },
  concluido: { rotulo: 'Concluído', tom: 'success' },
  cancelado: { rotulo: 'Cancelado', tom: 'neutral' },
  reembolsado: { rotulo: 'Estornado', tom: 'neutral' },
};

export const STATUS_REPASSE = {
  retido: { rotulo: 'Em custódia', tom: 'warning' },
  disponivel: { rotulo: 'Disponível para repasse', tom: 'info' },
  pago: { rotulo: 'Pago', tom: 'success' },
  cancelado: { rotulo: 'Cancelado', tom: 'neutral' },
};

export const TIPOS_CHAVE_PIX = [
  { id: 'cpf', rotulo: 'CPF' },
  { id: 'cnpj', rotulo: 'CNPJ' },
  { id: 'email', rotulo: 'E-mail' },
  { id: 'telefone', rotulo: 'Celular' },
  { id: 'aleatoria', rotulo: 'Chave aleatória' },
];

// ─── comprador ────────────────────────────────────────────────────

/** inicia a compra; quem chama redireciona para `checkoutUrl` */
export const iniciarCheckout = (anuncioId, quantidade = 1) =>
  api.post('/pedidos/checkout', { anuncioId, quantidade });

export const buscarPedido = (id, opcoes) => api.get(`/pedidos/${id}`, undefined, opcoes);

/**
 * Chamada na página de retorno. O MP manda `payment_id` (ou `collection_id`,
 * no formato antigo) na URL; a API usa só como pista e reconsulta o status.
 */
export const sincronizarPedido = (id, pagamentoId) =>
  api.post(`/pedidos/${id}/sincronizar`, pagamentoId ? { pagamentoId: String(pagamentoId) } : {});

export const listarCompras = (parametros, opcoes) => listar('/pedidos/compras', parametros, opcoes);
export const listarVendas = (parametros, opcoes) => listar('/pedidos/vendas', parametros, opcoes);

export const confirmarRecebimento = (id) => api.post(`/pedidos/${id}/confirmar-recebimento`, {});
export const abrirDisputa = (id, motivo) => api.post(`/pedidos/${id}/disputa`, { motivo });
export const cancelarPedido = (id) => api.post(`/pedidos/${id}/cancelar`, {});

// ─── vendedor ─────────────────────────────────────────────────────

export const buscarExtrato = (parametros, opcoes) => listar('/repasses', parametros, opcoes);
export const buscarChavePix = (opcoes) => api.get('/repasses/chave-pix', undefined, opcoes);
export const salvarChavePix = (chavePixTipo, chavePix) => api.put('/repasses/chave-pix', { chavePixTipo, chavePix });

// ─── administração ────────────────────────────────────────────────

export const listarVendasAdmin = (parametros, opcoes) => listar('/admin/vendas', parametros, opcoes);
export const listarRepassesAdmin = (parametros, opcoes) => listar('/admin/repasses', parametros, opcoes);
export const liberarRepasse = (id, motivo) => api.post(`/admin/vendas/${id}/liberar`, motivo ? { motivo } : {});
export const reembolsarVenda = (id, motivo) => api.post(`/admin/vendas/${id}/reembolsar`, { motivo });
export const pagarRepasse = (id, comprovante) =>
  api.post(`/admin/repasses/${id}/pagar`, comprovante ? { comprovante } : {});
