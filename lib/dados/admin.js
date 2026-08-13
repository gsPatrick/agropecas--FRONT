/**
 * Origem de dados do painel administrativo — visão geral (`/admin`) e os
 * contadores do menu (`AdminShell`).
 *
 * Endpoints usados, todos atrás de `autenticar + autorizar('admin.acessar')`
 * e, dentro disso, de capacidades por bloco (`cap.usuarios/anuncios/
 * denuncias/perfis/planos`) — um moderador ou suporte pode receber menos
 * campos do que um admin, nunca um erro; por isso todo acesso a campo aqui é
 * defensivo (`?? 0`, opcional encadeado), nunca assume que o bloco veio:
 *
 *   GET /admin/painel               → contadores do dia + total de pendências
 *   GET /admin/painel/pendencias    → fila de trabalho (denúncia/anúncio/lgpd/perfil)
 *   GET /admin/painel/metricas      → série diária de usuários/anúncios/denúncias
 *   GET /admin/painel/atividade     → trilha administrativa (exige escopo total
 *                                      de auditoria — suporte/moderador tomam 403)
 *   GET /admin/painel/saude         → saúde de banco/cache/filas (só Admin —
 *                                      moderador/suporte tomam 403 mesmo com
 *                                      `admin.acessar`, ver `admin.painel.metricas
 *                                      .service.js:saude`)
 *
 * ⚠️ Duas lacunas conhecidas, sem equivalente no backend hoje:
 *  · Não existe "cadastro aguardando aprovação prévia" — a API ativa o
 *    cadastro na hora. O card antigo (`lib/admin-mock.js`) virou "Perfis a
 *    verificar" (`perfisAguardandoVerificacao`), o pendente real mais
 *    próximo.
 *  · Não existe contador dedicado de "conversas na semana" no painel admin —
 *    o KPI equivalente virou "Anúncios publicados hoje", que a API já expõe.
 */

import api from '@/lib/api';

/* ── utilidades ───────────────────────────────────────────────────────── */

function ultimosNDias(n) {
  const hoje = new Date();
  const ate = hoje.toISOString().slice(0, 10);
  const de = new Date(hoje.getTime() - (n - 1) * 86400000).toISOString().slice(0, 10);
  return { de, ate };
}

/** "2026-08-05" → "5": rótulo curto para o eixo do gráfico de 14 dias */
function rotuloDia(dataIso) {
  const dia = Number(dataIso.slice(8, 10));
  return String(dia || dataIso);
}

/** compara a primeira metade da série com a segunda — sem inventar variação
    quando não há pontos suficientes para comparar */
function variacaoPercentual(serie) {
  if (!Array.isArray(serie) || serie.length < 2) return undefined;

  const metade = Math.floor(serie.length / 2);
  const antes = serie.slice(0, metade).reduce((soma, item) => soma + (item.total || 0), 0);
  const depois = serie.slice(metade).reduce((soma, item) => soma + (item.total || 0), 0);

  if (antes === 0) return depois > 0 ? 100 : undefined;
  return Math.round(((depois - antes) / antes) * 100);
}

const MINUTO = 60000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

/** "2026-08-12T14:02:00Z" → "há 5 min" / "há 2 h" / "ontem" / "há 4 dias" */
function haTempo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < MINUTO) return 'agora';
  if (diff < HORA) return `há ${Math.round(diff / MINUTO)} min`;
  if (diff < DIA) return `há ${Math.round(diff / HORA)} h`;
  if (diff < 2 * DIA) return 'ontem';
  return `há ${Math.round(diff / DIA)} dias`;
}

/** sem tabela de tradução por código de ação: o texto cru já é legível — só
    troca "_" por espaço para não expor o nome interno do evento */
function textoDaAcao(acao) {
  return String(acao || '').replace(/_/g, ' ');
}

