/**
 * Origem dos dados da HOME.
 *
 * Fica separado dos componentes porque a home costura várias fontes da API
 * (catálogo, anúncios e os números da plataforma) numa forma só. Deixar essa
 * costura dentro de cada seção espalharia o mapeamento de campos por quatro
 * arquivos, e o dia em que a API mudar o envelope de anúncio vira quatro
 * correções.
 *
 * Toda função aqui é tolerante a falha: devolve o que der para mostrar e
 * nunca lança. A home é a porta de entrada pública — uma seção sem dado é
 * aceitável, uma tela branca não.
 */

import { api } from '@/lib/api';

/* Ícone do ladrilho e do avatar vêm do catálogo/perfil como texto livre; o
   componente Icon só conhece um conjunto fechado. Sem esse filtro, um ícone
   novo cadastrado no admin apaga o ladrilho inteiro. */
const ICONES_CONHECIDOS = new Set([
  'belt', 'bearing', 'filter', 'pump', 'cross', 'grid', 'gear',
  'tractor', 'store', 'wrench', 'pin', 'search', 'phone', 'whatsapp',
]);

const ICONE_POR_PERFIL = {
  loja: 'store',
  produtor: 'tractor',
  prestador: 'wrench',
};

const ROTULO_CONDICAO = {
  nova: 'Nova',
  usada: 'Usada',
  recondicionada: 'Recondicionada',
};

function icone(nome, padrao) {
  return ICONES_CONHECIDOS.has(nome) ? nome : padrao;
}

function formatarPreco(anuncio) {
  /* "a combinar" e preço zerado não são a mesma coisa que ausência de preço,
     mas o cartão trata os dois como "Consultar valor" — devolver string vazia
     é o contrato que ele já espera */
  if (anuncio.precoACombinar || !anuncio.precoCentavos) return '';

  return (anuncio.precoCentavos / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: anuncio.moeda || 'BRL',
  });
}

/* O cartão mostra tempo relativo em texto pronto; a API manda ISO. A conta é
   grosseira de propósito: "há 3 dias" basta, minuto exato não muda decisão. */
