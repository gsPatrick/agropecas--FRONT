'use client';

/**
 * Meus anúncios.
 *
 * As abas separam por SITUAÇÃO, e não por tipo, porque é a pergunta que a
 * pessoa traz ao abrir a tela: «o que está no ar?», «o que parei?», «o que
 * ficou pela metade?». Separar por peça e serviço obrigaria a olhar duas
 * listas para responder qualquer uma delas.
 *
 * Rascunho tem aba própria — não é anúncio pior, é anúncio inacabado. Misturado
 * aos publicados, ele some da vista e a pessoa nunca termina.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal/Modal';
import Dica from '@/components/Dica/Dica';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import PainelTopo from '@/components/PainelTopo/PainelTopo';
import PainelCartao from '@/components/PainelCartao/PainelCartao';
import PainelSegmentos from '@/components/PainelSegmentos/PainelSegmentos';
import Pagination from '@/components/Pagination/Pagination';
import Field from '@/components/Field/Field';
import Input from '@/components/Input/Input';
import Icon from '@/components/Icon/Icon';
import { useSessao } from '@/lib/sessao';
import {
  listarMeusAnuncios,
  publicarAnuncio,
  pausarAnuncio,
  renovarAnuncio,
  removerAnuncio,
  STATUS_ANUNCIO,
  ROTULO_STATUS,
  ACOES_POR_STATUS,
  ACOES,
} from '@/lib/dados/meus-anuncios';
import { acaoPrincipal } from '@/lib/painel-menu';
import styles from './page.module.css';

const ORDENS = [
  { id: 'recentes', rotulo: 'Mais recentes' },
  { id: 'vistas', rotulo: 'Mais vistos' },
  { id: 'contatos', rotulo: 'Mais contatos' },
  { id: 'expirando', rotulo: 'Expirando antes' },
];

/* o que dizer quando a aba está vazia. Texto genérico («nada aqui») não ajuda:
   a saída muda conforme a situação */
const VAZIOS = {
  todos: { texto: 'Você ainda não criou nenhum anúncio.', acao: 'Criar o primeiro' },
  publicado: { texto: 'Nenhum anúncio no ar agora.', acao: 'Publicar um anúncio' },
  pausado: { texto: 'Nenhum anúncio pausado.', acao: null },
  expirado: { texto: 'Nenhum anúncio expirado. Bom sinal.', acao: null },
  rascunho: { texto: 'Nenhum rascunho — tudo que você começou foi publicado.', acao: null },
};

