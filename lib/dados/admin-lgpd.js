/**
 * LGPD, do lado da administração — `/admin/lgpd/*`
 * (`admin.conformidade.controller.js` + `admin.conformidade.lgpd.service.js`).
 *
 * ⚠️ Diferenças reais em relação ao mock (`lib/admin-catalogo-mock.js`):
 *  · **Não existe "responder" genérico.** O desfecho é uma DECISÃO: o corpo
 *    exige `status` dentre `STATUS_FINAIS` (`concluida` ou `recusada`) mais
 *    `resposta` (texto, mínimo 20 caracteres). "Em atendimento" não é uma
 *    resposta — é só o que o titular vê enquanto ninguém decidiu nada.
 *  · **Não existe "Gerar arquivo" separado.** O mock tinha um botão que só
 *    disparava um aviso local; a API real não tem endpoint de exportação sob
 *    `/admin/lgpd` — a exportação de dados é autosserviço do titular
 *    (`POST /lgpd/exportar`, fora do escopo do painel do Admin). O botão foi
 *    removido em vez de fingir uma chamada que não existe.
 *  · **Status reais**: `aberta | em_atendimento | concluida | recusada`
 *    (`TITULAR_SOLICITACAO_STATUS`). "Aberta" no mock cobria só um desses —
 *    aqui "em aberto" é tudo que não está em `STATUS_FINAIS`.
 *  · **Prazo e resumo vêm prontos do servidor** (`meta.resumo`:
 *    abertas/vencendo/atrasadas/prazoDias/alertaDias) — o front não recalcula
 *    dias restantes, o próprio item já traz `diasRestantes`/`vencendo`/
 *    `atrasada` calculados no mesmo instante da consulta.
 *  · **Documentos**: `GET /admin/lgpd/documentos` traz versões vigentes e o
 *    histórico, mais `reaceitePendente` por tipo. Publicar nova versão
 *    (`POST /admin/lgpd/documentos`) existe no backend mas exige um editor de
 *    texto jurídico completo (conteúdo, resumo de mudanças, vigência) — fora
 *    do escopo desta tela; o botão "Nova versão" continua um aviso
 *    informativo, não uma chamada real.
 */

import api from '@/lib/api';

export const STATUS_SOLICITACAO = {
  aberta: { rotulo: 'Aberta', tom: 'alerta' },
  em_atendimento: { rotulo: 'Em atendimento', tom: 'info' },
  concluida: { rotulo: 'Concluída', tom: 'ok' },
  recusada: { rotulo: 'Recusada', tom: 'neutro' },
};

/** dentre estes dois, a decisão é irreversível — não aceitam nova resposta */
export const STATUS_FINAIS = ['concluida', 'recusada'];

export const TIPOS_SOLICITACAO = {
  acesso: 'Acesso aos dados',
  correcao: 'Correção de dados',
  exclusao: 'Exclusão de dados',
  portabilidade: 'Portabilidade de dados',
  revogacao_consentimento: 'Revogação de consentimento',
  anonimizacao: 'Anonimização de conta',
  oposicao: 'Oposição ao tratamento',
};

export const TIPOS_DOCUMENTO = {
  termos_de_uso: 'Termos de Uso',
  politica_privacidade: 'Política de Privacidade',
  politica_cookies: 'Política de Cookies',
};

/**
 * Fila de solicitações do titular, com o resumo do painel (`meta.resumo`).
 * Devolve `{ itens, resumo }` — o resumo é quem decide o alerta de prazo, não
 * uma contagem recalculada no front.
 */
export async function listarSolicitacoesLgpd({ status, tipo, vencidas, sinal } = {}) {
  const { dados, meta } = await api.listar(
    '/admin/lgpd/solicitacoes',
    { status, tipo, vencidas },
    { sinal }
  );

  return { itens: dados, resumo: meta?.resumo || null };
}

export const obterSolicitacaoLgpd = (id, { sinal } = {}) =>
  api.get(`/admin/lgpd/solicitacoes/${id}`, undefined, { sinal });

/** decide o desfecho — `status` precisa ser `concluida` ou `recusada` */
export const responderSolicitacaoLgpd = (id, { status, resposta, anexoUrl }) =>
  api.post(`/admin/lgpd/solicitacoes/${id}/responder`, { status, resposta, anexoUrl });

/** documentos legais vigentes + histórico + reaceite pendente por tipo */
export async function listarDocumentosLgpd({ sinal } = {}) {
  const { dados, meta } = await api.listar('/admin/lgpd/documentos', undefined, { sinal });

  return {
    vigentes: dados?.vigentes || [],
    versoes: dados?.versoes || [],
    reaceitePendente: meta?.reaceitePendente || {},
    totalReaceitePendente: meta?.totalReaceitePendente || 0,
  };
}
