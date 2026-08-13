/**
 * Catálogo, do lado da administração — `GET/POST/PATCH/DELETE
 * /admin/catalogo/:colecao` (`admin.catalogo.service.js`), mais `PATCH
 * .../ordenar` para categorias e serviços (marca e máquina não têm ordem
 * manual — a própria API recusa com uma mensagem explicando o motivo).
 *
 * ⚠️ Duas coleções do mock (`lib/admin-catalogo-mock.js`) não têm CRUD real e
 * saíram da lista:
 *  · **"Tipos de máquina"** não é tabela — é ENUM de código
 *    (`MAQUINA_CATEGORIA`, 8 valores fixos), o mesmo vocabulário que já virou
 *    `TIPOS_MAQUINA` em `lib/exclusivas-mock.js`. Mudar isso é deploy, não
 *    tela de admin.
 *  · **"Formas de entrega"** e **"Raios de atendimento"** nunca foram
 *    catálogo — são só as opções fixas dos campos `formasEntrega`/
 *    `raioEntregaKm` do perfil da loja/prestador (`FORMAS_ENTREGA`,
 *    `FORMAS_ATENDIMENTO`, `RAIOS`, todos em `lib/exclusivas-mock.js`).
 *
 * Em troca, **"Máquinas" (catálogo real de modelo)** entrou — é uma coleção
 * que o mock nunca teve: marca + modelo (ex.: "John Deere 6110J"), a base do
 * "busque por máquina compatível". Estrutura diferente das outras (precisa de
 * marca + modelo, não só um nome), então o formulário de criação dela é
 * outro — ver `app/admin/catalogo/page.js`.
 *
 * **Culturas** viraram aba só de LEITURA: a tabela já nasceu seedada
 * (culturas e maquinário, sessão anterior) e não tem endpoint de escrita —
 * mudar a lista de culturas é migração, não é decisão do dia a dia do Admin.
 */

import api from '@/lib/api';

export const COLECOES = [
  { id: 'categorias-peca', rotulo: 'Categorias de peça', icone: 'gear', onde: 'Cadastro de anúncio de peça · filtros da busca', aviso: 'Apagar uma categoria em uso é recusado pela API — desative em vez de apagar.', colecao: 'categorias', tipo: 'peca' },
  { id: 'categorias-servico', rotulo: 'Categorias de serviço', icone: 'wrench', onde: 'Cadastro de anúncio de serviço · filtros da busca', aviso: 'Apagar uma categoria em uso é recusado pela API — desative em vez de apagar.', colecao: 'categorias', tipo: 'servico' },
  { id: 'marcas', rotulo: 'Marcas', icone: 'store', onde: 'Cadastro de anúncio · maquinário do produtor · filtros da busca', aviso: 'É a lista que aparece ao cadastrar peça e máquina.', colecao: 'marcas', tipo: null },
  { id: 'maquinas', rotulo: 'Máquinas (marca + modelo)', icone: 'tractor', onde: 'Maquinário do produtor · "busque por máquina" no anúncio de peça', aviso: 'Marca e modelo juntos — não tem ordenação manual.', colecao: 'maquinas', tipo: null },
  { id: 'servicos', rotulo: 'Serviços prestados', icone: 'wrench', onde: 'Tela "Meus serviços", do prestador', aviso: 'Só o que está aqui pode ser selecionado — e só isso entra na busca por serviço.', colecao: 'servicos', tipo: null },
  { id: 'culturas', rotulo: 'Culturas', icone: 'leaf', onde: 'Tela "Minha propriedade", do produtor — só leitura', aviso: 'Sem endpoint de escrita — mudar a lista de culturas é migração, não tela de admin.', colecao: 'culturas', tipo: null, somenteLeitura: true },
];

function paraItem(registro, colecaoId) {
  const usos =
    colecaoId === 'categorias-peca' || colecaoId === 'categorias-servico'
      ? registro.totalAnuncios
      : colecaoId === 'servicos'
        ? registro.totalPrestadores
        : null;

  return {
    id: registro.id,
    nome: registro.nome || registro.modelo,
    ativo: registro.ativo ?? true,
    ordem: registro.ordem ?? 0,
    usos,
    grupo: registro.categoria?.nome || null,
    /* só em "máquinas": os dois campos extras que o formulário precisa */
    marcaId: registro.marcaId || null,
    marcaNome: registro.marca?.nome || null,
  };
}

export async function carregarColecao(colecaoId) {
  const config = COLECOES.find((item) => item.id === colecaoId);
  if (!config) return [];

  if (config.id === 'culturas') {
    const itens = await api.get('/catalogo/culturas');
    return (itens || []).map((cultura) => ({
      id: cultura.id,
      nome: cultura.nome,
      ativo: true,
      ordem: cultura.ordem ?? 0,
      usos: null,
      grupo: cultura.grupo === 'pecuaria' ? 'Pecuária' : 'Lavoura',
    }));
  }

  const { dados } = await api.listar(`/admin/catalogo/${config.colecao}`, {
    porPagina: 200,
    tipo: config.tipo || undefined,
  });

  return (dados || []).map((item) => paraItem(item, colecaoId));
}

export const criarItem = (colecaoId, corpo) => {
  const config = COLECOES.find((item) => item.id === colecaoId);
  return api.post(`/admin/catalogo/${config.colecao}`, corpo);
};

export const editarItem = (colecaoId, id, corpo) => {
  const config = COLECOES.find((item) => item.id === colecaoId);
  return api.patch(`/admin/catalogo/${config.colecao}/${id}`, corpo);
};

export const removerItem = (colecaoId, id) => {
  const config = COLECOES.find((item) => item.id === colecaoId);
  return api.delete(`/admin/catalogo/${config.colecao}/${id}`);
};

/** só categoria e serviço aceitam — a API recusa as outras com mensagem
    própria, e a tela já esconde as setas de mover fora dessas duas */
export const ordenarColecao = (colecaoId, ids) => {
  const config = COLECOES.find((item) => item.id === colecaoId);
  return api.patch(`/admin/catalogo/${config.colecao}/ordenar`, {
    itens: ids.map((id, indice) => ({ id, ordem: indice })),
  });
};

export const carregarMarcas = async () => {
  const { dados } = await api.listar('/catalogo/marcas', { porPagina: 100 });
  return dados || [];
};
