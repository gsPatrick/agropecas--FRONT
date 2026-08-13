/**
 * Origem dos dados da página `/perfil/[slug]`.
 *
 * Só tradução: a API fala `nomeExibicao`, `horarios[].diaSemana`,
 * `precoCentavos`; a tela fala `nome`, `horario[].dia`, `preco`. O adaptador
 * mora aqui e não dentro do componente porque a tela não deve ter de mudar
 * quando um nome de campo mudar do outro lado — e porque assim existe UM lugar
 * para conferir o que está integrado e o que ainda é palpite.
 *
 * Duas rotas alimentam a página, e não uma:
 *  · `GET /perfis/:slug` — identidade e as coleções (horários, marcas,
 *    serviços, área de atendimento) vêm em uma consulta só, sem N+1;
 *  · `GET /anuncios?perfilId=` — os anúncios NÃO vêm no perfil, e não deveriam:
 *    são paginados e mudam num ritmo diferente do cadastro.
 */

import api from '@/lib/api';

/* rótulo e ícone do tipo. Ficam aqui e não na tela porque são vocabulário da
   cliente (Maturacao/05 §2) e não decisão visual */
const TIPOS = {
  produtor: { perfil: 'Produtor Rural', icone: 'tractor' },
  loja: { perfil: 'Loja de Peças', icone: 'store' },
  prestador: { perfil: 'Prestador de Serviços', icone: 'wrench' },
};

const TIPO_PADRAO = { perfil: 'Anunciante', icone: 'tractor' };

const DIAS = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function iniciais(nome = '') {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0] || '')
    .join('')
    .toUpperCase();
}

