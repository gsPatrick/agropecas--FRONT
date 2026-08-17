'use client';

/**
 * Mensagens do painel.
 *
 * Duas colunas: a caixa de entrada à esquerda, a conversa aberta à direita. No
 * celular vira uma coisa de cada vez — lista, e ao tocar, a conversa em tela
 * cheia com botão de voltar, como em aplicativo.
 *
 * As abas separam duas coisas que costumam ser confundidas:
 *
 *   · **Novas** — ninguém respondeu ainda. É a aba que faz perder negócio:
 *     quem chama e não recebe resposta procura outro anunciante.
 *   · **Não lidas** — chegou mensagem desde a última vez que você abriu.
 *
 * Uma conversa pode ser não lida sem ser nova, e nova sem ser não lida. Juntar
 * as duas numa aba só esconderia justamente o caso mais caro.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PainelTopo from '@/components/PainelTopo/PainelTopo';
import PainelSegmentos from '@/components/PainelSegmentos/PainelSegmentos';
import Field from '@/components/Field/Field';
import Input from '@/components/Input/Input';
import Icon from '@/components/Icon/Icon';
import Dica from '@/components/Dica/Dica';
import Modal from '@/components/Modal/Modal';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import { useSessao, PERFIS } from '@/lib/sessao';
import { useFavoritos } from '@/lib/favoritos';
import { useChat } from '@/components/ChatProvider/ChatProvider';
import { ABAS_MENSAGENS } from '@/lib/mensagens-abas';
import styles from './page.module.css';

/**
 * "Sem resposta" — a API não guarda um flag "ninguém respondeu ainda"; é
 * aproximado aqui: só uma mensagem no total, e ela não é minha. Uma segunda
 * mensagem da MESMA pessoa antes de eu responder já sairia desta aba, o que é
 * uma imprecisão aceita — o sinal real (nunca respondi) exigiria carregar o
 * fio inteiro de cada conversa da lista, e é exatamente o que a prévia
 * (`ultimaMensagem`) evita.
 */
const semResposta = (conversa) =>
  conversa.totalMensagens <= 1 && conversa.ultimaMensagem && !conversa.ultimaMensagem.minha;

