/**
 * Cliente HTTP — a única porta de saída do front para a API.
 *
 * Centralizado por três razões concretas:
 *
 *  · **A base muda.** Hoje `localhost:3334/api/v1`, amanhã um domínio. Com
 *    `fetch` espalhado, trocar isso é caçar string em trinta arquivos.
 *  · **O envelope é fixo.** A API responde `{ sucesso, dados, meta }` no
 *    acerto e `{ sucesso: false, erro: { codigo, mensagem } }` no erro.
 *    Desembrulhar isso em cada tela produz trinta versões do mesmo `if`, e a
 *    trigésima esquece de tratar o erro.
 *  · **O token é um só.** Sessão expirada precisa de um lugar para renovar —
 *    não de um lugar por chamada.
 *
 * Devolve **sempre os dados prontos**, ou lança `ErroDaApi`. Quem chama trata
 * com try/catch, e não lendo `response.ok`.
 */

const BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3334/api/v1';

const CHAVE_TOKEN = 'agropecas:token';
/* as três chaves da sessão vivem aqui, e não em `lib/dados/auth.js`, porque
   quem renova o token é este arquivo — e importar o módulo de auth daqui
   fecharia um ciclo (auth.js já importa `guardarToken` deste) */
const CHAVE_REFRESH = 'agropecas:refresh';
const CHAVE_SESSAO = 'agropecas:sessao-dados';
/* espelho da sessão para o mock de `lib/sessao.js`; some junto com ele */
const CHAVE_MOCK = 'agropecas:sessao';

/**
 * Códigos de 401 que significam "o access token venceu, mas a sessão continua
 * de pé". Só eles disparam renovação: `TOKEN_INVALIDO`, `SESSAO_REVOGADA` ou
 * `SESSAO_EXPIRADA` não voltam a valer com um refresh — insistir neles seria
 * uma ida à API que já se sabe perdida.
 */
const CODIGOS_RENOVAVEIS = new Set(['TOKEN_EXPIRADO']);

export class ErroDaApi extends Error {
  constructor(mensagem, { status, codigo, detalhes } = {}) {
    super(mensagem);
    this.name = 'ErroDaApi';
    this.status = status;
    this.codigo = codigo;
    this.detalhes = detalhes;
  }
}

function lerToken() {
  if (typeof window === 'undefined') return null;

  try {
    return localStorage.getItem(CHAVE_TOKEN);
  } catch {
    /* navegação privada pode bloquear o storage. Sem token a chamada segue
       como visitante, que é melhor do que derrubar a tela inteira */
    return null;
  }
}

export function guardarToken(token) {
  try {
    if (token) localStorage.setItem(CHAVE_TOKEN, token);
    else localStorage.removeItem(CHAVE_TOKEN);
  } catch {}
}

export function lerRefresh() {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(CHAVE_REFRESH);
  } catch {
    return null;
  }
}

export function guardarRefresh(refresh) {
  try {
    if (refresh) localStorage.setItem(CHAVE_REFRESH, refresh);
    else localStorage.removeItem(CHAVE_REFRESH);
  } catch {}
}

/**
 * Apaga tudo o que identifica a pessoa neste navegador.
 *
 * Fica no cliente HTTP porque é ele quem descobre, sozinho e a qualquer
 * momento, que a sessão morreu — esperar a tela mandar limpar deixaria um
 * token morto assinando requisições até alguém clicar em "sair".
 */
export function limparSessaoLocal() {
  guardarToken(null);
  guardarRefresh(null);
  try {
    localStorage.removeItem(CHAVE_SESSAO);
    sessionStorage.setItem(CHAVE_MOCK, '0');
  } catch {}
}

/* ─── renovação do access token ───────────────────────────────────────── */

