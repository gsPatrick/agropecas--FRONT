/**
 * Auditoria, do lado da administração — `GET /auditoria` e `GET /auditoria/:id`
 * (`src/features/auditoria/*` na API).
 *
 * ⚠️ Diferenças reais em relação ao mock (`lib/admin-catalogo-mock.js`):
 *  · **Sem IP em claro.** `ip_hash` nunca sai na listagem nem no detalhe —
 *    de propósito (ver comentário em `auditoria.mapper.js`). A coluna que o
 *    mock chamava de "IP" não tem de onde vir; a tela usa a origem
 *    (web/admin/api/worker) no lugar.
 *  · **Sem "alvo" em texto pronto.** O registro grava `entidade` +
 *    `entidadeId` (ex.: `usuarios` / uuid), não um nome de pessoa ou anúncio
 *    já resolvido. Mostrar o nome exigiria buscar cada entidade referenciada
 *    — fora de escopo aqui; a tela mostra entidade + os 8 primeiros
 *    caracteres do id.
 *  · **`motivo` é raro.** Só aparece quando quem agiu registrou um (ex.:
 *    exportação da trilha exige motivo). Ações de rotina (login, criar) não
 *    têm — a tela mostra "—" nesse caso, não inventa um texto.
 *  · **Categoria (sanção/conteúdo/acesso/config) é derivada, não vem da
 *    API.** A API grava um verbo (`acao`) de um enum fixo
 *    (`AUDITORIA_ACAO`); o agrupamento em 4 categorias é só apresentação —
 *    ver `CATEGORIA_DA_ACAO` abaixo.
 *  · **Contagem por categoria é só da página carregada**, não do total real:
 *    a API não tem endpoint de contagem agregada por categoria, e somar isso
 *    exigiria buscar a tabela inteira no cliente. Documentado aqui em vez de
 *    forjar um número.
 */

import api from '@/lib/api';

export const TIPOS_REGISTRO = [
  { id: 'todos', rotulo: 'Tudo' },
  { id: 'sancao', rotulo: 'Sanções' },
  { id: 'conteudo', rotulo: 'Conteúdo' },
  { id: 'acesso', rotulo: 'Acesso a dados' },
  { id: 'config', rotulo: 'Configurações' },
];

/** `acao` (enum do banco) → categoria de apresentação da tela */
const CATEGORIA_DA_ACAO = {
  suspender: 'sancao',
  banir: 'sancao',
  reprovar: 'sancao',

  criar: 'conteudo',
  editar: 'conteudo',
  remover: 'conteudo',
  restaurar: 'conteudo',
  ocultar: 'conteudo',
  publicar: 'conteudo',
  aprovar: 'conteudo',
  moderar: 'conteudo',

  acessar_dado_pessoal: 'acesso',
  exportar_dados: 'acesso',
  consultar: 'acesso',
  anonimizar: 'acesso',
  login: 'acesso',
  logout: 'acesso',

  configurar: 'config',
  enviar_comunicado: 'config',
};

export const TOM_DA_CATEGORIA = {
  sancao: { rotulo: 'Sanção', tom: 'perigo' },
  conteudo: { rotulo: 'Conteúdo', tom: 'alerta' },
  acesso: { rotulo: 'Acesso a dados', tom: 'info' },
  config: { rotulo: 'Configuração', tom: 'neutro' },
};

/** "há 2 horas" — mesma lógica de `lib/dados/admin-comunicados.js` */
function quando(iso) {
  if (!iso) return '';

  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (Number.isNaN(minutos)) return '';

  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} ${horas === 1 ? 'hora' : 'horas'}`;

  const dias = Math.floor(horas / 24);
  if (dias < 30) return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;

  const meses = Math.floor(dias / 30);
  return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
}

const ROTULO_ACAO = {
  criar: 'Criou',
  editar: 'Editou',
  remover: 'Removeu',
  restaurar: 'Restaurou',
  ocultar: 'Ocultou',
  publicar: 'Publicou',
  aprovar: 'Aprovou',
  reprovar: 'Reprovou',
  suspender: 'Suspendeu',
  banir: 'Baniu',
  login: 'Entrou',
  logout: 'Saiu',
  exportar_dados: 'Exportou dados',
  acessar_dado_pessoal: 'Acessou dado pessoal',
  anonimizar: 'Anonimizou',
  consultar: 'Consultou',
  configurar: 'Alterou configuração',
  enviar_comunicado: 'Enviou comunicado',
  moderar: 'Moderou',
};

function paraLinha(item) {
  const categoria = CATEGORIA_DA_ACAO[item.acao] || 'config';

  return {
    id: item.id,
    tipo: categoria,
    quem: item.ator?.nome || 'Sistema',
    acao: ROTULO_ACAO[item.acao] || item.acao,
    alvo: item.entidade ? `${item.entidade}${item.entidadeId ? ` · ${item.entidadeId.slice(0, 8)}` : ''}` : '—',
    motivo: item.motivo || '—',
    origem: item.origem || '—',
    quando: quando(item.criadoEm),
    criadoEm: item.criadoEm,
  };
}

/**
 * Trilha de auditoria — `GET /auditoria`.
 *
 * A API exige janela de tempo (30 dias por padrão, 366 no máximo) e pagina em
 * no máximo 100 por página; não há "sem filtro". A tela usa os padrões do
 * backend quando nenhum filtro é passado.
 */
export async function listarAuditoria({ pagina, porPagina, acao, entidade, atorId, de, ate, sinal } = {}) {
  const { dados, meta } = await api.listar(
    '/auditoria',
    { pagina, porPagina, acao, entidade, atorId, de, ate },
    { sinal }
  );

  return {
    itens: (dados || []).map(paraLinha),
    pagina: meta.pagina || 1,
    porPagina: meta.porPagina || 20,
    total: meta.total || 0,
    totalPaginas: meta.totalPaginas || 1,
  };
}

/**
 * Diferenças de um registro (antes/depois) — `GET /auditoria/:id`.
 *
 * `antes`/`depois` só existem para ações que alteraram algo (ex.: `editar`);
 * ações de leitura (`login`, `consultar`) vêm com os dois `null`. A função
 * devolve só as chaves que mudaram, sem tentar "explicar" o diff além do que
 * o JSON permite.
 */
export async function obterDiferencaAuditoria(id) {
  const registro = await api.get(`/auditoria/${id}`);

  const antes = registro.antes || {};
  const depois = registro.depois || {};
  const chaves = new Set([...Object.keys(antes), ...Object.keys(depois)]);

  const mudancas = [...chaves]
    .filter((chave) => JSON.stringify(antes[chave]) !== JSON.stringify(depois[chave]))
    .map((chave) => ({ campo: chave, de: antes[chave] ?? null, para: depois[chave] ?? null }));

  return { ...paraLinha(registro), mudancas };
}
