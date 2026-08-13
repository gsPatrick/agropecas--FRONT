'use client';

/**
 * /busca — resultados com filtros.
 *
 * Todo filtro vive na URL: o resultado é compartilhável por WhatsApp e
 * sobrevive ao recarregamento. É o comportamento que o público espera de quem
 * manda link no zap — e o que permite os atalhos de categoria entrarem aqui já
 * filtrados.
 *
 * Parâmetros: q · cat · tipo · cond · min · max · dias · cidade · uf · ord
 */

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader/AppHeader';
import AppFooter from '@/components/AppFooter/AppFooter';
import SearchBar from '@/components/SearchBar/SearchBar';
import AdCard from '@/components/AdCard/AdCard';
import AdCardEsqueleto from '@/components/AdCard/AdCardEsqueleto';
import Button from '@/components/Button/Button';
import Pagination from '@/components/Pagination/Pagination';
import RangeSlider from '@/components/RangeSlider/RangeSlider';
import Icon from '@/components/Icon/Icon';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { CATEGORIAS as CATEGORIAS_PADRAO } from '@/lib/anuncios';
import { buscarAnuncios, listarCategoriasFiltro } from '@/lib/dados/busca';
import styles from './page.module.css';

const TIPOS = [
  { id: 'todos', label: 'Tudo' },
  { id: 'peca', label: 'Peças' },
  { id: 'servico', label: 'Serviços' },
];

const CONDICOES = [
  { id: 'todas', label: 'Qualquer' },
  { id: 'nova', label: 'Nova' },
  { id: 'usada', label: 'Usada' },
];

const PERIODOS = [
  { id: 'todos', label: 'Qualquer data' },
  { id: '1', label: 'Últimas 24h' },
  { id: '7', label: 'Últimos 7 dias' },
  { id: '30', label: 'Últimos 30 dias' },
];

/* teto da faixa: acima disso o punho vira "R$ 3.000+" e o filtro some */
const PRECO_MIN = 0;
const PRECO_MAX = 3000;

const ORDENS = [
  { id: 'recentes', label: 'Mais recentes' },
  { id: 'menorPreco', label: 'Menor preço' },
  { id: 'maiorPreco', label: 'Maior preço' },
];

function mascaraCep(valor) {
  const digitos = valor.replace(/\D/g, '').slice(0, 8);
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
}

