/**
 * Camadas do mapa.
 *
 * Todas gratuitas e **sem chave** — a decisão do §9.4 foi sair do Google
 * justamente para não depender de chave paga. Cada uma exige a atribuição do
 * provedor, que não é enfeite: é a condição de uso.
 *
 * A escolha das cinco não é estética. No campo cada uma responde a uma
 * pergunta diferente:
 *
 *   · **Padrão** — nomes de rua e estrada. É como se acha um endereço urbano.
 *   · **Satélite** — o que existe no chão. Para fazenda sem rua nomeada, é a
 *     única forma de reconhecer o galpão, o pivô, a sede.
 *   · **Híbrido** — satélite com os nomes por cima. Resolve o problema do
 *     satélite puro, onde não dá para saber que rodovia é aquela.
 *   · **Relevo** — sombreamento do terreno. É o mais próximo de uma leitura
 *     tridimensional e ajuda a reconhecer serra, vale e divisa de água.
 *   · **Topográfico** — curvas de nível e trilhas, para propriedade em região
 *     acidentada.
 */

export const CAMADAS = [
  {
    id: 'padrao',
    rotulo: 'Padrão',
    icone: 'grid',
    descricao: 'Ruas e estradas com nome',
    urls: ['https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'],
    atribuicao: '© OpenStreetMap',
    maxZoom: 19,
  },
  {
    id: 'satelite',
    rotulo: 'Satélite',
    icone: 'eye',
    descricao: 'Imagem real do terreno',
    urls: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    ],
    atribuicao: '© Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
  {
    id: 'hibrido',
    rotulo: 'Híbrido',
    icone: 'pin',
    descricao: 'Satélite com nomes por cima',
    /* duas telas empilhadas: a imagem embaixo e os rótulos, transparentes,
       em cima. É o que torna o satélite utilizável para achar endereço */
    urls: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    ],
    atribuicao: '© Esri, Maxar',
    maxZoom: 19,
  },
  {
    id: 'relevo',
    rotulo: 'Relevo',
    icone: 'leaf',
    descricao: 'Sombreamento do terreno',
    urls: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}',
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    ],
    atribuicao: '© Esri',
    maxZoom: 16,
  },
  {
    id: 'topografico',
    rotulo: 'Topográfico',
    icone: 'chart',
    descricao: 'Curvas de nível e trilhas',
    urls: ['https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'],
    atribuicao: '© OpenTopoMap · © OpenStreetMap',
    maxZoom: 17,
  },
];

export const CAMADA_PADRAO = 'padrao';
