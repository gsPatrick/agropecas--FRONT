/**
 * Configurações gerais da plataforma — `/admin/configuracoes`
 * (`GET/PUT /admin/configuracoes*`, feature `configuracao` da API).
 *
 * ⚠️ Diferenças reais em relação ao mock (`lib/admin-config-mock.js`): o mock
 * imaginava seis "portões" de aprovação prévia (usuários, anúncios, serviços,
 * máquinas, fotos, selo de verificação), um grupo de contato (chat, telefone
 * verificado, mostrar telefone só logado) e um grupo de cadastro (exigir
 * documento, exigir e-mail confirmado, aceitar novos cadastros), mais um modo
 * manutenção. Nenhum desses tem uma chave de configuração real com um lugar
 * no código que a leia condicionalmente — só a tabela `configuracoes` existe,
 * vazia de significado até que algum service pergunte por uma chave.
 *
 * Hoje só QUATRO chaves têm os dois lados: a linha na tabela e um `require`
 * em algum service que decide algo por causa dela — todas em
 * `anuncio.politica.service.js`:
 *  · `anuncio.moderacao_previa` (booleano) — `anuncio.publicacao.service.js`
 *    decide se o anúncio publica direto ou entra como "em_analise".
 *  · `anuncio.dias_validade` (número) — `calcularExpiracao` usa para somar a
 *    data de expiração.
 *  · `anuncio.max_fotos` (número) — `limiteDeFotos` usa como teto de fotos.
 *  · `anuncio.max_ativos_por_usuario` (número, vazio = sem limite) —
 *    `garantirLimiteDePublicacao` usa como freio global, o menor entre ele e
 *    a quota do plano.
 *
 * Reparo importante: `anuncio.moderacao_previa` é UM interruptor só, para
 * todo tipo de anúncio (peça, serviço, máquina) — não seis portões
 * independentes como o mock desenhava, porque a publicação não olha o tipo
 * do anúncio para decidir moderação.
 *
 * `chat.ativo` está na lista de chaves PÚBLICAS da API (`PUBLICAS`, em
 * `configuracao.constants.js`) mas nenhum service a lê para ligar/desligar
 * nada — é uma chave que existe só para a rota pública devolver, sem efeito
 * condicional em lugar nenhum. Por isso fica fora daqui também.
 */

import api from '@/lib/api';

/**
 * As únicas chaves com efeito real verificado no código da API.
 * `tipo` decide qual controle a tela desenha; `min` é só para o número que
 * não aceita zero (dias de validade e máximo de fotos não fazem sentido
 * como zero — diferente do limite de anúncios ativos, onde vazio é "sem
 * limite").
 */
export const CHAVES_CONFIG = {
  MODERACAO_PREVIA: {
    chave: 'anuncio.moderacao_previa',
    rotulo: 'Moderação prévia de anúncios',
    tipo: 'booleano',
    descricao:
      'Desligado, todo anúncio novo (peça, serviço ou máquina) vai ao ar direto. Ligado, cada um entra como "em análise" até a sua revisão.',
  },
  DIAS_VALIDADE: {
    chave: 'anuncio.dias_validade',
    rotulo: 'Dias até o anúncio expirar',
    tipo: 'numero',
    descricao: 'Depois disso ele sai do ar e o dono precisa renovar.',
  },
  MAX_FOTOS: {
    chave: 'anuncio.max_fotos',
    rotulo: 'Máximo de fotos por anúncio',
    tipo: 'numero',
    descricao: 'Teto global; o plano do usuário pode aplicar um limite menor.',
  },
  MAX_ATIVOS_POR_USUARIO: {
    chave: 'anuncio.max_ativos_por_usuario',
    rotulo: 'Anúncios ativos por usuário',
    tipo: 'numero',
    descricao: 'Freio de emergência da plataforma. Vazio significa sem limite.',
  },
};

function paraCampo(definicao, registro) {
  return {
    ...definicao,
    valor: registro ? registro.valor : null,
    encontrada: Boolean(registro),
    atualizadoEm: registro?.atualizadoEm || null,
  };
}

/** as quatro chaves reais, já casadas com o valor atual de cada uma */
export async function listarConfiguracoes({ sinal } = {}) {
  const itens = await api.get('/admin/configuracoes', undefined, { sinal });
  const porChave = new Map((itens || []).map((item) => [item.chave, item]));

  return Object.values(CHAVES_CONFIG).map((definicao) =>
    paraCampo(definicao, porChave.get(definicao.chave))
  );
}

/** grava uma chave; `valor` já convertido para o tipo que a API espera */
export async function atualizarConfiguracao(chave, valor, { motivo } = {}) {
  const atualizada = await api.put(`/admin/configuracoes/${chave}`, { valor, motivo });
  return atualizada;
}