function Resultados() {
  const router = useRouter();
  const params = useSearchParams();

  const termo = params.get('q') || '';
  const categoria = params.get('cat') || 'todas';
  const tipo = params.get('tipo') || 'todos';
  const condicao = params.get('cond') || 'todas';
  const periodo = params.get('dias') || 'todos';
  const ordem = params.get('ord') || 'recentes';
  const cidade = params.get('cidade') || '';
  const min = params.get('min') || '';
  const max = params.get('max') || '';

  const pagina = Number(params.get('p') || 1);
  const porPagina = Number(params.get('pp') || 20);

  const [cep, setCep] = useState('');
  const [estadoCep, setEstadoCep] = useState('idle');
  const [faixaPreco, setFaixaPreco] = useState([
    min ? Number(min) : PRECO_MIN,
    max ? Number(max) : PRECO_MAX,
  ]);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const controllerRef = useRef(null);

  /* resultados vindos da API. `carregando` começa ligado porque a primeira
     pintura já vai buscar: iniciar em falso mostraria o vazio ("Nada
     encontrado") por um instante antes do primeiro resultado, que é a pior
     mentira possível nesta tela */
  const [itens, setItens] = useState([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);

  /* categorias do catálogo; começam com a lista local para a coluna já nascer
     com a altura certa e não empurrar o resto quando a resposta chegar */
  const [categorias, setCategorias] = useState(CATEGORIAS_PADRAO);

  const buscaRef = useRef(null);

  useEffect(() => {
    setFaixaPreco([min ? Number(min) : PRECO_MIN, max ? Number(max) : PRECO_MAX]);
  }, [min, max]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    const controller = new AbortController();

    listarCategoriasFiltro({ sinal: controller.signal })
      .then(setCategorias)
      .catch(() => {
        /* silêncio proposital: `listarCategoriasFiltro` já devolve o fallback
           em erro de API; aqui só sobra o abort de troca de rota */
      });

    return () => controller.abort();
  }, []);

  /* uma requisição por combinação de filtros; a anterior é abortada para que
     digitar rápido não faça a resposta velha chegar por último e sobrescrever
     a nova (condição de corrida clássica de busca) */
  useEffect(() => {
    buscaRef.current?.abort();
    const controller = new AbortController();
    buscaRef.current = controller;

    setCarregando(true);

    buscarAnuncios(
      {
        termo,
        categoria,
        tipo,
        condicao,
        periodo,
        cidade,
        min,
        max,
        ordem,
        pagina,
        porPagina,
      },
      { sinal: controller.signal }
    )
      .then((resultado) => {
        setItens(resultado.itens);
        setTotal(resultado.total);
        setCarregando(false);
      })
      .catch((erro) => {
        if (erro?.name === 'AbortError') return;
        /* falha de rede ou 5xx cai no estado vazio já desenhado: tela branca
           num marketplace é indistinguível de site fora do ar */
        setItens([]);
        setTotal(0);
        setCarregando(false);
      });

    return () => controller.abort();
  }, [termo, categoria, tipo, condicao, periodo, cidade, min, max, ordem, pagina, porPagina]);

  /* qualquer mudança de filtro volta para a página 1: manter a página velha
     entrega uma lista vazia quando o novo filtro tem menos resultados */
  function atualizar(patch, manterPagina = false) {
    const next = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([chave, valor]) => {
      const vazio = !valor || valor === 'todas' || valor === 'todos';
      if (vazio) next.delete(chave);
      else next.set(chave, valor);
    });
    if (!manterPagina) next.delete('p');
    router.push(`/busca${next.toString() ? `?${next}` : ''}`, { scroll: false });
  }

  async function buscarCep(event) {
    event.preventDefault();
    const digitos = cep.replace(/\D/g, '');
    if (digitos.length !== 8) {
      setEstadoCep('curto');
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setEstadoCep('carregando');

    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`, {
        signal: controller.signal,
      });
      const dados = await resposta.json();
      if (dados.erro) {
        setEstadoCep('naoEncontrado');
        return;
      }
      setEstadoCep('ok');
      atualizar({ cidade: dados.localidade });
    } catch (erro) {
      if (erro.name !== 'AbortError') setEstadoCep('erro');
    }
  }

  /* filtragem, ordenação e recorte de página agora são da API — o que chega
     em `itens` já é exatamente a página pedida */

  /* a página vive na URL, então precisa ser contida: link antigo com ?p=9 em
     uma lista que encolheu não pode abrir vazio */
  const paginaValida = Math.min(Math.max(1, pagina), Math.max(1, Math.ceil(total / porPagina)));

  const ativos =
    (termo ? 1 : 0) +
    (categoria !== 'todas' ? 1 : 0) +
    (tipo !== 'todos' ? 1 : 0) +
    (condicao !== 'todas' ? 1 : 0) +
    (periodo !== 'todos' ? 1 : 0) +
    (cidade ? 1 : 0) +
    (min || max ? 1 : 0);

  const avisoCep = {
    curto: 'Digite os 8 dígitos.',
    naoEncontrado: 'CEP não encontrado.',
    erro: 'Não foi possível consultar.',
  }[estadoCep];

  return (
    <main className={styles.main}>
      <section className={styles.top}>
        <div className={styles.inner}>
          <div className={styles.barra}>
            <SearchBar
              placeholder="Qual peça você procura?"
              onSearch={(valor) => atualizar({ q: valor })}
              className={styles.searchBar}
            />

            {/* segmentado: os três estados vivem num trilho só, como um
                interruptor — três pílulas soltas pareciam filtros perdidos */}
            <div className={styles.segmentado} role="group" aria-label="Tipo de anúncio">
              {TIPOS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.tipo} ${tipo === item.id ? styles.tipoOn : ''}`}
                  aria-pressed={tipo === item.id}
                  onClick={() => atualizar({ tipo: item.id })}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {ativos > 0 ? (
            <div className={styles.aplicados}>
              <span className={styles.aplicadosRotulo}>Filtrando por</span>

              {termo ? (
                <button
                  type="button"
                  className={styles.aplicado}
                  onClick={() => atualizar({ q: '' })}
                >
                  <Icon name="search" size={13} />“{termo}”
                  <Icon name="close" size={12} />
                </button>
              ) : null}

              {categoria !== 'todas' ? (
                <button
                  type="button"
                  className={styles.aplicado}
                  onClick={() => atualizar({ cat: 'todas' })}
                >
                  {categorias.find((item) => item.id === categoria)?.label || categoria}
                  <Icon name="close" size={12} />
                </button>
              ) : null}

              {cidade ? (
                <button
                  type="button"
                  className={styles.aplicado}
                  onClick={() => atualizar({ cidade: '' })}
                >
                  <Icon name="pin" size={13} />
                  {cidade}
                  <Icon name="close" size={12} />
                </button>
              ) : null}

              {min || max ? (
                <button
                  type="button"
                  className={styles.aplicado}
                  onClick={() => atualizar({ min: '', max: '' })}
                >
                  R$ {min || 0}–{max || `${PRECO_MAX}+`}
                  <Icon name="close" size={12} />
                </button>
              ) : null}

              {periodo !== 'todos' ? (
                <button
                  type="button"
                  className={styles.aplicado}
                  onClick={() => atualizar({ dias: 'todos' })}
                >
                  {PERIODOS.find((item) => item.id === periodo)?.label}
                  <Icon name="close" size={12} />
                </button>
              ) : null}

              {condicao !== 'todas' ? (
                <button
                  type="button"
                  className={styles.aplicado}
                  onClick={() => atualizar({ cond: 'todas' })}
                >
                  {CONDICOES.find((item) => item.id === condicao)?.label}
                  <Icon name="close" size={12} />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <div className={`${styles.inner} ${styles.layout}`}>
        {/* no celular a coluna vira um painel que abre por cima */}
        <button
          type="button"
          className={styles.abrirFiltros}
          onClick={() => setFiltrosAbertos(true)}
        >
          <Icon name="grid" size={17} />
          Filtros
          {ativos > 0 ? <span className={styles.contador}>{ativos}</span> : null}
        </button>

        {filtrosAbertos ? (
          <div
            className={styles.veu}
            onClick={() => setFiltrosAbertos(false)}
            aria-hidden="true"
          />
        ) : null}

        <aside
          className={`${styles.filters} ${filtrosAbertos ? styles.filtersAberto : ''}`}
          aria-label="Filtros"
        >
          <header className={styles.filtersHead}>
            <h2 className={styles.filtersTitle}>
              Filtros
              {ativos > 0 ? <span className={styles.contador}>{ativos}</span> : null}
            </h2>

            <div className={styles.headBtns}>
              {ativos > 0 ? (
                <button
                  type="button"
                  className={styles.clear}
                  onClick={() => router.push('/busca')}
                >
                  Limpar
                </button>
              ) : null}

              <button
                type="button"
                className={styles.fechar}
                onClick={() => setFiltrosAbertos(false)}
                aria-label="Fechar filtros"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          </header>

          {/* ── CATEGORIA ── */}
          <div className={styles.filterBlock}>
            <h3 className={styles.filterTitle}>Categoria</h3>
            <ul className={styles.filterList}>
              {categorias.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`${styles.filterItem} ${
                      categoria === item.id ? styles.filterItemOn : ''
                    }`}
                    onClick={() => atualizar({ cat: item.id })}
                  >
                    <Icon name={item.icone} size={17} />
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* ── PREÇO ── */}
          <div className={styles.filterBlock}>
            <h3 className={styles.filterTitle}>Preço</h3>

            <RangeSlider
              min={PRECO_MIN}
              max={PRECO_MAX}
              passo={50}
              valor={faixaPreco}
              onChange={setFaixaPreco}
              onCommit={([inicio, fim]) =>
                atualizar({
                  min: inicio > PRECO_MIN ? String(inicio) : '',
                  max: fim < PRECO_MAX ? String(fim) : '',
                })
              }
            />
          </div>

          {/* ── DATA E CONDIÇÃO ── */}
          <div className={styles.filterBlock}>
            <h3 className={styles.filterTitle}>Publicado em</h3>
            <div className={styles.chips}>
              {PERIODOS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.chip} ${periodo === item.id ? styles.chipOn : ''}`}
                  onClick={() => atualizar({ dias: item.id })}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <h3 className={`${styles.filterTitle} ${styles.filterTitleSub}`}>Condição</h3>
            <div className={styles.chips}>
              {CONDICOES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.chip} ${condicao === item.id ? styles.chipOn : ''}`}
                  onClick={() => atualizar({ cond: item.id })}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── LOCALIZAÇÃO ── */}
          <div className={styles.filterBlock}>
            <h3 className={styles.filterTitle}>Localização</h3>

            {cidade ? (
              <div className={styles.cidadeAtiva}>
                <Icon name="pin" size={15} />
                <span>{cidade}</span>
                <button
                  type="button"
                  onClick={() => atualizar({ cidade: '' })}
                  aria-label="Remover filtro de cidade"
                >
                  <Icon name="close" size={13} />
                </button>
              </div>
            ) : (
              <form className={styles.cepForm} onSubmit={buscarCep}>
                <div className={styles.city}>
                  <Icon name="pin" size={16} />
                  <input
                    className={styles.cityInput}
                    placeholder="Município ou CEP"
                    value={cep}
                    onChange={(event) => {
                      const valor = event.target.value;
                      /* mesmo campo aceita as duas coisas: dígitos viram CEP,
                         letras viram nome de município */
                      setCep(/^\d/.test(valor) ? mascaraCep(valor) : valor);
                      setEstadoCep('idle');
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !/^\d/.test(cep)) {
                        event.preventDefault();
                        atualizar({ cidade: cep });
                      }
                    }}
                    aria-label="Filtrar por município ou CEP"
                  />
                </div>

                <button type="submit" className={styles.aplicar} aria-label="Aplicar localização">
                  <Icon name="arrow-right" size={15} />
                </button>
              </form>
            )}

            {avisoCep ? <p className={styles.avisoCep}>{avisoCep}</p> : null}
          </div>
        </aside>

        <section className={styles.results}>
          <header className={styles.head}>
            <div>
              <h1 className={styles.title}>
                {termo ? (
                  <>
                    Resultados para <em>{termo}</em>
                  </>
                ) : (
                  'Todos os anúncios'
                )}
              </h1>
              <span className={styles.count}>
                {carregando ? (
                  /* mesma linha, mesma altura: a contagem só existe depois da
                     resposta, e trocar "…" por número não move nada */
                  <Esqueleto largura={110} altura={13} />
                ) : (
                  <>
                    {total} {total === 1 ? 'resultado' : 'resultados'}
                    {cidade ? ` em ${cidade}` : ''}
                  </>
                )}
              </span>
            </div>

            <label className={styles.ordenar}>
              <span>Ordenar</span>
              <select value={ordem} onChange={(event) => atualizar({ ord: event.target.value })}>
                {ORDENS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </header>

          {carregando ? (
            /* a grade de esqueletos usa a MESMA grade dos resultados e a
               quantidade da página pedida — quando os cards chegam, eles caem
               exatamente onde os esqueletos estavam */
            <div className={styles.grid}>
              {Array.from({ length: Math.min(porPagina, 12) }, (_, indice) => (
                <AdCardEsqueleto key={indice} />
              ))}
            </div>
          ) : itens.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon} aria-hidden="true">
                <Icon name="search" size={30} />
              </span>
              <h2 className={styles.emptyTitle}>Nada encontrado</h2>
              <p className={styles.emptyText}>
                Tente outro termo, remova um filtro ou publique o que você procura para
                que alguém encontre você.
              </p>
              <Button as={Link} href="/entrar" variant="outline">
                Publicar anúncio
              </Button>
            </div>
          ) : (
            <>
              <div className={styles.grid}>
                {itens.map((anuncio) => (
                  <AdCard key={anuncio.id} ad={anuncio} />
                ))}
              </div>

              <Pagination
                pagina={paginaValida}
                total={total}
                porPagina={porPagina}
                onPagina={(valor) => atualizar({ p: String(valor) }, true)}
                onPorPagina={(valor) => atualizar({ pp: String(valor), p: '' })}
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}

export default function BuscaPage() {
  return (
    <>
      <AppHeader />
      <Suspense fallback={<div className={styles.loading}>Carregando…</div>}>
        <Resultados />
      </Suspense>
      <AppFooter />
    </>
  );
}
