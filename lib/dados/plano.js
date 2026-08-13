/**
 * Plano da conta — `GET /planos/minha-assinatura`.
 *
 * ⚠️ Só leitura, de propósito: o escopo atual é "planos gratuitos, sem
 * bloqueio" — a API já devolve os limites reais (alguns ilimitados, um ou
 * outro com teto técnico, como fotos por anúncio), mas não existe hoje
 * upgrade/downgrade nem cobrança. Essa tela mostra o que a conta usa, não
 * vende nada — o botão de trocar de plano é trabalho de v2.0, quando a
 * monetização entrar (a própria API já documenta essa intenção em
 * `plano.routes.js`).
 */

import api from '@/lib/api';

export async function carregarMeuPlano({ sinal } = {}) {
  const dados = await api.get('/planos/minha-assinatura', undefined, { sinal });

  return {
    nome: dados.planoNome,
    origem: dados.origem === 'padrao' ? 'Plano padrão — nenhuma assinatura ativa' : 'Assinatura ativa',
    uso: (dados.uso || []).map((item) => ({
      chave: item.chave,
      descricao: item.descricao,
      periodo: item.periodo,
      usado: item.usado,
      limite: item.limite,
      ilimitado: item.ilimitado,
    })),
  };
}
