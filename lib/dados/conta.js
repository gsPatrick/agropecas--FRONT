/**
 * Origem dos dados de `/conta` — a conta de quem só compra.
 *
 * Três blocos, três endpoints:
 *   · dados pessoais → `GET`/`PATCH /perfis/meu` (os campos "comuns aos três
 *     tipos" do validador — nome, telefone, whatsapp, cidade — servem
 *     qualquer perfil, cliente incluído; nenhuma mudança foi precisa na API)
 *   · favoritos       → `GET`/`DELETE /favoritos`, já pronto para qualquer
 *     perfil que salve anúncio
 *   · mensagens       → **ainda mock**. `/mensagens` (a caixa de entrada real)
 *     roda sobre `ChatProvider`/`lib/chat.js`, que não fala com a API — essa é
 *     uma lacuna que já existe fora desta tela, não algo que esta página
 *     resolve sozinha. Aqui só se lê o mesmo provedor, para o resumo bater com
 *     o que `/mensagens` mostra.
 */

import api from '@/lib/api';

/** { nome, uf } → "Sorriso · MT" — mesmo formato usado no resto do painel */
const cidadeParaTexto = (municipio, uf) =>
  municipio?.nome ? `${municipio.nome} · ${municipio.uf || uf || ''}`.trim() : '';

/**
 * "Sorriso · MT" → o id do município.
 *
 * Campo livre, não `<select>`: resolver o texto aqui é o que permite manter a
 * tela simples sem virar formulário de duas etapas. Não achou? `undefined`, e
 * o município simplesmente não muda — apagar a cidade por erro de digitação
 * seria pior do que ignorar a edição.
 */
async function resolverMunicipio(texto) {
  const [nome, uf] = String(texto || '')
    .split('·')
    .map((parte) => parte.trim());

  if (!nome) return undefined;

  try {
    const municipios = await api.get('/localizacao/municipios', { busca: nome, uf: uf || undefined });
    const encontrado = municipios.find(
      (item) => item.nome.toLowerCase() === nome.toLowerCase()
    );
    return encontrado?.id;
  } catch {
    return undefined;
  }
}

/* ── dados pessoais ──────────────────────────────────────────── */

export function paraDadosPessoais(perfil, usuario) {
  return {
    nome: perfil?.nomeExibicao || usuario?.nome || '',
    email: usuario?.email || '',
    emailVerificado: Boolean(usuario?.emailVerificado),
    telefone: perfil?.telefoneSecundario || '',
    whatsapp: perfil?.whatsapp || '',
    exibirWhatsapp: perfil?.exibirWhatsapp !== false,
    cidade: cidadeParaTexto(perfil?.municipio, perfil?.uf),
  };
}

export const carregarDadosPessoais = () =>
  api.get('/auth/eu').then((dados) => paraDadosPessoais(dados.perfil, dados.usuario));

export async function salvarDadosPessoais(dados, { cidadeOriginal } = {}) {
  const cidadeMudou = dados.cidade !== cidadeOriginal;

  const corpo = {
    nomeExibicao: dados.nome || undefined,
    telefoneSecundario: dados.telefone || null,
    whatsapp: dados.whatsapp || null,
    exibirWhatsapp: dados.exibirWhatsapp,
    /* só resolve o município se o campo mudou — poupa uma chamada em toda
       edição que não mexeu na cidade */
    municipioId: cidadeMudou ? await resolverMunicipio(dados.cidade) : undefined,
  };

  const resposta = await api.patch('/perfis/meu', corpo);
  return paraDadosPessoais(resposta, { nome: dados.nome, email: dados.email });
}

/* ── favoritos ────────────────────────────────────────────────── */

const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function paraCardFavorito(item) {
  const anuncio = item.anuncio || {};

  return {
    favoritoId: item.id,
    id: anuncio.id,
    titulo: anuncio.titulo,
    tipo: anuncio.tipo,
    disponivel: anuncio.disponivel !== false,
    preco:
      anuncio.precoACombinar || anuncio.precoCentavos === null || anuncio.precoCentavos === undefined
        ? null
        : MOEDA.format(anuncio.precoCentavos / 100),
    foto: anuncio.capa?.miniatura || anuncio.capa?.url || null,
    salvoEm: item.criadoEm,
  };
}

export async function listarFavoritos({ sinal } = {}) {
  const { dados, meta } = await api.listar('/favoritos', { porPagina: 50 }, { sinal });
  return { itens: (dados || []).map(paraCardFavorito), total: meta?.total ?? (dados || []).length };
}

export const removerFavorito = (anuncioId) => api.delete(`/favoritos/${anuncioId}`);
