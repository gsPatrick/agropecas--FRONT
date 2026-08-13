/**
 * Categoria e marca do formulário de anúncio — `GET /catalogo/categorias` e
 * `GET /catalogo/marcas`, substituindo `lib/anuncio-form.js` (que o próprio
 * arquivo já marcava como provisório: "deve chegar por GET /admin/catalogo").
 *
 * ⚠️ `categoriaId`/`marcaId` são UUID no banco — diferente de cultura e
 * serviço (que aceitam rótulo e a API resolve), aqui não há atalho por nome.
 * Por isso o formulário passou a mandar o ID escolhido no `<select>`, não o
 * texto.
 *
 * ⚠️ O enum de categoria no banco é `peca | servico | ambos` — não existe
 * `'maquina'` (`enum_categorias_tipo`). Anúncio de máquina usa as categorias
 * `ambos`, que é o mais próximo que o catálogo tem hoje; separar categoria de
 * máquina da de peça é decisão de produto pendente, não bug deste adaptador.
 */

import api from '@/lib/api';

const TIPO_PARA_CATEGORIA = { peca: 'peca', servico: 'servico', maquina: 'ambos' };

export async function carregarCategorias(tipoAnuncio) {
  const { dados } = await api.listar('/catalogo/categorias', {
    tipo: TIPO_PARA_CATEGORIA[tipoAnuncio] || 'ambos',
    arvore: false,
    porPagina: 100,
  });

  return (dados || []).map((categoria) => ({ id: categoria.id, nome: categoria.nome }));
}

export async function carregarMarcas() {
  const { dados } = await api.listar('/catalogo/marcas', { porPagina: 100 });
  return (dados || []).map((marca) => ({ id: marca.id, nome: marca.nome }));
}