function iconeDaAcao(acao) {
  const chave = String(acao || '');
  if (/aprov|public|verific/.test(chave)) return 'check';
  if (/suspend|ban|ocult/.test(chave)) return 'eye-off';
  if (/remov|exclu|reprov/.test(chave)) return 'close';
  if (/cri[ae]r?/.test(chave)) return 'plus';
  return 'clock';
}

/* ── chamadas ─────────────────────────────────────────────────────────── */

export const carregarResumo = ({ sinal } = {}) => api.get('/admin/painel', undefined, { sinal });

/** o controller manda os itens como `dados` direto e `{total, calculadoEm}`
    em `meta` — não `{itens, total, calculadoEm}` dentro de `dados` */
export async function carregarPendencias({ sinal } = {}) {
  const { dados, meta } = await api.listar('/admin/painel/pendencias', undefined, { sinal });
  return { itens: dados || [], total: meta?.total, calculadoEm: meta?.calculadoEm };
}

export const carregarMetricas = ({ de, ate, sinal } = {}) =>
  api.get('/admin/painel/metricas', { de, ate }, { sinal });

/** 403 para quem não tem escopo total de auditoria (suporte/moderador) — a
    ausência do bloco na tela é o comportamento certo, não um erro para
    mostrar */
async function tentarCarregarAtividade({ sinal }) {
  try {
    const { dados } = await api.listar('/admin/painel/atividade', { porPagina: 6 }, { sinal });
    return dados || [];
  } catch {
    return null;
  }
}

/** 403 para quem não é Admin — mesmo raciocínio da atividade */
async function tentarCarregarSaude({ sinal }) {
  try {
    return await api.get('/admin/painel/saude', undefined, { sinal });
  } catch {
    return null;
  }
}

/* ── tradução API → forma que a tela de visão geral já desenhava ───────── */

function paraMetricas(contadores) {
  const c = contadores || {};

  return [
    { chave: 'usuarios', rotulo: 'Usuários', valor: c.usuariosTotal ?? 0, icone: 'user' },
    { chave: 'anuncios', rotulo: 'Anúncios ativos', valor: c.anunciosAtivos ?? 0, icone: 'grid' },
    {
      chave: 'publicados',
      rotulo: 'Publicados hoje',
      valor: c.anunciosPublicados ?? 0,
      icone: 'check',
    },
    { chave: 'novos', rotulo: 'Cadastros hoje', valor: c.usuariosNovos ?? 0, icone: 'plus' },
  ];
}

function paraPendencias(contadores, itensPendencias) {
  const c = contadores || {};
  const lgpd = (itensPendencias || []).filter((item) => item.tipo === 'lgpd').length;

  return [
    {
      id: 'moderacao',
      rotulo: 'Anúncios em análise',
      valor: c.anunciosNaFila ?? 0,
      href: '/admin/moderacao',
      urgente: (c.anunciosNaFila ?? 0) > 2,
      detalhe: 'Aguardando aprovação para ir ao ar',
    },
    {
      id: 'denuncias',
      rotulo: 'Denúncias abertas',
      valor: c.denunciasAbertas ?? 0,
      href: '/admin/denuncias',
      urgente: (c.denunciasAbertas ?? 0) > 3,
      detalhe: 'Sem resposta da moderação',
    },
    {
      id: 'lgpd',
      rotulo: 'Pedidos de LGPD',
      valor: lgpd,
      href: '/admin/lgpd',
      urgente: lgpd > 0,
      detalhe: 'Prazo legal corre desde o pedido',
    },
    {
      id: 'perfis',
      rotulo: 'Perfis a verificar',
      valor: c.perfisAguardandoVerificacao ?? 0,
      href: '/admin/usuarios',
      urgente: false,
      detalhe: 'Loja ou prestador sem o selo de verificado',
    },
  ];
}

function paraSerie(porDia) {
  return (porDia || []).map((item) => ({ rotulo: rotuloDia(item.dia), valor: item.total || 0 }));
}

