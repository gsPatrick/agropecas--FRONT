/**
 * Menu do painel — dado, não código.
 *
 * Existe num arquivo só porque a sidebar (desktop) e a barra inferior (mobile)
 * precisam concordar sobre o que existe. Duas listas escritas à mão divergiriam
 * no primeiro item novo, e o usuário veria uma seção no computador que não
 * existe no celular.
 *
 * Os três perfis compartilham o mesmo menu. Só um item muda — o que a cliente
 * definiu como exclusivo de cada um (Maturacao/05 §2) — e ele vem da sessão,
 * em `perfil.exclusiva`.
 */

/** Itens da barra inferior no mobile. Máximo 4 + a ação central. */
export const MOBILE_MAX = 4;

export function montarMenu(perfil) {
  return [
    {
      titulo: 'Principal',
      itens: [
        { href: '/painel', rotulo: 'Início', icone: 'home', exato: true, mobile: true },
        { href: '/painel/anuncios', rotulo: 'Meus anúncios', icone: 'grid', mobile: true },
        { href: '/painel/mensagens', rotulo: 'Mensagens', icone: 'mail', mobile: true, contador: 'mensagens' },
        { href: '/painel/favoritos', rotulo: 'Favoritos', icone: 'heart' },
      ],
    },
    {
      titulo: 'Meu negócio',
      itens: [
        { href: '/painel/perfil', rotulo: 'Perfil público', icone: 'user', mobile: true },
        /* o item que muda entre produtor, loja e prestador */
        perfil.exclusiva,
        { href: '/painel/desempenho', rotulo: 'Desempenho', icone: 'chart' },
      ],
    },
    {
      titulo: 'Conta',
      itens: [
        /* Notificações não está aqui de propósito: vive no sino do cabeçalho,
           sempre à mão. Repetida na barra lateral, seriam dois caminhos para a
           mesma coisa — e dois contadores para manter em acordo */
        { href: '/painel/configuracoes', rotulo: 'Configurações', icone: 'gear' },
      ],
    },
  ];
}

/**
 * Os tipos de anúncio. Vem de `ANUNCIO_TIPO` no backend.
 *
 * Qualquer perfil pode publicar qualquer um — a tabela §6 do documento da
 * cliente dá "Anunciar: Sim" aos três. O perfil só define qual vem
 * pré-selecionado.
 */
export const TIPOS_ANUNCIO = [
  { id: 'peca', rotulo: 'Peça', icone: 'gear', descricao: 'Item físico à venda ou troca' },
  { id: 'servico', rotulo: 'Serviço', icone: 'wrench', descricao: 'Mão de obra, reparo, manutenção' },
  { id: 'maquina', rotulo: 'Máquina', icone: 'tractor', descricao: 'Trator, implemento, colheitadeira' },
];

export const tipoPadrao = (perfil) =>
  TIPOS_ANUNCIO.find((t) => t.id === perfil.tipoPadrao) || TIPOS_ANUNCIO[0];

/**
 * A ação principal fica no centro da barra inferior — padrão de aplicativo:
 * o polegar alcança o centro sem reposicionar a mão.
 *
 * O rótulo acompanha o tipo mais provável do perfil («Anunciar serviço» para o
 * prestador), mas o destino é o mesmo para todos: a página pergunta o tipo e
 * deixa trocar. Travar o botão num tipo esconderia metade do produto de quem
 * faz as duas coisas — e no campo é comum a oficina vender peça também.
 */
export const acaoPrincipal = (perfil) => {
  const tipo = tipoPadrao(perfil);

  return {
    href: `/painel/anuncios/novo?tipo=${tipo.id}`,
    rotulo: `Anunciar ${tipo.rotulo.toLowerCase()}`,
    curto: 'Anunciar',
    icone: 'plus',
  };
};

/** achata o menu e devolve só o que vai para a barra inferior */
export function itensMobile(perfil) {
  return montarMenu(perfil)
    .flatMap((grupo) => grupo.itens)
    .filter((item) => item?.mobile)
    .slice(0, MOBILE_MAX);
}

/**
 * O que a barra inferior NÃO comporta.
 *
 * A barra tem quatro vagas por limite de toque, mas o menu tem nove itens —
 * os cinco restantes precisam de outra porta, senão existem no computador e
 * somem no celular. Essa porta é o menu do avatar, no cabeçalho.
 *
 * Derivado de `itensMobile`, não escrito à mão: uma segunda lista divergiria
 * assim que um item entrasse ou saísse da barra, e o item ficaria inalcançável
 * sem ninguém notar.
 */
export function itensExtras(perfil) {
  const naBarra = new Set(itensMobile(perfil).map((item) => item.href));

  return montarMenu(perfil)
    .map((grupo) => ({
      ...grupo,
      itens: grupo.itens.filter((item) => item && !naBarra.has(item.href)),
    }))
    .filter((grupo) => grupo.itens.length);
}

/**
 * Nome da seção aberta — o rótulo da barra do topo.
 *
 * Sai do mesmo menu que a sidebar usa: escrever «Meus anúncios» à mão na barra
 * faria os dois nomes divergirem no dia em que o item fosse renomeado.
 */
export function rotuloAtual(perfil, caminho) {
  const itens = montarMenu(perfil).flatMap((grupo) => grupo.itens).filter(Boolean);

  /* o mais específico primeiro: `/painel/anuncios` tem de vencer `/painel`,
     que casaria com tudo */
  const encontrado = itens
    .slice()
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => estaAtivo(item, caminho));

  return encontrado?.rotulo || 'Painel';
}

/**
 * Qual item está ativo.
 *
 * `exato` existe por causa de `/painel`: sem ele, a raiz ficaria acesa em
 * todas as subpáginas, e a barra inferior mostraria dois itens ativos.
 */
export function estaAtivo(item, caminho) {
  if (!item) return false;
  return item.exato ? caminho === item.href : caminho.startsWith(item.href);
}