/**
 * A renovação em curso, se houver.
 *
 * É UMA promessa compartilhada de propósito: o painel dispara cinco chamadas
 * ao montar e as cinco recebem 401 quase juntas. Sem esta trava, seriam cinco
 * POSTs em `/auth/renovar` — e como o refresh gira a cada uso, o primeiro
 * invalidaria o token que os outros quatro ainda estão apresentando. O
 * servidor leria isso como *reuso de refresh* e derrubaria a sessão inteira
 * (ver `auth.sessao.service.js`). Então: uma renovação, e todo mundo espera
 * nela.
 */
let renovacaoEmCurso = null;

async function renovarSessao() {
  const refresh = lerRefresh();

  /* sem refresh não há o que renovar: falha imediata, sem ida à rede */
  if (!refresh) return null;

  const resposta = await fetch(`${BASE}/auth/renovar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refresh }),
  });

  const texto = await resposta.text();
  const dados = texto ? JSON.parse(texto) : null;

  if (!resposta.ok || dados?.sucesso === false) return null;

  const tokens = dados?.dados?.tokens;
  if (!tokens?.acesso) return null;

  guardarToken(tokens.acesso);
  /* o refresh gira a cada uso: guardar o novo é obrigatório, senão a próxima
     renovação apresenta o token velho e o servidor a trata como reuso */
  if (tokens.refresh) guardarRefresh(tokens.refresh);

  return tokens.acesso;
}

/** garante uma renovação por vez; todas as chamadas esperam a mesma promessa */
function renovarUmaVez() {
  if (!renovacaoEmCurso) {
    renovacaoEmCurso = renovarSessao()
      .catch(() => null)
      .finally(() => {
        /* liberar só depois de resolver: enquanto pendente, quem chegar
           entra na fila em vez de abrir uma segunda renovação */
        renovacaoEmCurso = null;
      });
  }

  return renovacaoEmCurso;
}

/**
 * Sessão perdida: limpa e manda para o login.
 *
 * O redirecionamento é `location.assign` e não o router do Next porque este
 * arquivo é chamado de fora de componentes (camadas de dados, efeitos) e não
 * tem acesso a hooks. A troca dura de página também garante que nenhum estado
 * de tela sobreviva com dados de uma sessão que não existe mais.
 */
function encerrarPorSessaoInvalida() {
  limparSessaoLocal();

  if (typeof window === 'undefined') return;
  /* já estar em /entrar é o caso comum de erro no próprio login: redirecionar
     ali criaria um recarregamento em laço */
  if (window.location.pathname.startsWith('/entrar')) return;

  window.location.assign('/entrar');
}

/** monta a query só com o que tem valor: `?uf=&q=` polui o cache do servidor */
function comParametros(caminho, parametros) {
  if (!parametros) return caminho;

  const busca = new URLSearchParams();

  Object.entries(parametros).forEach(([chave, valor]) => {
    if (valor === undefined || valor === null || valor === '') return;
    if (Array.isArray(valor)) valor.forEach((item) => busca.append(chave, item));
    else busca.append(chave, valor);
  });

  const texto = busca.toString();
  return texto ? `${caminho}?${texto}` : caminho;
}

/**
 * A requisição de verdade — devolve o envelope inteiro (`{sucesso, dados,
 * meta}`), porque quem chama decide se quer só os dados ou também o `meta`.
 *
 * `jaRenovou` é o freio contra laço infinito: a repetição acontece UMA vez.
 * Se o token recém-renovado também vier recusado, o problema não é validade —
 * é sessão morta, e insistir só multiplicaria requisições até o navegador
 * travar.
 */
async function executar(
  caminho,
  { metodo = 'GET', corpo, formData, parametros, sinal } = {},
  jaRenovou = false
) {
  const token = lerToken();

  let resposta;

  try {
    resposta = await fetch(`${BASE}${comParametros(caminho, parametros)}`, {
      method: metodo,
      signal: sinal,
      headers: {
        /* `FormData` NÃO leva `Content-Type` manual: o navegador escreve o
           boundary do multipart sozinho, e sobrescrever aqui quebra o parser
           do servidor — ele lê um header sem boundary nenhum */
        ...(corpo ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData || (corpo ? JSON.stringify(corpo) : undefined),
    });
  } catch (erro) {
    /* rede fora, API no ar? A distinção importa para a tela: uma pede
       "tente de novo", a outra é problema nosso */
    if (erro.name === 'AbortError') throw erro;

    throw new ErroDaApi('Não foi possível falar com o servidor.', {
      codigo: 'SEM_CONEXAO',
    });
  }

  /* 204 e afins não têm corpo: tentar ler JSON aí gera um erro que não é erro */
  const texto = await resposta.text();
  const dados = texto ? JSON.parse(texto) : null;

  if (!resposta.ok || dados?.sucesso === false) {
    const erro = dados?.erro || dados?.error || {};
    const codigo = erro.codigo || erro.code;

    /* token vencido: renovar e repetir a MESMA requisição uma única vez. Para
       quem chamou, nada aconteceu — a promessa devolve os dados como se o
       token nunca tivesse expirado, e nenhuma tela precisa saber disso */
    if (resposta.status === 401 && CODIGOS_RENOVAVEIS.has(codigo) && !jaRenovou) {
      const novo = await renovarUmaVez();

      if (novo) return executar(caminho, { metodo, corpo, formData, parametros, sinal }, true);

      /* renovação falhou: o refresh também venceu ou foi revogado. Não há
         mais como recuperar esta sessão sem a senha */
      encerrarPorSessaoInvalida();
    }

    throw new ErroDaApi(erro.mensagem || erro.message || 'Algo deu errado.', {
      status: resposta.status,
      codigo: erro.codigo || erro.code,
      /* a API manda `detalhe` (singular) com o mapa de erros por campo — sem
         ler as três grafias, o formulário perde a mensagem e a pessoa vê um
         erro genérico sem saber qual campo corrigir */
      detalhes: erro.detalhes || erro.detalhe || erro.details,
    });
  }

  return dados;
}

async function requisitar(caminho, opcoes) {
  const dados = await executar(caminho, opcoes);
  return dados?.dados !== undefined ? dados.dados : dados;
}

/**
 * A mesma chamada, mas devolvendo `meta` junto.
 *
 * Listagens precisam do total e da página para a paginação funcionar; sem
 * isto cada tela teria de refazer o desembrulho que o cliente acabou de fazer.
 *
 * Passa pelo mesmo `executar` que o resto: quando tinha `fetch` próprio, era o
 * único caminho do front que NÃO renovava o token — e listagem é justamente o
 * que mais roda em tela aberta há tempo.
 */
export async function listar(caminho, parametros, opcoes) {
  const dados = await executar(caminho, { parametros, sinal: opcoes?.sinal });
  return { dados: dados?.dados || [], meta: dados?.meta || {} };
}

export const api = {
  get: (caminho, parametros, opcoes) => requisitar(caminho, { parametros, ...opcoes }),
  post: (caminho, corpo, opcoes) => requisitar(caminho, { metodo: 'POST', corpo, ...opcoes }),
  put: (caminho, corpo, opcoes) => requisitar(caminho, { metodo: 'PUT', corpo, ...opcoes }),
  patch: (caminho, corpo, opcoes) => requisitar(caminho, { metodo: 'PATCH', corpo, ...opcoes }),
  delete: (caminho, opcoes) => requisitar(caminho, { metodo: 'DELETE', ...opcoes }),
  /* upload de arquivo — `corpo` é sempre `FormData`, nunca JSON. Único ponto
     do cliente HTTP que foge do envelope JSON, porque é o único que manda
     bytes crus (a foto) em vez de um objeto */
  enviarArquivo: (caminho, formData, opcoes) =>
    requisitar(caminho, { metodo: 'POST', formData, ...opcoes }),
  listar,
};

export default api;