function paraAtividade(itens) {
  if (!itens) return null;

  return itens.map((item) => ({
    id: item.id,
    quem: item.ator?.nome || (item.atorPapel === 'sistema' ? 'Sistema' : 'Administração'),
    acao: textoDaAcao(item.acao),
    alvo: item.entidade ? `${item.entidade} #${String(item.entidadeId ?? item.entidade_id ?? '').slice(0, 8)}` : '',
    quando: haTempo(item.criadoEm ?? item.criado_em),
    icone: iconeDaAcao(item.acao),
  }));
}

function paraSaude(saude) {
  if (!saude) return null;

  return [
    {
      id: 'banco',
      rotulo: 'Banco de dados',
      estado: saude.banco?.ok ? 'ok' : 'falha',
      detalhe: saude.banco?.latenciaMs != null ? `Latência ${saude.banco.latenciaMs} ms` : '—',
    },
    {
      id: 'cache',
      rotulo: 'Cache',
      estado: saude.cache?.ok ? 'ok' : 'falha',
      detalhe: saude.cache?.redis ? 'Redis' : 'Memória local',
    },
    {
      id: 'filas',
      rotulo: 'Filas',
      estado: saude.filas?.ok ? 'ok' : 'atencao',
      detalhe: saude.filas?.latenciaMs != null ? `Latência ${saude.filas.latenciaMs} ms` : '—',
    },
    {
      id: 'processo',
      rotulo: 'Servidor',
      estado: saude.ok ? 'ok' : 'atencao',
      detalhe:
        saude.processo?.uptimeSegundos != null
          ? `No ar há ${Math.round(saude.processo.uptimeSegundos / 60)} min · ${saude.processo.memoriaMb} MB`
          : '—',
    },
  ];
}

/**
 * Tudo que a visão geral (`app/admin/page.js`) precisa, numa chamada.
 *
 * As cinco buscas correm em paralelo — são independentes, e em série o
 * carregamento custaria a soma dos tempos em vez do maior deles.
 */
export async function carregarPainelAdmin({ sinal } = {}) {
  const periodo = ultimosNDias(14);

  const [resumo, pendencias, metricas, atividade, saude] = await Promise.all([
    carregarResumo({ sinal }),
    carregarPendencias({ sinal }),
    carregarMetricas({ ...periodo, sinal }),
    tentarCarregarAtividade({ sinal }),
    tentarCarregarSaude({ sinal }),
  ]);

  const contadores = resumo?.contadores || {};
  const serieUsuarios = metricas?.usuarios?.porDia;
  const serieAnuncios = metricas?.anuncios?.porDia;

  const metricasComVariacao = paraMetricas(contadores).map((item) => {
    if (item.chave === 'novos') return { ...item, variacao: variacaoPercentual(serieUsuarios) };
    if (item.chave === 'publicados') return { ...item, variacao: variacaoPercentual(serieAnuncios) };
    return item;
  });

  return {
    metricas: metricasComVariacao,
    pendencias: paraPendencias(contadores, pendencias?.itens),
    serieCadastros: paraSerie(serieUsuarios),
    serieAnuncios: paraSerie(serieAnuncios),
    atividade: paraAtividade(atividade),
    saude: paraSaude(saude),
  };
}

/** só os contadores do menu (`AdminSidebar`/`AdminTabBar`) — usado pelo
    `AdminShell`, que envolve toda página administrativa */
export async function carregarContadoresAdmin({ sinal } = {}) {
  const [resumo, pendencias] = await Promise.all([
    carregarResumo({ sinal }),
    carregarPendencias({ sinal }),
  ]);

  const contadores = resumo?.contadores || {};

  return {
    usuarios: contadores.perfisAguardandoVerificacao ?? 0,
    moderacao: contadores.anunciosNaFila ?? 0,
    denuncias: contadores.denunciasAbertas ?? 0,
    lgpd: (pendencias?.itens || []).filter((item) => item.tipo === 'lgpd').length,
  };
}
