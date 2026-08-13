/**
 * Menu do painel administrativo — dado, não código.
 *
 * Espelha os sete grupos do módulo `admin` da API (painel, usuários, conteúdo,
 * catálogo, comunidade, plataforma, conformidade). Seguir a mesma divisão do
 * backend não é preguiça: é o que faz "onde mexo nisso?" ter a mesma resposta
 * na tela e no código, e o que evita a interface inventar um recorte que a API
 * não sabe atender.
 *
 * A administração tem **poder total de intervenção** — sobre anúncio, usuário,
 * conversa e catálogo —, mas o fluxo segue o documento da cliente. Por isso as
 * telas destrutivas ficam agrupadas e sinalizadas, nunca soltas no meio de
 * uma listagem.
 */

export function montarMenuAdmin() {
  return [
    {
      titulo: 'Operação',
      itens: [
        { href: '/admin', rotulo: 'Visão geral', icone: 'home', exato: true },
        { href: '/admin/moderacao', rotulo: 'Moderação', icone: 'check', contador: 'moderacao' },
        { href: '/admin/denuncias', rotulo: 'Denúncias', icone: 'bell', contador: 'denuncias' },
      ],
    },
    {
      titulo: 'Conteúdo e pessoas',
      itens: [
        { href: '/admin/anuncios', rotulo: 'Anúncios', icone: 'grid' },
        { href: '/admin/usuarios', rotulo: 'Usuários', icone: 'user', contador: 'usuarios' },
        { href: '/admin/conversas', rotulo: 'Conversas', icone: 'mail' },
      ],
    },
    {
      titulo: 'Plataforma',
      itens: [
        { href: '/admin/catalogo', rotulo: 'Catálogo', icone: 'store' },
        /* Planos fica de fora enquanto não houver cobrança: um item de menu
           que abre uma tela sem uso ensina a ignorar o menu */
        { href: '/admin/comunicados', rotulo: 'Comunicados', icone: 'bell' },
        { href: '/admin/configuracoes', rotulo: 'Configurações', icone: 'gear' },
      ],
    },
    {
      titulo: 'Conformidade',
      itens: [
        { href: '/admin/lgpd', rotulo: 'LGPD', icone: 'eye-off', contador: 'lgpd' },
        /* ao lado da LGPD e não em "Plataforma": editar os Termos não é
           configurar o produto, é publicar documento com efeito jurídico —
           e a consequência (reaceite de toda a base) é a mesma conversa que
           se tem na tela ao lado */
        { href: '/admin/termos', rotulo: 'Documentos legais', icone: 'edit' },
        { href: '/admin/auditoria', rotulo: 'Auditoria', icone: 'clock' },
      ],
    },
  ];
}

/**
 * Os quatro destinos da barra inferior, no celular.
 *
 * Quatro é o teto do padrão: acima disso os alvos ficam estreitos e o toque
 * erra. A escolha segue o que se faz no telefone — conferir o que chegou e
 * decidir —, não o que se faz sentado: catálogo, planos e configurações são
 * trabalho de mesa.
 */
export const ITENS_MOBILE_ADMIN = ['/admin', '/admin/moderacao', '/admin/denuncias', '/admin/usuarios'];

export const itensMobileAdmin = () =>
  ITENS_MOBILE_ADMIN.map((href) => itensAdmin().find((item) => item.href === href)).filter(Boolean);

/**
 * O que a barra inferior NÃO comporta.
 *
 * Derivado da lista acima, e não escrito à mão: uma segunda lista divergiria
 * assim que um item entrasse na barra, e a seção ficaria inalcançável no
 * celular sem ninguém notar.
 */
export function itensExtrasAdmin() {
  return montarMenuAdmin()
    .map((grupo) => ({
      ...grupo,
      itens: grupo.itens.filter((item) => !ITENS_MOBILE_ADMIN.includes(item.href)),
    }))
    .filter((grupo) => grupo.itens.length);
}

/** achata o menu — usado pelo rótulo da barra do topo e pela busca de ações */
export const itensAdmin = () => montarMenuAdmin().flatMap((grupo) => grupo.itens);

export function estaAtivo(item, caminho) {
  if (!item) return false;
  return item.exato ? caminho === item.href : caminho.startsWith(item.href);
}

export function rotuloAtualAdmin(caminho) {
  const encontrado = itensAdmin()
    .slice()
    /* o mais específico primeiro: `/admin/anuncios` tem de vencer `/admin`,
       que casaria com tudo */
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => estaAtivo(item, caminho));

  return encontrado?.rotulo || 'Administração';
}
