/**
 * Origem de dados de `/painel/perfil` — o cartão público do anunciante.
 * `GET/PATCH /perfis/meu` (o mesmo endpoint que `lib/dados/exclusivas.js` já
 * usa) mais o upload de foto (`POST /midia`, `referenciaTipo: 'perfil_foto'`).
 *
 * ⚠️ Campos do mock sem equivalente real, removidos da tela (não escondidos —
 * removidos, porque um campo que não salva é pior que um campo que não
 * existe):
 *  · "Atividade" (produtor), "Marcas que atende" (loja), "Especialidade" e
 *    "Atende em" (prestador) — não têm coluna própria. `propriedadeNome`/
 *    `areaHectares` (produtor) e `razaoSocial`/`nomeFantasia` (loja) SÃO
 *    reais e continuam. Raio de atendimento do prestador já tem tela própria
 *    (`/painel/servicos`) — duplicar o campo aqui divergiria os dois.
 *  · "Costuma responder em" — a API não calcula tempo médio de resposta.
 */

import api from '@/lib/api';
import { enviarFoto as enviarArquivo } from '@/lib/dados/midia';

const LIMITE_SOBRE = 400;

const CAMPOS_POR_TIPO = {
  produtor: [
    { chave: 'propriedadeNome', rotulo: 'Nome da propriedade' },
    { chave: 'areaHectares', rotulo: 'Área (hectares)' },
  ],
  loja: [
    { chave: 'razaoSocial', rotulo: 'Razão social' },
    { chave: 'nomeFantasia', rotulo: 'Nome fantasia' },
  ],
  prestador: [],
  cliente: [],
};

export function camposDoPerfil(tipo) {
  return CAMPOS_POR_TIPO[tipo] || [];
}

const cidadeParaTexto = (municipio, uf) =>
  municipio?.nome ? `${municipio.nome} · ${municipio.uf || uf || ''}`.trim() : '';

async function resolverMunicipio(texto) {
  const [nome, uf] = String(texto || '').split('·').map((parte) => parte.trim());
  if (!nome) return undefined;

  try {
    const { dados } = await api.listar('/localizacao/municipios', { busca: nome, uf, porPagina: 20 });
    const semAcento = (v) => String(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const exato = dados.find((item) => semAcento(item.nome) === semAcento(nome));
    return (exato || dados[0])?.id;
  } catch {
    return undefined;
  }
}

function paraPerfilPublico(perfil) {
  const camposTipo = camposDoPerfil(perfil.tipo);
  const extras = Object.fromEntries(
    camposTipo.map(({ chave }) => [chave, perfil[chave] ?? ''])
  );

  return {
    fotoUrl: perfil.fotoUrl || '',
    sobre: perfil.bio || '',
    telefone: perfil.telefoneSecundario || '',
    whatsapp: perfil.whatsapp || '',
    cidade: cidadeParaTexto(perfil.municipio, perfil.uf),
    publicos: {
      anuncios: perfil.totalAnunciosAtivos || 0,
      desde: perfil.membroDesde
        ? new Date(perfil.membroDesde).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
        : '',
    },
    ...extras,
  };
}

export const carregarPerfilPublico = () => api.get('/perfis/meu').then(paraPerfilPublico);

export async function salvarPerfilPublico(dados, tipo, { cidadeOriginal } = {}) {
  const camposTipo = camposDoPerfil(tipo);

  const corpo = {
    /* `bio` é o único campo deste grupo sem `.permitindoNulo()` no validador
       da API — mandar `null` quando "sobre" está vazio quebra com "Precisa
       ser um texto." string vazia é o valor válido de "sem bio" aqui */
    bio: dados.sobre || '',
    telefoneSecundario: dados.telefone || null,
    whatsapp: dados.whatsapp || null,
    ...Object.fromEntries(
      camposTipo.map(({ chave }) => [
        chave,
        chave === 'areaHectares' ? (dados[chave] ? Number(dados[chave]) : null) : dados[chave] || null,
      ])
    ),
  };

  if (dados.cidade && dados.cidade !== cidadeOriginal) {
    const municipioId = await resolverMunicipio(dados.cidade);
    if (municipioId) corpo.municipioId = municipioId;
  }

  return paraPerfilPublico(await api.patch('/perfis/meu', corpo));
}

/** upload da foto do perfil — `enviarFoto` de `lib/dados/midia.js` é
    específico de anúncio (`referenciaTipo: 'anuncio'`); aqui é o mesmo
    endpoint com outro vínculo */
export async function enviarFotoPerfil(arquivo) {
  const enviada = await enviarArquivo(arquivo, { referenciaTipo: 'perfil_foto' });
  return api.patch('/perfis/meu', { fotoUrl: enviada.url }).then(paraPerfilPublico);
}

/**
 * Completude do perfil — mesma ideia do mock, sobre campos reais. Cada tipo
 * pesa os próprios campos extras; os comuns (foto/sobre/telefone/whatsapp/
 * cidade) valem para os três.
 */
export function completudeDoPerfil(dados, tipo) {
  const itens = [
    { id: 'foto', rotulo: 'Foto de perfil', feito: Boolean(dados.fotoUrl) },
    { id: 'sobre', rotulo: 'Descrição (mín. 60 caracteres)', feito: dados.sobre.trim().length >= 60 },
    { id: 'telefone', rotulo: 'Telefone', feito: Boolean(dados.telefone) },
    { id: 'whatsapp', rotulo: 'WhatsApp', feito: Boolean(dados.whatsapp) },
    { id: 'cidade', rotulo: 'Cidade', feito: Boolean(dados.cidade) },
    ...camposDoPerfil(tipo).map((campo) => ({
      id: campo.chave,
      rotulo: campo.rotulo,
      feito: Boolean(dados[campo.chave]),
    })),
  ];

  const feitos = itens.filter((item) => item.feito).length;

  return {
    total: itens.length,
    feitos,
    porcentagem: Math.round((feitos / itens.length) * 100),
    faltando: itens.filter((item) => !item.feito),
  };
}

export { LIMITE_SOBRE };
