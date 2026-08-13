/**
 * Origem de dados da vitrine pública (`/anuncios`).
 *
 * Este arquivo existe para que a página continue falando o vocabulário dela
 * (`titulo`, `preco`, `cidade`, `quando`) enquanto a API fala o dela
 * (`precoCentavos`, `municipio`, `publicadoEm`). A tradução mora aqui, num
 * lugar só: espalhar `precoCentavos / 100` pelos componentes é como se acaba
 * com três formatações de dinheiro diferentes na mesma tela.
 *
 * Regra que vale para tudo abaixo: **nada aqui inventa dado**. Quando a API
 * não tem o campo, o valor cai num neutro visível e a lacuna está anotada.
 */

import { api } from '@/lib/api';
import { CATEGORIAS } from '@/lib/anuncios';

/* ── formatação ───────────────────────────────────────────────── */

const MOEDA = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/** a API guarda dinheiro em centavos inteiros; a tela mostra reais */
function formatarPreco(anuncio) {
  if (anuncio.precoACombinar) return null;
  if (anuncio.precoCentavos === null || anuncio.precoCentavos === undefined) return null;

  return MOEDA.format(anuncio.precoCentavos / 100);
}

/* o card mostra a condição como rótulo curto. `nao_se_aplica` some da tela em
   vez de virar texto: serviço não tem condição, e escrever isso só ocupa o
   canto da foto com informação vazia */
const CONDICAO = {
  nova: 'Nova',
  usada: 'Usada',
  recondicionada: 'Recondicionada',
  nao_se_aplica: null,
};

/* o ícone do rodapé identifica que tipo de gente publicou — a API devolve o
   tipo do perfil, o front tem o desenho correspondente */
const ICONE_PERFIL = {
  loja: 'store',
  prestador: 'wrench',
  produtor: 'tractor',
};

/**
 * "há 2 horas" em vez de uma data ISO.
 *
 * Anúncio é mercadoria perecível: o que importa não é o dia 11/08, é se foi
 * hoje ou faz uma semana. Feito à mão porque `Intl.RelativeTimeFormat` ainda
 * exigiria a mesma escolha de unidade — e não vale uma dependência.
 */
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

/* ── tradução API → card ──────────────────────────────────────── */

/**
 * Um item da vitrine no formato que `AdCard` já espera.
 *
 * LACUNA — localização: a base atual devolve `municipio: null` e `uf: null` em
 * boa parte dos anúncios (o cadastro ainda não exige endereço). Em vez de
 * chutar "Tangará da Serra · MT", o card mostra um neutro; assim que o
 * cadastro passar a gravar município, o texto aparece sozinho.
 */
export function paraCard(anuncio) {
  return {
    id: anuncio.id,
    tipo: anuncio.tipo,
    titulo: anuncio.titulo,
    preco: formatarPreco(anuncio),
    precoNumero:
      anuncio.precoCentavos === null || anuncio.precoCentavos === undefined
        ? null
        : anuncio.precoCentavos / 100,
    condicao: CONDICAO[anuncio.condicao] ?? null,
    cidade: anuncio.municipio?.nome || 'Local não informado',
    uf: anuncio.uf || '—',
    autor: anuncio.anunciante?.nomeExibicao || 'Anunciante',
    perfilIcone: ICONE_PERFIL[anuncio.anunciante?.tipo] || 'tractor',
    quando: quando(anuncio.publicadoEm || anuncio.criadoEm),
    /* miniatura quando existe: a grade mostra o card em ~360px e baixar a foto
       cheia para isso é banda jogada fora no 4G do campo */
    foto: anuncio.capa?.urlThumb || anuncio.capa?.url || null,
    icone: anuncio.categoria?.icone || (anuncio.tipo === 'servico' ? 'wrench' : 'gear'),
    categoriaId: anuncio.categoria?.id || null,
    /* só existe quando a listagem foi pedida com `ordenar=proximidade` — a
       API calcula no banco e devolve pronto; sem isso o front não tem como
       ordenar por distância sem baixar a base inteira */
    distanciaKm: anuncio.distanciaKm ?? null,
  };
}

/* ── consultas ────────────────────────────────────────────────── */

/**
 * Vitrine paginada — `GET /anuncios`.
 *
 * A paginação e o total vêm da `meta` da API, nunca do tamanho do array: a
 * página tem 20 itens e o acervo tem 16 mil, e é o total que o usuário lê.
 */
export async function listarAnuncios({
  pagina = 1,
  porPagina = 20,
  categoriaId,
  ordenar = 'recentes',
  /* origem da proximidade: cidade+uf é o que o `NearbyHeader` já resolve
     (CEP, geolocalização ou digitação) — o serviço traduz para coordenada da
     sede do município, a mesma lógica que a busca usa */
  cidade,
  uf,
  sinal,
} = {}) {
  const { dados, meta } = await api.listar(
    '/anuncios',
    { pagina, porPagina, categoriaId, ordenar, cidade, uf },
    { sinal }
  );

  return {
    itens: (dados || []).map(paraCard),
    meta: {
      pagina: meta?.pagina ?? pagina,
      porPagina: meta?.porPagina ?? porPagina,
      total: meta?.total ?? (dados || []).length,
      totalPaginas: meta?.totalPaginas ?? 1,
    },
  };
}

/**
 * Chips de categoria — `GET /catalogo/categorias`.
 *
 * Só as raízes: a árvore tem subcategoria ("Filtro de ar" dentro de "Filtros e
 * lubrificantes") e uma barra com quarenta chips não é um filtro, é uma lista.
 * O refino fino é papel da /busca.
 *
 * "Todas" é acrescentado aqui porque não é uma categoria do catálogo — é a
 * ausência de filtro, e a API não teria por que devolver isso.
 */
export async function listarCategorias({ sinal } = {}) {
  const dados = await api.get('/catalogo/categorias', undefined, { sinal });

  const raizes = (dados || [])
    .filter((item) => item.ativo !== false && !item.parentId)
    .map((item) => ({
      id: item.id,
      label: item.nome,
      icone: item.icone || 'gear',
    }));

  /* catálogo vazio não deve apagar a barra de filtros: sem chip nenhum a
     seção vira uma faixa em branco no meio da página */
  if (!raizes.length) return CATEGORIAS;

  return [{ id: 'todas', label: 'Todas', icone: 'grid' }, ...raizes];
}