export default function MeusAnunciosPage() {
  const { perfil, usuario, tipoPerfil } = useSessao();
  const router = useRouter();
  const aviso = useAviso();

  const [aba, setAba] = useState('todos');
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState('recentes');
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);

  const [anuncios, setAnuncios] = useState(null);

  /* remoção em duas etapas: a primeira abre o diálogo, a segunda confirma
     dentro dele. Apagar anúncio leva junto visualizações e contatos já
     acumulados, e não há desfazer */
  const [paraRemover, setParaRemover] = useState(null);

  /* no celular as ações ficam atrás de um botão só: quatro alvos numa linha de
     360px dão ~80px cada, e o dedo erra. Abertas, viram botões largos com
     rótulo — «renovar» e «pausar» só por ícone é adivinhação */
  const [menuAberto, setMenuAberto] = useState(null);

  /* lido no clique, não no render: consultar a largura durante a renderização
     divergiria do HTML do servidor e quebraria a hidratação */
  const emTelaCompacta = () =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 700px)').matches;

  useEffect(() => {
    if (!usuario) return undefined;

    const controle = new AbortController();

    listarMeusAnuncios({ sinal: controle.signal })
      .then(setAnuncios)
      .catch((erro) => {
        if (erro.name !== 'AbortError') aviso.erro('Não foi possível carregar seus anúncios.');
      });

    return () => controle.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id]);

  if (!usuario) return null;

  const acao = acaoPrincipal(perfil);
  const ehPrestador = tipoPerfil === 'prestador';
  const palavra = ehPrestador ? 'serviço' : 'anúncio';

  if (!anuncios) {
    return (
      <>
        <PainelTopo perfil={perfil} titulo={ehPrestador ? 'Meus serviços' : 'Meus anúncios'} />
        <PainelCartao semPadding>
          <div className={styles.carregando}>
            {Array.from({ length: 5 }, (_, indice) => (
              <Esqueleto key={indice} altura={64} raio={10} />
            ))}
          </div>
        </PainelCartao>
      </>
    );
  }

  const termo = busca.trim().toLowerCase();

  const contagem = anuncios.reduce(
    (acc, anuncio) => ({ ...acc, [anuncio.status]: (acc[anuncio.status] || 0) + 1 }),
    { todos: anuncios.length }
  );

  const filtrados = anuncios
    .filter((anuncio) => (aba === 'todos' ? true : anuncio.status === aba))
    .filter((anuncio) => (termo ? anuncio.titulo.toLowerCase().includes(termo) : true))
    .sort((a, b) => {
      if (ordem === 'vistas') return b.vistas - a.vistas;
      if (ordem === 'contatos') return b.contatos - a.contatos;
      if (ordem === 'expirando') {
        /* sem prazo vai para o fim: rascunho e pausado não expiram, e deixá-los
           no topo esconderia justamente o que está prestes a sair do ar */
        return (a.expiraEm ?? Infinity) - (b.expiraEm ?? Infinity);
      }
      return 0;
    });

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * porPagina;
  const lista = filtrados.slice(inicio, inicio + porPagina);

  function trocarAba(nova) {
    setAba(nova);
    setPagina(1);
  }

  function atualizarAnuncio(id, mudancas) {
    setAnuncios((atual) => atual.map((item) => (item.id === id ? { ...item, ...mudancas } : item)));
  }

  /**
   * O que cada botão faz.
   *
   * Num só lugar porque a lista de ações vem de `ACOES_POR_STATUS`: com o
   * comportamento espalhado, uma ação nova apareceria na tela sem fazer nada.
   */
  async function executar(chave, anuncio) {
    if (chave === 'ver') return router.push(`/anuncios/${anuncio.id}`);
    if (chave === 'editar') return router.push(`/painel/anuncios/${anuncio.id}/editar`);

    if (chave === 'pausar') {
      try {
        await pausarAnuncio(anuncio.id);
        atualizarAnuncio(anuncio.id, { status: 'pausado' });
        aviso.sucesso('Anúncio pausado. Ele saiu da vitrine.');
      } catch (erro) {
        aviso.erro(erro.message);
      }
      return;
    }

    if (chave === 'publicar') {
      try {
        await publicarAnuncio(anuncio.id);
        atualizarAnuncio(anuncio.id, { status: 'publicado', expiraEm: 60 });
        aviso.sucesso('Anúncio no ar. Já aparece na busca.');
      } catch (erro) {
        /* rascunho incompleto não vai ao ar — a API recusa com 409/422 e a
           mensagem já explica o que falta (categoria, foto, localização) */
        aviso.erro(erro.message || 'Faltam informações para publicar. Abra o anúncio e complete.');
      }
      return;
    }

    if (chave === 'renovar') {
      try {
        await renovarAnuncio(anuncio.id);
        atualizarAnuncio(anuncio.id, { status: 'publicado', expiraEm: 60 });
        aviso.sucesso('Anúncio renovado por mais 60 dias.');
      } catch (erro) {
        aviso.erro(erro.message);
      }
      return;
    }

    if (chave === 'remover') {
      setParaRemover(anuncio);
    }
  }

  function fecharRemocao() {
    setParaRemover(null);
  }

  /* as duas etapas são: abrir o diálogo e confirmar nele. Um terceiro clique
     dentro do próprio diálogo virava obstáculo, não proteção — quem já leu o
     aviso e decidiu não deveria ter de insistir */
  async function confirmarRemocao() {
    try {
      await removerAnuncio(paraRemover.id);
      setAnuncios((atual) => atual.filter((item) => item.id !== paraRemover.id));
      aviso.info(`“${paraRemover.titulo}” foi removido.`);
    } catch (erro) {
      aviso.erro(erro.message);
    }
    fecharRemocao();
  }

  const vazio = VAZIOS[aba] || VAZIOS.todos;

  return (
    <>
      <PainelTopo
        perfil={perfil}
        titulo={ehPrestador ? 'Meus serviços' : 'Meus anúncios'}
        descricao={`${contagem.todos} no total · ${contagem.publicado || 0} no ar`}
        acoes={
          <Link href={acao.href} className={styles.acaoTopo}>
            <Icon name="plus" size={17} />
            <span>{acao.rotulo}</span>
          </Link>
        }
      />

      {/* `permiteEstouro`: as dicas dos botões de ação estouram a borda lateral
          do cartão. É seguro aqui porque o último bloco é a paginação, que tem
          recuo próprio — nenhuma linha com fundo encosta no canto arredondado */}
      <PainelCartao semPadding permiteEstouro>
        {/* ── abas por situação ──────────────────────────── */}
        <div className={styles.abas}>
          <PainelSegmentos
            rotulo="Situação dos anúncios"
            opcoes={STATUS_ANUNCIO}
            valor={aba}
            onMudar={trocarAba}
            contagens={contagem}
          />
        </div>

        {/* ── busca e ordenação ──────────────────────────── */}
        <div className={styles.controles}>
          <Field className={styles.buscaCampo} htmlFor="busca-anuncios">
            <Input
              id="busca-anuncios"
              type="search"
              iconLeft="search"
              placeholder={`Buscar em ${ehPrestador ? 'serviços' : 'anúncios'}…`}
              value={busca}
              onChange={(evento) => {
                setBusca(evento.target.value);
                setPagina(1);
              }}
            />
          </Field>

          <Field className={styles.ordemCampo} htmlFor="ordem-anuncios">
            <Input
              id="ordem-anuncios"
              as="select"
              value={ordem}
              onChange={(evento) => setOrdem(evento.target.value)}
            >
              {ORDENS.map((opcao) => (
                <option key={opcao.id} value={opcao.id}>
                  {opcao.rotulo}
                </option>
              ))}
            </Input>
          </Field>
        </div>

        {/* ── lista ──────────────────────────────────────── */}
        {lista.length ? (
          <>
            <ul className={styles.lista}>
              {lista.map((anuncio) => {
                const acoes = ACOES_POR_STATUS[anuncio.status] || [];
                const expirando = anuncio.expiraEm !== undefined && anuncio.expiraEm <= 7;

                return (
                  <li key={anuncio.id} className={styles.item}>
                    {/* no celular, tocar a linha abre as ações — alvo grande vale
                        mais que mira num botão de 40px. No computador o clique
                        continua levando ao detalhe, que é o esperado com
                        ponteiro e onde as ações já estão todas visíveis */}
                    <Link
                      href={`/painel/anuncios/${anuncio.id}`}
                      className={styles.principal}
                      onClick={(evento) => {
                        if (!emTelaCompacta()) return;

                        evento.preventDefault();
                        setMenuAberto(menuAberto === anuncio.id ? null : anuncio.id);
                      }}
                    >
                      <span className={styles.miniatura} aria-hidden="true">
                        <Icon name="image" size={20} />
                      </span>

                      <span className={styles.texto}>
                        <span className={styles.linhaTitulo}>
                          <strong className={styles.titulo}>{anuncio.titulo}</strong>

                          <span className={`${styles.selo} ${styles[anuncio.status]}`}>
                            {ROTULO_STATUS[anuncio.status]}
                          </span>
                        </span>

                        <span className={styles.meta}>
                          <span className={styles.preco}>{anuncio.preco}</span>

                          <span className={styles.numero} title="Visualizações">
                            <Icon name="eye" size={13} />
                            {anuncio.vistas}
                          </span>

                          <span className={styles.numero} title="Contatos recebidos">
                            <Icon name="phone" size={13} />
                            {anuncio.contatos}
                          </span>

                          {expirando ? (
                            <span className={styles.expira}>expira em {anuncio.expiraEm}d</span>
                          ) : null}
                        </span>
                      </span>
                    </Link>

                    {/* as ações mudam com a situação: não se pausa o que nunca
                        foi ao ar, nem se renova rascunho */}
                    <button
                      type="button"
                      className={styles.abrirAcoes}
                      onClick={() => setMenuAberto(menuAberto === anuncio.id ? null : anuncio.id)}
                      aria-expanded={menuAberto === anuncio.id}
                      aria-label={`Ações de ${anuncio.titulo}`}
                    >
                      <Icon name={menuAberto === anuncio.id ? 'close' : 'grid'} size={17} />
                    </button>

                    <div
                      className={`${styles.acoes} ${
                        menuAberto === anuncio.id ? styles.acoesAbertas : ''
                      }`}
                    >
                      {/* só no celular: lá a linha abre as ações em vez de navegar,
                          e sem isto o detalhe ficaria inalcançável */}
                      <Link
                        href={`/painel/anuncios/${anuncio.id}`}
                        className={`${styles.acaoBotao} ${styles.acaoDetalhe}`}
                      >
                        <Icon name="chart" size={16} />
                        <span className={styles.acaoRotulo}>Detalhes e métricas</span>
                      </Link>

                      {acoes.map((chave, indice) => {
                        const definicao = ACOES[chave];
                        const ultimo = indice === acoes.length - 1;

                        return (
                          <Dica
                            key={chave}
                            texto={definicao.rotulo}
                            className={styles.dica}
                            alinhamento={ultimo ? 'fim' : undefined}
                          >
                            <button
                              type="button"
                              className={`${styles.acaoBotao} ${definicao.perigo ? styles.perigo : ''}`}
                              aria-label={`${definicao.rotulo} — ${anuncio.titulo}`}
                              onClick={() => executar(chave, anuncio)}
                            >
                              <Icon name={definicao.icone} size={16} />
                              <span className={styles.acaoRotulo}>{definicao.rotulo}</span>
                            </button>
                          </Dica>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className={styles.paginacao}>
              <Pagination
                pagina={paginaAtual}
                total={filtrados.length}
                porPagina={porPagina}
                onPagina={setPagina}
                onPorPagina={(quantidade) => {
                  setPorPagina(quantidade);
                  setPagina(1);
                }}
                opcoes={[5, 10, 15, 20]}
                variante="embutida"
              />
            </div>
          </>
        ) : (
          <div className={styles.vazio}>
            <span className={styles.vazioIcone}>
              <Icon name={termo ? 'search' : 'grid'} size={26} />
            </span>

            <p className={styles.vazioTexto}>
              {termo ? `Nenhum ${palavra} com “${busca.trim()}”.` : vazio.texto}
            </p>

            {termo ? (
              <button type="button" className={styles.vazioAcao} onClick={() => setBusca('')}>
                Limpar busca
              </button>
            ) : vazio.acao ? (
              <Link href={acao.href} className={styles.vazioAcao}>
                {vazio.acao}
              </Link>
            ) : null}
          </div>
        )}
      </PainelCartao>

      {/* segunda etapa da remoção */}
      <Modal
        open={Boolean(paraRemover)}
        title="Remover anúncio"
        onClose={fecharRemocao}
        footer={
          <div className={styles.rodapeModal}>
            <button type="button" className={styles.cancelar} onClick={fecharRemocao}>
              Cancelar
            </button>

            <button type="button" className={styles.remover} onClick={confirmarRemocao}>
              <Icon name="trash" size={16} />
              Remover anúncio
            </button>
          </div>
        }
      >
        {paraRemover ? (
          <div className={styles.confirmacao}>
            <div className={styles.alvo}>
              <span className={styles.alvoMiniatura} aria-hidden="true">
                <Icon name="image" size={18} />
              </span>

              <span className={styles.alvoTexto}>
                <strong>{paraRemover.titulo}</strong>
                <span>
                  {paraRemover.vistas} visualizações · {paraRemover.contatos} contatos
                </span>
              </span>
            </div>

            {/* o que se perde, dito antes e não depois */}
            <p className={styles.aviso}>
              O anúncio sai do ar e deixa de aparecer na busca. As{' '}
              <strong>{paraRemover.vistas} visualizações</strong> e os{' '}
              <strong>{paraRemover.contatos} contatos</strong> já acumulados também são perdidos.
            </p>

            <p className={styles.alternativa}>
              Se a intenção é só tirar do ar por um tempo,{' '}
              <button
                type="button"
                className={styles.linkAcao}
                onClick={async () => {
                  try {
                    await pausarAnuncio(paraRemover.id);
                    atualizarAnuncio(paraRemover.id, { status: 'pausado' });
                    aviso.sucesso('Anúncio pausado em vez de removido.');
                  } catch (erro) {
                    aviso.erro(erro.message);
                  }
                  fecharRemocao();
                }}
              >
                pausar
              </button>{' '}
              preserva tudo e deixa republicar depois.
            </p>

            <p className={styles.armado}>
              <Icon name="close" size={15} />
              Não há como desfazer.
            </p>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