/** "Carlos Menezes" → "CM" — a API manda o nome, não iniciais prontas */
function iniciais(nome = '') {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export default function MensagensPage() {
  const { perfil, usuario } = useSessao();
  const aviso = useAviso();
  const { conversas: todasConversas, abrirConversa, enviar: enviarMensagem } = useChat();
  /* favoritar CONTATO (pessoa) é diferente de favoritar anúncio — não existe
     tabela para isso na API ainda, então continua só nesta aba (ver
     `lib/favoritos.js`). O que mudou é que agora tem `pessoaId` de verdade
     para guardar, em vez do id fabricado pelo mock */
  const { favoritos, alternar } = useFavoritos();

  const [aba, setAba] = useState('todas');
  const [anuncioFiltro, setAnuncioFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [abertaId, setAbertaId] = useState(null);
  const [historicoDe, setHistoricoDe] = useState(null);
  const [rascunho, setRascunho] = useState('');

  /**
   * Abre direto a conversa pedida na URL.
   *
   * É o que faz "Continuar conversa", na página do contato favorito, cair na
   * conversa certa em vez de na lista. Lido de `window` e não de
   * `useSearchParams` de propósito: o hook obriga a envolver a página inteira
   * num Suspense só por causa disto, e aqui o parâmetro só interessa depois da
   * montagem.
   */
  useEffect(() => {
    const pedida = new URLSearchParams(window.location.search).get('conversa');
    if (pedida) setAbertaId(pedida);
  }, []);

  if (!usuario) return null;

  /* favorito entra por cima do que vem do `ChatProvider` — mesmo princípio
     do mock, só que a lista de baixo agora é real */
  const conversas = todasConversas.map((conversa) => ({
    ...conversa,
    nova: semResposta(conversa),
    favorita: conversa.pessoaId ? favoritos.includes(conversa.pessoaId) : false,
  }));

  /* agrupamento por anúncio, para o filtro — antes vinha de
     `anunciosComConversa` (mock); aqui é direto da lista real, já que cada
     conversa carrega o próprio `anuncio` */
  const anuncios = Object.values(
    conversas.reduce((mapa, conversa) => {
      const id = conversa.anuncio.id;
      if (!mapa[id]) mapa[id] = { id, titulo: conversa.anuncio.titulo, total: 0 };
      mapa[id].total += 1;
      return mapa;
    }, {})
  );

  const contagem = {
    todas: conversas.length,
    novas: conversas.filter((conversa) => conversa.nova).length,
    naoLidas: conversas.filter((conversa) => conversa.naoLidas > 0).length,
    favoritas: conversas.filter((conversa) => conversa.favorita).length,
  };

  const termo = busca.trim().toLowerCase();

  const lista = conversas
    .filter((conversa) => {
      if (aba === 'novas') return conversa.nova;
      if (aba === 'naoLidas') return conversa.naoLidas > 0;
      if (aba === 'favoritas') return conversa.favorita;
      return true;
    })
    .filter((conversa) => anuncioFiltro === 'todos' || conversa.anuncio.id === anuncioFiltro)
    .filter((conversa) =>
      termo
        ? conversa.pessoa.toLowerCase().includes(termo) ||
          conversa.anuncio.titulo.toLowerCase().includes(termo)
        : true
    );

  const aberta = conversas.find((conversa) => conversa.id === abertaId) || null;

  function abrir(conversa) {
    setAbertaId(conversa.id);
    /* zera não lidas e carrega o fio, os dois via API — mesma função que o
       balão flutuante usa */
    abrirConversa(conversa.id);
  }

  function alternarFavorito(pessoaId, nome) {
    if (!pessoaId) return;
    const virou = alternar(pessoaId);

    aviso.sucesso(virou ? `${nome} foi para os favoritos.` : `${nome} saiu dos favoritos.`);
  }

  function enviar(evento) {
    evento.preventDefault();
    if (!rascunho.trim() || !abertaId) return;

    enviarMensagem(abertaId, rascunho);
    setRascunho('');
  }

  /* mesma pessoa, conversas diferentes — a API não tem "histórico por
     pessoa" pronto; filtra na lista que já está na tela */
  const historico = historicoDe
    ? conversas.filter((conversa) => conversa.pessoaId === historicoDe.pessoaId)
    : [];

  return (
    <>
      <PainelTopo
        perfil={perfil}
        titulo="Mensagens"
        descricao={`${contagem.naoLidas} não lida(s) · ${contagem.novas} sem resposta`}
      />

      <div className={`${styles.grade} ${aberta ? styles.comConversa : ''}`}>
        {/* ── caixa de entrada ─────────────────────────── */}
        <section className={styles.caixa}>
          <div className={styles.filtros}>
            <PainelSegmentos
              rotulo="Filtrar mensagens"
              opcoes={ABAS_MENSAGENS}
              valor={aba}
              onMudar={setAba}
              contagens={contagem}
            />

            <div className={styles.linhaFiltro}>
              <Field className={styles.campoBusca} htmlFor="busca-msg">
                <Input
                  id="busca-msg"
                  type="search"
                  iconLeft="search"
                  placeholder="Buscar pessoa ou anúncio…"
                  value={busca}
                  onChange={(evento) => setBusca(evento.target.value)}
                />
              </Field>

              {/* filtrar por anúncio: quem tem 20 anúncios no ar precisa saber
                  quem chamou por QUAL deles antes de responder */}
              <Field className={styles.campoAnuncio} htmlFor="filtro-anuncio">
                <Input
                  id="filtro-anuncio"
                  as="select"
                  value={anuncioFiltro}
                  onChange={(evento) => setAnuncioFiltro(evento.target.value)}
                >
                  <option value="todos">Todos os anúncios</option>
                  {anuncios.map((anuncio) => (
                    <option key={anuncio.id} value={anuncio.id}>
                      {anuncio.titulo} ({anuncio.total})
                    </option>
                  ))}
                </Input>
              </Field>
            </div>
          </div>

          {lista.length ? (
            <ul className={styles.lista}>
              {lista.map((conversa) => (
                <li key={conversa.id} className={styles.item}>
                  <button
                    type="button"
                    className={`${styles.conversa} ${
                      conversa.id === abertaId ? styles.conversaAtiva : ''
                    }`}
                    onClick={() => abrir(conversa)}
                  >
                    <span className={styles.avatar}>
                      {iniciais(conversa.pessoa)}
                      {conversa.favorita ? (
                        <span className={styles.selo}>
                          <Icon name="heart" size={9} />
                        </span>
                      ) : null}
                    </span>

                    <span className={styles.texto}>
                      <span className={styles.linhaTopo}>
                        <strong className={styles.nome}>{conversa.pessoa}</strong>
                        <span className={styles.quando}>{conversa.ultimaMensagem?.hora}</span>
                      </span>

                      <span className={styles.anuncio}>
                        <Icon name="image" size={11} />
                        {conversa.anuncio.titulo}
                      </span>

                      <span className={styles.previa}>{conversa.ultimaMensagem?.texto}</span>
                    </span>

                    <span className={styles.marcas}>
                      {conversa.nova ? <span className={styles.nova}>nova</span> : null}
                      {conversa.naoLidas > 0 ? (
                        <span className={styles.contador}>{conversa.naoLidas}</span>
                      ) : null}
                    </span>
                  </button>

                  <Dica
                    texto={conversa.favorita ? 'Tirar dos favoritos' : 'Marcar como favorito'}
                    alinhamento="fim"
                    className={styles.dicaFavorito}
                  >
                    <button
                      type="button"
                      className={`${styles.favorito} ${
                        conversa.favorita ? styles.favoritoAtivo : ''
                      }`}
                      onClick={() => alternarFavorito(conversa.pessoaId, conversa.pessoa)}
                      aria-pressed={conversa.favorita}
                      aria-label={`Favoritar ${conversa.pessoa}`}
                    >
                      <Icon name="heart" size={16} />
                    </button>
                  </Dica>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.vazio}>
              <span className={styles.vazioIcone}>
                <Icon name={aba === 'favoritas' ? 'heart' : 'mail'} size={22} />
              </span>

              <p className={styles.vazioTexto}>
                {aba === 'favoritas'
                  ? 'Nenhum favorito ainda.'
                  : aba === 'novas'
                    ? 'Nenhuma conversa sem resposta. Tudo respondido.'
                    : aba === 'naoLidas'
                      ? 'Nenhuma mensagem não lida.'
                      : 'Nenhuma conversa por aqui.'}
              </p>

              {aba === 'favoritas' ? (
                <p className={styles.vazioDica}>
                  Toque no coração de uma conversa para guardar a pessoa aqui — útil para
                  cliente que volta sempre.
                </p>
              ) : null}
            </div>
          )}
        </section>

        {/* ── conversa aberta ──────────────────────────── */}
        <section className={styles.painel}>
          {aberta ? (
            <>
              <header className={styles.cabecalho}>
                <button
                  type="button"
                  className={styles.voltar}
                  onClick={() => setAbertaId(null)}
                  aria-label="Voltar para a lista"
                >
                  <Icon name="chevron-left" size={18} />
                </button>

                <span className={styles.avatar}>{iniciais(aberta.pessoa)}</span>

                <span className={styles.cabecalhoTexto}>
                  <strong>{aberta.pessoa}</strong>
                  {aberta.pessoaTipo ? <span>{PERFIS[aberta.pessoaTipo]?.rotulo}</span> : null}
                </span>

                <div className={styles.cabecalhoAcoes}>
                  <Dica texto="Histórico com esta pessoa">
                    <button
                      type="button"
                      className={styles.iconeBotao}
                      onClick={() => setHistoricoDe(aberta)}
                      aria-label="Ver histórico"
                    >
                      <Icon name="clock" size={17} />
                    </button>
                  </Dica>

                  <Dica
                    texto={aberta.favorita ? 'Tirar dos favoritos' : 'Marcar como favorito'}
                    alinhamento="fim"
                  >
                    <button
                      type="button"
                      className={`${styles.iconeBotao} ${
                        aberta.favorita ? styles.iconeAtivo : ''
                      }`}
                      onClick={() => alternarFavorito(aberta.pessoaId, aberta.pessoa)}
                      aria-pressed={aberta.favorita}
                      aria-label="Favoritar pessoa"
                    >
                      <Icon name="heart" size={17} />
                    </button>
                  </Dica>
                </div>
              </header>

              {/* o anúncio fica fixo no topo do fio: sem ele, três conversas
                  abertas viram três telas iguais e responde-se a errada */}
              <Link href={`/painel/anuncios/${aberta.anuncio.id}`} className={styles.sobre}>
                <span className={styles.sobreMiniatura} aria-hidden="true">
                  <Icon name="image" size={16} />
                </span>

                <span className={styles.sobreTexto}>
                  <span>Conversa sobre</span>
                  <strong>{aberta.anuncio.titulo}</strong>
                </span>

                <span className={styles.sobrePreco}>{aberta.anuncio.preco}</span>
              </Link>

              <div className={styles.fio}>
                {aberta.mensagens.map((mensagem) => (
                  <div
                    key={mensagem.id}
                    className={`${styles.balao} ${
                      mensagem.de === 'eu' ? styles.meu : styles.dela
                    }`}
                  >
                    <p>{mensagem.texto}</p>
                    <span className={styles.hora}>{mensagem.hora}</span>
                  </div>
                ))}
              </div>

              <form className={styles.responder} onSubmit={enviar}>
                <Input
                  as="textarea"
                  rows={1}
                  placeholder="Escreva sua resposta…"
                  aria-label="Sua resposta"
                  value={rascunho}
                  onChange={(evento) => setRascunho(evento.target.value)}
                />

                <button type="submit" className={styles.enviar} disabled={!rascunho.trim()}>
                  <Icon name="arrow-right" size={18} />
                  <span className={styles.enviarRotulo}>Enviar</span>
                </button>
              </form>
            </>
          ) : (
            <div className={styles.semConversa}>
              <span className={styles.vazioIcone}>
                <Icon name="mail" size={24} />
              </span>
              <p className={styles.vazioTexto}>Escolha uma conversa para abrir.</p>
            </div>
          )}
        </section>
      </div>

      {/* ── histórico da pessoa ─────────────────────────── */}
      <Modal
        open={Boolean(historicoDe)}
        title={historicoDe ? `Histórico com ${historicoDe.pessoa}` : ''}
        description={historicoDe?.pessoaTipo ? PERFIS[historicoDe.pessoaTipo]?.rotulo : undefined}
        onClose={() => setHistoricoDe(null)}
      >
        <p className={styles.historicoResumo}>
          {historico.length} conversa(s) — por {historico.length === 1 ? 'um anúncio' : 'anúncios diferentes'}.
        </p>

        <ul className={styles.historico}>
          {historico.map((conversa) => (
            <li key={conversa.id}>
              <button
                type="button"
                className={styles.historicoItem}
                onClick={() => {
                  abrir(conversa);
                  setHistoricoDe(null);
                }}
              >
                <span className={styles.historicoMiniatura} aria-hidden="true">
                  <Icon name="image" size={15} />
                </span>

                <span className={styles.historicoTexto}>
                  <strong>{conversa.anuncio.titulo}</strong>
                  <span>
                    {conversa.totalMensagens} mensagem(ns) · {conversa.ultimaMensagem?.hora}
                  </span>
                </span>

                <Icon name="chevron-right" size={15} className={styles.historicoSeta} />
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