/** "2026-03-01" → "março de 2026". A tela mostra mês e ano, não data cheia */
function mesAno(valor) {
  if (!valor) return 'este ano';
  const data = new Date(`${String(valor).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(data.getTime())) return 'este ano';
  return `${MESES[data.getMonth()]} de ${data.getFullYear()}`;
}

/** "07:30:00" → "07h30"; "18:00:00" → "18h" — é como a loja escreve na porta */
function hora(valor) {
  if (!valor) return null;
  const [h, m] = String(valor).split(':');
  return m && m !== '00' ? `${h}h${m}` : `${h}h`;
}

/**
 * Horários da API (uma linha por dia) → as linhas que a tela desenha.
 *
 * Dias seguidos com o mesmo horário viram uma faixa ("Segunda a sexta"), que é
 * como o mock já mostrava e como a pessoa lê. Sete linhas repetidas seriam
 * informação correta e leitura ruim.
 */
function horarios(lista) {
  if (!Array.isArray(lista) || lista.length === 0) return null;

  const ordenados = [...lista].sort((a, b) => a.diaSemana - b.diaSemana);

  const texto = (linha) => {
    if (linha.fechado) return 'Fechado';
    const abre = hora(linha.abreAs);
    const fecha = hora(linha.fechaAs);
    if (!abre || !fecha) return 'Fechado';

    const intervalo =
      linha.intervaloInicio && linha.intervaloFim
        ? ` (intervalo ${hora(linha.intervaloInicio)} às ${hora(linha.intervaloFim)})`
        : '';

    return `${abre} às ${fecha}${intervalo}`;
  };

  const faixas = [];

  ordenados.forEach((linha) => {
    const valor = texto(linha);
    const anterior = faixas[faixas.length - 1];

    /* só agrupa dia consecutivo: sábado e domingo com o mesmo horário não são
       "sábado a domingo" se a sexta no meio for diferente */
    if (anterior && anterior.hora === valor && linha.diaSemana === anterior.fim + 1) {
      anterior.fim = linha.diaSemana;
      return;
    }

    faixas.push({ inicio: linha.diaSemana, fim: linha.diaSemana, hora: valor });
  });

  return faixas.map((faixa) => ({
    dia:
      faixa.inicio === faixa.fim
        ? DIAS[faixa.inicio]
        : `${DIAS[faixa.inicio]} a ${DIAS[faixa.fim].toLowerCase()}`,
    hora: faixa.hora,
  }));
}

/** lista de nomes, ou `null` — a tela usa a ausência para não renderizar o bloco */
function nomes(lista) {
  if (!Array.isArray(lista) || lista.length === 0) return null;
  return lista.map((item) => item.nome).filter(Boolean);
}

const CONDICOES = { nova: 'Nova', usada: 'Usada', recondicionada: 'Recondicionada' };

function preco(anuncio) {
  if (anuncio.precoACombinar || anuncio.precoCentavos === null) return null;
  return (anuncio.precoCentavos / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: anuncio.moeda || 'BRL',
  });
}

/** "há 2 horas" — tempo relativo curto, que é o que o cartão mostra */
function quando(valor) {
  if (!valor) return '';
  const minutos = Math.floor((Date.now() - new Date(valor).getTime()) / 60000);

  if (minutos < 60) return 'agora há pouco';
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  const dias = Math.floor(horas / 24);
  if (dias < 30) return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  const meses = Math.floor(dias / 30);
  return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
}

/** anúncio da API → o objeto que `AdCard` desenha */
function paraCartao(anuncio, perfil) {
  return {
    id: anuncio.id,
    tipo: anuncio.tipo === 'servico' ? 'servico' : 'peca',
    titulo: anuncio.titulo,
    preco: preco(anuncio),
    condicao: CONDICOES[anuncio.condicao] || null,
    foto: anuncio.capa?.urlThumb || anuncio.capa?.url || null,
    icone: anuncio.categoria?.icone || (anuncio.tipo === 'servico' ? 'wrench' : 'gear'),
    cidade: anuncio.municipio?.nome || perfil.cidade,
    uf: anuncio.municipio?.uf || anuncio.uf || perfil.uf,
    autor: anuncio.anunciante?.nomeExibicao || perfil.nome,
    perfilIcone: TIPOS[anuncio.anunciante?.tipo || perfil.tipo]?.icone || 'tractor',
    quando: quando(anuncio.publicadoEm || anuncio.criadoEm),
  };
}

/** perfil da API → o objeto `pessoa` que a página já consome */
function paraPessoa(dados) {
  const tipo = TIPOS[dados.tipo] ? dados.tipo : 'produtor';
  const rotulos = TIPOS[dados.tipo] || TIPO_PADRAO;
  const nome = dados.nomeExibicao || '';

  return {
    tipo,
    slug: dados.slug,
    nome,
    iniciais: iniciais(nome),
    foto: dados.fotoUrl || null,
    perfil: rotulos.perfil,
    icone: rotulos.icone,
    verificado: Boolean(dados.verificado),
    bio: dados.bio || '',
    cidade: dados.municipio?.nome || '',
    uf: dados.municipio?.uf || dados.uf || '',
    membroDesde: mesAno(dados.membroDesde),

    /* `null` quando o anunciante não consentiu em publicar (LGPD): a API já
       devolve vazio nesse caso, e a tela usa isto para não oferecer o botão */
    whatsapp: dados.whatsapp || null,

    // ── loja ──
    horario: horarios(dados.horarios),
    marcas: nomes(dados.marcas),
    entrega: dados.entregaObservacao || null,

    // ── prestador ──
    servicos: nomes(dados.servicos),
    atendeNoCampo: Boolean(dados.atendeNoCampo),

    // ── produtor ──
    /* LACUNA: `culturas` e `maquinario` não existem na API. O perfil só traz
       `propriedadeNome` e `areaHectares` (perfil.mapper.js → `especificos`).
       Enquanto não houver `perfil_culturas` / `perfil_maquinario` (ou campos
       de texto no perfil), estes blocos ficam sem dado — e a tela já não os
       desenha quando vêm `null`, então não há buraco visual. */
    culturas: null,
    maquinario: null,
    propriedade: dados.propriedadeNome || null,
    areaHectares: dados.areaHectares ?? null,
  };
}

/**
 * Carrega tudo o que a página precisa.
 *
 * Os anúncios são buscados DEPOIS do perfil porque dependem do `id` dele, e a
 * falha deles não derruba a página: perfil sem anúncio listado ainda responde
 * "dá para confiar nessa pessoa?", que é a pergunta da tela. Já a falha do
 * perfil é fatal — sem identidade não há o que mostrar.
 */
export async function carregarPerfil(slug, opcoes) {
  const dados = await api.get(`/perfis/${encodeURIComponent(slug)}`, null, opcoes);
  const pessoa = paraPessoa(dados);

  let anuncios = [];

  try {
    const resposta = await api.listar(
      '/anuncios',
      { perfilId: dados.id, porPagina: 24, ordenar: 'recentes' },
      opcoes
    );
    anuncios = (resposta.dados || []).map((anuncio) => paraCartao(anuncio, pessoa));
  } catch (erro) {
    if (erro?.name === 'AbortError') throw erro;
    /* engolido de propósito: ver o perfil sem a vitrine é melhor do que não
       ver nada. O contador de anúncios abaixo reflete o que realmente chegou */
    anuncios = [];
  }

  return { ...pessoa, anuncios };
}

export default carregarPerfil;
