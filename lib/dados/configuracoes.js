/**
 * Origem de dados de `/painel/configuracoes` — cinco abas, cinco endpoints
 * diferentes. Cada seção documenta a própria lacuna quando o mock tinha algo
 * que a API não tem.
 */

import api from '@/lib/api';

/* ─────────────────────────────────────────────────────────
   SEGURANÇA — senha e sessões (100% real, `src/features/auth`)
   ───────────────────────────────────────────────────────── */

export const trocarSenha = (senhaAtual, senha) => api.patch('/auth/senha', { senhaAtual, senha });

export const carregarSessoes = () => api.get('/auth/sessoes');

export const encerrarSessao = (id) => api.delete(`/auth/sessoes/${id}`);

/** `manterAtual: true` (padrão da API) é o que evita a pessoa se derrubar da
    própria tela ao limpar os outros aparelhos */
export const encerrarOutrasSessoes = () => api.post('/auth/sair-de-todos', { manterAtual: true });

/* ─────────────────────────────────────────────────────────
   NOTIFICAÇÕES — `PUT /notificacoes/preferencias`
   ───────────────────────────────────────────────────────── */

/**
 * Só 4 dos 6 assuntos do mock têm `NOTIFICACAO_TIPO` real
 * (`src/models/constantes.js`): "Anúncio favoritado" e "Resumo semanal" não
 * existem como tipo de notificação na API — nenhum job gera esse aviso hoje.
 * "Novidades da plataforma" virou o tipo `sistema`, que é também o usado
 * pelos comunicados do Admin (`ComunicadoModal`) — mesma origem, rótulo
 * diferente para o contexto da tela.
 */
export const ASSUNTOS = [
  { tipo: 'mensagem_nova', rotulo: 'Nova mensagem', descricao: 'Alguém respondeu ou chamou sobre um anúncio seu' },
  { tipo: 'contato_recebido', rotulo: 'Novo contato', descricao: 'Alguém pediu seu WhatsApp ou telefone' },
  { tipo: 'anuncio_expirando', rotulo: 'Anúncio expirando', descricao: 'Aviso alguns dias antes de sair do ar' },
  { tipo: 'sistema', rotulo: 'Novidades da plataforma', descricao: 'Recursos novos e avisos gerais' },
];

export const CANAIS = [
  { id: 'sistema', rotulo: 'No site', icone: 'bell' },
  { id: 'email', rotulo: 'E-mail', icone: 'mail' },
];

export async function carregarPreferencias() {
  const itens = await api.get('/notificacoes/preferencias');
  const porTipo = Object.fromEntries(itens.map((item) => [item.tipo, item]));

  return Object.fromEntries(
    ASSUNTOS.map(({ tipo }) => [
      tipo,
      Object.fromEntries(
        (porTipo[tipo]?.canais || []).map((canal) => [canal.canal, { ativo: canal.ativo, bloqueado: canal.bloqueado }])
      ),
    ])
  );
}

/** salva só o que mudou — a API já faz substituição parcial (ver
    `notificacao.preferencia.service.js:definir`) */
export const salvarPreferencia = (tipo, canal, ativo) =>
  api.put('/notificacoes/preferencias', { itens: [{ tipo, canal, ativo }] });

/* ─────────────────────────────────────────────────────────
   PRIVACIDADE — 3 dos 5 toggles do mock são campos reais de `perfis`
   ───────────────────────────────────────────────────────── */

/**
 * `perfilIndexado`, `mostrarCidade` e `mostrarUltimoAcesso` saíram — não têm
 * coluna. Os três que ficam já eram comuns aos três tipos de perfil
 * (`perfil.constants.js: CAMPOS_COMUNS`), só nunca tinham tela própria.
 */
export async function carregarPrivacidade() {
  const perfil = await api.get('/perfis/meu');
  return {
    exibirWhatsapp: Boolean(perfil.exibirWhatsapp),
    exibirEnderecoExato: Boolean(perfil.exibirEnderecoExato),
    aceitaChat: Boolean(perfil.aceitaChat),
  };
}

export const salvarPrivacidade = (chave, valor) => api.patch('/perfis/meu', { [chave]: valor });

/* ─────────────────────────────────────────────────────────
   LGPD — exportação (pedido + código) e encerramento de conta
   ───────────────────────────────────────────────────────── */

export const CONFIRMACAO_ANONIMIZACAO = 'ANONIMIZAR MINHA CONTA';

/** passo 1: confirma a senha, a API manda um código por e-mail */
export const solicitarExportacao = (senha) => api.post('/lgpd/exportacoes', { senha });

/**
 * passo 2: o código confirma o pedido — a API abre uma solicitação formal
 * (prazo legal de resposta), não devolve um arquivo na hora. É o mesmo rito
 * do art. 18 da LGPD: pedido registrado, entregue dentro do prazo.
 */
export const confirmarExportacao = (codigo) => api.post('/lgpd/exportacoes/confirmar', { codigo });

export const encerrarConta = (confirmacao) => api.post('/lgpd/anonimizacao', { confirmacao });