function tempoRelativo(iso) {
  if (!iso) return '';

  const minutos = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));

  if (minutos < 60) return minutos <= 1 ? 'agora há pouco' : `há ${minutos} minutos`;

  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} ${horas === 1 ? 'hora' : 'horas'}`;

  const dias = Math.round(horas / 24);
  if (dias < 30) return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;

  const meses = Math.round(dias / 30);
  return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
}

function textoDoMunicipio(municipio) {
  if (!municipio) return '';
  return typeof municipio === 'string' ? municipio : municipio.nome || '';
}

/** Traduz o anúncio da API para a forma que o AdCard já consome. */
export function paraCartao(anuncio) {
  const anunciante = anuncio.anunciante || {};

  return {
    id: anuncio.id,
    slug: anuncio.slug,
    tipo: anuncio.tipo,
    titulo: anuncio.titulo,
    preco: formatarPreco(anuncio),
    precoNumero: anuncio.precoCentavos ? anuncio.precoCentavos / 100 : null,
    condicao: ROTULO_CONDICAO[anuncio.condicao] || '',
    foto: anuncio.capa?.url || anuncio.capa?.urlMedia || null,
    icone: icone(anuncio.categoria?.icone, 'gear'),
    categoria: anuncio.categoria?.slug || '',
    cidade: textoDoMunicipio(anuncio.municipio),
    uf: anuncio.uf || '',
    autor: anunciante.nomeExibicao || 'Anunciante',
    perfilIcone: ICONE_POR_PERFIL[anunciante.tipo] || 'tractor',
    quando: tempoRelativo(anuncio.publicadoEm || anuncio.criadoEm),
  };
}

/**
 * Números da plataforma — a prova social da home.
 *
 * Vem de `GET /relatorios/publico`, que é aberto a visitante e devolve só
 * quatro contagens globais. Eram texto fixo ("+500 fazendas"), e texto fixo
 * em número de prova social é uma mentira com prazo: no dia em que alguém
 * confere, o produto inteiro perde credibilidade junto. Preferimos o número
 * real, mesmo menor.
 *
 * Sem `try/catch` aqui de propósito: quem chama decide o que fazer com a
 * falha, e o componente já sabe (esconde os números em vez de inventar).
 */
export async function buscarNumerosDaPlataforma({ sinal } = {}) {
  const dados = await api.get('/relatorios/publico', undefined, { sinal });

  return {
    produtores: Number(dados?.produtores) || 0,
    lojas: Number(dados?.lojas) || 0,
    prestadores: Number(dados?.prestadores) || 0,
    anunciosAtivos: Number(dados?.anunciosAtivos) || 0,
  };
}

/**
 * Vitrine da home.
 *
 * Sem local escolhido: destaques primeiro, recentes completando. Duas
 * chamadas e não uma porque a API ordena por data OU por destaque, nunca as
 * duas juntas — e ordenar depois do corte não resolve: com `porPagina=12`,
 * um destaque que esteja na página 2 dos recentes nunca apareceria por mais
 * que o front reordenasse o que recebeu. As duas vão em paralelo e o
 * complemento é pedido inteiro (não `12 - n`): pedir a diferença exigiria
 * esperar a primeira terminar para só então disparar a segunda. A
 * deduplicação por id resolve a sobreposição.
 *
 * Com local escolhido: uma chamada só, `ordenar=proximidade`. A distância é
 * calculada no banco a partir da cidade/UF que o `NearbyHeader` resolveu
 * (CEP, geolocalização ou digitação) — não existe mais reordenação no
 * cliente, que só rearranjava os itens que por acaso já tinham chegado.
 */
export async function buscarAnunciosDaVitrine({
  uf,
  cidade,
  quantidade = 12,
  ordenar = 'recentes',
  sinal,
} = {}) {
  if (ordenar === 'proximidade' && cidade) {
    const { dados } = await api.listar(
      '/anuncios',
      { porPagina: quantidade, ordenar, cidade, uf },
      { sinal }
    );

    return dados.map(paraCartao);
  }

  const pedir = (extras) =>
    api.listar('/anuncios', { porPagina: quantidade, ordenar: 'recentes', uf, ...extras }, { sinal });

  const [destacados, recentes] = await Promise.all([
    /* destaque é o que a loja pagou para aparecer — se falhar, a vitrine não
       pode sumir junto; segue só com os recentes */
    pedir({ destaque: true }).catch(() => ({ dados: [] })),
    pedir({}),
  ]);

  const vistos = new Set();

  return [...destacados.dados, ...recentes.dados]
    .filter((anuncio) => !vistos.has(anuncio.id) && vistos.add(anuncio.id))
    .slice(0, quantidade)
    .map(paraCartao);
}

/**
 * Atalhos de "peças mais procuradas".
 *
 * A curadoria agora vem filtrada da própria API (`destaque=true`), e não de
 * um `filter` sobre o catálogo inteiro: baixar a árvore toda para descartar a
 * maior parte dela era trabalho jogado fora no 3G do interior, e escondia o
 * caso em que os destaques não cabem na primeira leva.
 *
 * A segunda chamada é a rede de segurança: catálogo sem nenhum destaque
 * marcado ainda precisa mostrar atalhos, então cai nas raízes de peça. Ela só
 * acontece quando a primeira volta vazia — no caminho normal é uma requisição
 * só, como antes.
 *
 * O ladrilho "Ver todas" não vem da API: ele é navegação, não conteúdo.
 */
export async function buscarCategoriasEmDestaque({ quantidade = 5, sinal } = {}) {
  const pedir = (extras) => api.listar('/catalogo/categorias', { tipo: 'peca', ...extras }, { sinal });

  const { dados: destacadas } = await pedir({ destaque: true });
  const dados = destacadas.length ? destacadas : (await pedir({})).dados;

  return dados
    .filter((categoria) => categoria.ativo !== false)
    .slice(0, quantidade)
    .map((categoria) => ({
      id: categoria.slug,
      icon: icone(categoria.icone, 'gear'),
      label: categoria.nome,
    }));
}
