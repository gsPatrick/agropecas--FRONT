/**
 * Origem de dados de `/painel/desempenho` — o mesmo `GET /relatorios/desempenho`
 * já usado pelo dashboard (`lib/dados/painel.js`), só que aqui o `porAnuncio`
 * (ranking dos próprios anúncios no período) vira os cartões "mais vistos" e
 * "vistos, mas sem contato" em vez de alimentar contagem de contato por linha.
 *
 * ⚠️ Duas seções do mock não têm de onde vir:
 *  · **"De onde vêm as visitas"** (busca/categoria/proximidade/perfil) — a
 *    API não rastreia POR QUE TELA a pessoa chegou no anúncio, só QUANTAS
 *    vezes (`anuncio_metricas_diarias`). Rastrear origem de clique é feature
 *    nova (um campo `origem` já existe em `anuncio_contatos.origem`, mas cobre
 *    só quem clicou em contato — não toda visualização).
 *  · **"De onde falam com você"** (cidade de quem contatou) — `GET
 *    /anuncios/:id/contatos` não traz cidade do interessado (só nome, ver
 *    `contato.mapper.js`; a cidade do INTERESSADO nunca foi armazenada, só a
 *    do anúncio).
 * As duas ficam de fora da tela em vez de mostrar número inventado — ver
 * `app/painel/desempenho/page.js`.
 */

import api from '@/lib/api';

export const PERIODOS = [
  { id: '7d', rotulo: '7 dias', comparacao: 'período anterior', dias: 7 },
  { id: '30d', rotulo: '30 dias', comparacao: 'período anterior', dias: 30 },
  { id: '90d', rotulo: '90 dias', comparacao: 'período anterior', dias: 90 },
];

const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const DIA_MS = 86400000;

function periodoISO(dias) {
  const ate = new Date();
  const de = new Date(ate.getTime() - dias * DIA_MS);
  return { de: de.toISOString().slice(0, 10), ate: ate.toISOString().slice(0, 10) };
}

function rotuloDia(dataIso) {
  const dia = Number(dataIso.slice(8, 10));
  return String(dia || dataIso);
}

/**
 * Preenche com zero os dias do período que não têm linha na série.
 *
 * `GET /relatorios/desempenho` só devolve dia que teve QUALQUER evento
 * (`GROUP BY data` no banco) — um período de 7 dias com movimento em só um
 * deles chega com um array de 1 item, não 7. Sem isto, `PainelGrafico`
 * desenha uma coluna por ITEM do array, não por DIA do período: a única barra
 * vira um bloco esticado ocupando metade da largura do gráfico, em vez de uma
 * entre sete — o "quadradão" em vez do gráfico de tendência.
 */
function preencherDias(serie, de, ate) {
  const porData = new Map((serie || []).map((item) => [item.data, item]));
  const dias = [];

  const cursor = new Date(`${de}T00:00:00Z`);
  const fim = new Date(`${ate}T00:00:00Z`);

  while (cursor <= fim) {
    const iso = cursor.toISOString().slice(0, 10);
    dias.push(porData.get(iso) || { data: iso });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dias;
}

function formatarPreco(item) {
  if (item.precoACombinar) return 'A combinar';
  return MOEDA.format((item.precoCentavos || 0) / 100);
}

/** leitura em uma frase — mesma regra do mock, agora sobre número real:
    conversão baixa OU anúncio parado avisa; sem nenhum dos dois, é "bom" */
function lerDesempenho({ conversao, parados, totalVisualizacoes }) {
  if (!totalVisualizacoes) {
    return { tom: 'neutro', titulo: 'Ainda sem visualizações', texto: 'Publique ou espere a busca te achar — os números aparecem aqui assim que alguém ver o anúncio.' };
  }

  if (parados.length) {
    return {
      tom: 'atencao',
      titulo: `${parados.length} anúncio(s) com visita e nenhum contato`,
      texto: 'Gente está vendo e não chamando — revise preço, foto ou descrição desses anúncios.',
    };
  }

  if (conversao < 2) {
    return {
      tom: 'atencao',
      titulo: 'Conversão baixa no período',
      texto: `De cada 100 visitas, só ${conversao.toFixed(1)} viraram contato. Título e preço costumam ser o que mais pesa.`,
    };
  }

  return {
    tom: 'bom',
    titulo: 'Bom momento',
    texto: 'Suas visitas estão virando contato numa taxa saudável. Continue assim.',
  };
}

export async function carregarDesempenho(periodoId = '7d', { sinal } = {}) {
  const periodo = PERIODOS.find((item) => item.id === periodoId) || PERIODOS[0];
  const { de, ate } = periodoISO(periodo.dias);

  const dados = await api.get('/relatorios/desempenho', { de, ate, top: 20 }, { sinal });

  const totais = dados.totais || {};
  const comparacao = dados.comparacao || {};
  const totalContatos = (totais.cliques_whatsapp || 0) + (totais.conversas_iniciadas || 0);
  const contatosAnterior =
    (comparacao.cliques_whatsapp?.anterior || 0) + (comparacao.conversas_iniciadas?.anterior || 0);
  const variacaoContatos = contatosAnterior
    ? Math.round(((totalContatos - contatosAnterior) / contatosAnterior) * 100)
    : totalContatos > 0
      ? 100
      : undefined;

  const conversao = totais.visualizacoes ? (totalContatos / totais.visualizacoes) * 100 : 0;

  const ranking = (dados.porAnuncio || []).map((item) => ({
    id: item.anuncioId,
    titulo: item.titulo,
    preco: formatarPreco(item),
    vistas: item.visualizacoes || 0,
    contatos: (item.cliques_whatsapp || 0) + (item.conversas_iniciadas || 0),
    status: item.status,
  }));

  const destaques = [...ranking]
    .filter((item) => item.status === 'publicado')
    .sort((a, b) => b.vistas - a.vistas)
    .slice(0, 5);

  const parados = ranking
    .filter((item) => item.status === 'publicado' && item.vistas > 0 && item.contatos === 0)
    .slice(0, 4);

  const serieCompleta = preencherDias(dados.serie, de, ate);

  return {
    unidade: periodo.dias <= 7 ? 'dia' : periodo.dias <= 30 ? 'dia' : 'semana',
    metricas: [
      {
        chave: 'visualizacoes',
        rotulo: 'Visualizações',
        valor: totais.visualizacoes || 0,
        icone: 'eye',
        variacao: comparacao.visualizacoes?.variacaoPercentual,
      },
      {
        chave: 'contatos',
        rotulo: 'Contatos',
        valor: totalContatos,
        icone: 'phone',
        variacao: variacaoContatos,
      },
      {
        chave: 'favoritos',
        rotulo: 'Favoritados',
        valor: totais.favoritos || 0,
        icone: 'heart',
        variacao: comparacao.favoritos?.variacaoPercentual,
      },
    ],
    conversao,
    serieVisualizacoes: serieCompleta.map((item) => ({
      rotulo: rotuloDia(item.data),
      valor: item.visualizacoes || 0,
    })),
    serieContatos: serieCompleta.map((item) => ({
      rotulo: rotuloDia(item.data),
      valor: (item.cliques_whatsapp || 0) + (item.conversas_iniciadas || 0),
    })),
    destaques,
    parados,
    totalVisualizacoes: totais.visualizacoes || 0,
    leitura: lerDesempenho({ conversao, parados, totalVisualizacoes: totais.visualizacoes || 0 }),
  };
}
