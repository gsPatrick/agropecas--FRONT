/**
 * O que sobrou deste arquivo depois que `/anuncios`, `/busca` e o detalhe do
 * anúncio passaram a ler tudo de `lib/dados/anuncios.js`/`lib/dados/anuncio.js`
 * (API real): duas coisas sem dado nenhum embutido.
 *
 *  · `CATEGORIAS` — vocabulário de RESERVA para o filtro de categoria, usado
 *    só enquanto `GET /catalogo/categorias` não respondeu ou falhou (ver
 *    `lib/dados/busca.js`). Não é conteúdo fingindo ser real: é o que a tela
 *    mostra por um instante, ou se a API cair, para o filtro não sumir.
 *  · `iniciais(nome)` — função pura, sem dado nenhum, usada para desenhar o
 *    avatar de texto ("Carlos Menezes" → "CM") em várias telas de chat.
 */

export const CATEGORIAS = [
  { id: 'todas', label: 'Todas', icone: 'grid' },
  { id: 'correia', label: 'Correias', icone: 'belt' },
  { id: 'rolamento', label: 'Rolamentos', icone: 'bearing' },
  { id: 'filtro', label: 'Filtros', icone: 'filter' },
  { id: 'bomba', label: 'Bombas', icone: 'pump' },
  { id: 'cruzeta', label: 'Cruzetas', icone: 'cross' },
  { id: 'servico', label: 'Serviços', icone: 'wrench' },
];

export function iniciais(nome) {
  return nome
    .split(' ')
    .filter((parte) => parte.length > 2)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase();
}
