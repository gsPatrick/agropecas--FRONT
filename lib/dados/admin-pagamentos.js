/**
 * Origem de dados das contas do Mercado Pago (painel da Admin).
 *
 *   GET    /admin/contas-mercadopago              → contas + URL do webhook
 *   POST   /admin/contas-mercadopago              → cadastra (e confere o token no MP)
 *   PATCH  /admin/contas-mercadopago/:id          → edita; token/segredo só se enviados
 *   POST   /admin/contas-mercadopago/:id/testar   → reconfere o token agora
 *   POST   /admin/contas-mercadopago/:id/ativar   → passa a receber os pagamentos NOVOS
 *   DELETE /admin/contas-mercadopago/:id
 *
 * A API nunca devolve o token inteiro: só a versão mascarada.
 */

import api, { listar } from '@/lib/api';

export const TIPOS_PESSOA = [
  { id: 'fisica', rotulo: 'Pessoa física (CPF)' },
  { id: 'juridica', rotulo: 'Empresa (CNPJ)' },
];

export const MODOS = [
  { id: 'producao', rotulo: 'Produção (dinheiro real)' },
  { id: 'teste', rotulo: 'Teste (sem cobrar)' },
];

export const listarContasMp = (opcoes) => listar('/admin/contas-mercadopago', undefined, opcoes);
export const criarContaMp = (corpo) => api.post('/admin/contas-mercadopago', corpo);
export const editarContaMp = (id, corpo) => api.patch(`/admin/contas-mercadopago/${id}`, corpo);
export const testarContaMp = (id) => api.post(`/admin/contas-mercadopago/${id}/testar`, {});
export const ativarContaMp = (id) => api.post(`/admin/contas-mercadopago/${id}/ativar`, {});
export const removerContaMp = (id) => api.delete(`/admin/contas-mercadopago/${id}`);
