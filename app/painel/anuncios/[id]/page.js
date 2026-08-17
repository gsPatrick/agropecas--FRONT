'use client';

/**
 * Detalhe do anúncio, visto pelo dono.
 *
 * Não é a página pública: aqui interessa **como o anúncio está performando** e
 * o que dá para fazer com ele. Quem quer ver a versão do comprador tem o botão
 * «Ver como comprador», que leva à página real.
 *
 * A ordem responde às perguntas na sequência em que aparecem: em que pé está
 * (situação e prazo), como foi (números), quem procurou (contatos), o que é
 * (conteúdo) e o que aconteceu (histórico).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import PainelTopo from '@/components/PainelTopo/PainelTopo';
import PainelCartao from '@/components/PainelCartao/PainelCartao';
import PainelMetrica from '@/components/PainelMetrica/PainelMetrica';
import Modal from '@/components/Modal/Modal';
import Dica from '@/components/Dica/Dica';
import Icon from '@/components/Icon/Icon';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import { useSessao } from '@/lib/sessao';
import {
  obterAnuncioDono,
  carregarHistorico,
  carregarMetricas,
  carregarContatos,
  publicarAnuncio,
  pausarAnuncio,
  renovarAnuncio,
  removerAnuncio,
  ROTULO_STATUS,
  ROTULO_CANAL,
} from '@/lib/dados/meus-anuncios';
import styles from './page.module.css';

/* data + hora, não só data: "expira em 15 de out." não diz SE ainda dá tempo
   de renovar hoje ou se já virou meia-noite — o minuto exato é o que permite
   confiar no prazo em vez de arredondar de cabeça */
const data = (valor) =>
  valor
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(valor)
    : '—';

/* altura das barras em degraus de 10%: o valor exato exigiria estilo inline,
   que o projeto não usa. Onze degraus são indistinguíveis a olho num gráfico
   de 14 barras */
const degrau = (valor, maximo) => `n${Math.round((valor / (maximo || 1)) * 10)}`;

export default function DetalheAnuncioPage() {
  const { perfil, usuario, tipoPerfil } = useSessao();
  const { id } = useParams();
  const router = useRouter();
  const aviso = useAviso();

  const [base, setBase] = useState(undefined);
  const [historico, setHistorico] = useState([]);
  const [serie, setSerie] = useState([]);
  const [quemContatou, setQuemContatou] = useState([]);
  const [paraRemover, setParaRemover] = useState(false);

  useEffect(() => {
    if (!usuario) return undefined;

    let cancelado = false;

    Promise.all([
      obterAnuncioDono(id),
      carregarHistorico(id).catch(() => []),
      carregarMetricas(id).catch(() => []),
      carregarContatos(id).catch(() => []),
    ])
      .then(([anuncioAtual, historicoAtual, serieAtual, contatosAtual]) => {
        if (cancelado) return;
        setBase(anuncioAtual);
        setHistorico(historicoAtual);
        setSerie(serieAtual);
        setQuemContatou(contatosAtual);
      })
      .catch((erro) => {
        if (cancelado) return;
        setBase(null);
        aviso.erro(erro.message);
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id, id]);

  if (!usuario || base === undefined) return null;

  if (!base) {
    return (
      <>
        <PainelTopo perfil={perfil} titulo="Anúncio não encontrado" />

        <div className={styles.ausente}>
          <Icon name="search" size={28} />
          <p>Este anúncio não existe mais ou nunca existiu.</p>
          <Link href="/painel/anuncios" className={styles.voltar}>
            Ver meus anúncios
          </Link>
        </div>
      </>
    );
  }

  const anuncio = { ...base, serie, quemContatou, historico };
  const ehPrestador = tipoPerfil === 'prestador';
  const palavra = ehPrestador ? 'serviço' : 'anúncio';
  const maximo = Math.max(0, ...serie);
  const expirando = anuncio.expiraEm !== undefined && anuncio.expiraEm <= 7;

  function mudar(extras) {
    setBase((atual) => ({ ...atual, ...extras }));
  }

  async function pausar() {
    try {
      await pausarAnuncio(id);
      mudar({ status: 'pausado' });
      aviso.sucesso('Anúncio pausado. Ele saiu da vitrine.');
    } catch (erro) {
      aviso.erro(erro.message);
    }
  }

  async function publicar() {
    try {
      await publicarAnuncio(id);
      mudar({ status: 'publicado', expiraEm: 60 });
      aviso.sucesso('Anúncio no ar. Já aparece na busca.');
    } catch (erro) {
      aviso.erro(erro.message || 'Faltam informações para publicar.');
    }
  }

  async function renovar() {
    try {
      await renovarAnuncio(id);
      mudar({ status: 'publicado', expiraEm: 60 });
      aviso.sucesso('Anúncio renovado por mais 60 dias.');
    } catch (erro) {
      aviso.erro(erro.message);
    }
  }

  /* as duas etapas são: abrir o diálogo e confirmar nele. Um terceiro clique
     dentro do próprio diálogo virava obstáculo, não proteção — quem já leu o
     aviso e decidiu não deveria ter de insistir */
  async function confirmarRemocao() {
    try {
      await removerAnuncio(id);
      aviso.info(`“${anuncio.titulo}” foi removido.`);
      router.push('/painel/anuncios');
    } catch (erro) {
      aviso.erro(erro.message);
      setParaRemover(false);
    }
  }

  return (
    <>
      <PainelTopo
        perfil={perfil}
        titulo={anuncio.titulo}
        descricao={`${ROTULO_STATUS[anuncio.status]} · criado em ${data(anuncio.datas.criadoEm)}`}
        acoes={
          <Link href={`/painel/anuncios/${anuncio.id}/editar`} className={styles.acaoTopo}>
            <Icon name="edit" size={17} />
            <span>Editar</span>
          </Link>
        }
      />

      {/* ── situação e o que fazer ──────────────────────── */}
      <PainelCartao permiteEstouro>
        <div className={styles.situacao}>
          <div className={styles.situacaoTexto}>
            <span className={`${styles.selo} ${styles[anuncio.status]}`}>
              {ROTULO_STATUS[anuncio.status]}
            </span>

            <p className={styles.prazo}>
              {anuncio.status === 'publicado' && anuncio.datas.expiraEm ? (
                <>
                  No ar há <strong>{anuncio.datas.diasNoAr} dias</strong>. Sai do ar em{' '}
                  <strong>{data(anuncio.datas.expiraEm)}</strong>
                  {expirando ? <span className={styles.alerta}> — expira em breve</span> : null}.
                </>
              ) : anuncio.status === 'pausado' && anuncio.medida ? (
                <>Fora da vitrine por decisão da administração. Veja o motivo abaixo.</>
              ) : anuncio.status === 'pausado' ? (
                <>Fora da vitrine desde que você pausou. Ninguém consegue encontrá-lo na busca.</>
              ) : anuncio.status === 'expirado' ? (
                <>O prazo terminou e o {palavra} saiu do ar. Renove para voltar à busca.</>
              ) : (
                <>Ainda não foi publicado. Só você enxerga este rascunho.</>
              )}
            </p>
          </div>

          {/* medida da administração.

              Fica junto do estado do anúncio, e não escondida no histórico:
              quem foi ocultado precisa saber POR QUE e ATÉ QUANDO na primeira
              tela que abrir. Sem o prazo escrito, a pessoa fica esperando sem
              saber se são três dias ou para sempre — e a dúvida vira ligação
              para o suporte, ou conta nova para fugir da medida. */}
          {anuncio.medida ? (
            <div className={styles.medida}>
              <Icon name="bell" size={17} />

              <div className={styles.medidaTexto}>
                <strong>{anuncio.medida.acao}</strong>

                <span className={styles.medidaMotivo}>{anuncio.medida.motivo}</span>

                <span className={styles.medidaPrazo}>
                  {anuncio.medida.ate ? (
                    <>
                      Volta ao ar automaticamente <strong>{anuncio.medida.ate}</strong>.
                    </>
                  ) : (
                    <>
                      <strong>Sem prazo para voltar</strong> — só sai desta situação
                      por decisão da administração.
                    </>
                  )}
                  {anuncio.medida.podeCorrigir
                    ? ' Corrigindo o que foi apontado, você pode reenviar antes disso.'
                    : ''}
                </span>
              </div>
            </div>
          ) : null}

          {/* no computador estes botões ficam no cartão; no celular a mesma
              lista vira a barra fixa do rodapé — mesma marcação, mesmo
              comportamento, sem duplicar botão nenhum */}
          <div className={styles.botoes}>
            {/* «Editar» só aparece aqui no celular: no computador ele vive no
                cabeçalho, que some em tela pequena — sem isto, não haveria
                como editar pelo celular */}
            <Link href={`/painel/anuncios/${anuncio.id}/editar`} className={styles.editarMobile}>
              <Icon name="edit" size={16} />
              Editar
            </Link>

            {anuncio.status !== 'rascunho' ? (
              <Dica texto="Abre a página que o comprador vê">
                <Link href={`/anuncios/${anuncio.id}`} className={styles.secundario}>
                  <Icon name="eye" size={16} />
                  <span>Ver como comprador</span>
                </Link>
              </Dica>
            ) : null}

            {anuncio.status === 'publicado' ? (
              <button type="button" className={styles.secundario} onClick={pausar}>
                <Icon name="eye-off" size={16} />
                <span>Pausar</span>
              </button>
            ) : null}

            {anuncio.status === 'pausado' || anuncio.status === 'rascunho' ? (
              <button type="button" className={styles.primario} onClick={publicar}>
                <Icon name="check" size={16} />
                <span>Publicar</span>
              </button>
            ) : null}

            {anuncio.status === 'expirado' ? (
              <button type="button" className={styles.primario} onClick={renovar}>
                <Icon name="clock" size={16} />
                <span>Renovar por 60 dias</span>
              </button>
            ) : null}

            <Dica texto="Remover definitivamente" alinhamento="fim">
              <button
                type="button"
                className={styles.perigo}
                onClick={() => setParaRemover(true)}
                aria-label="Remover anúncio"
              >
                <Icon name="trash" size={16} />
              </button>
            </Dica>
          </div>
        </div>
      </PainelCartao>

      {/* ── números ─────────────────────────────────────── */}
      <div className={styles.metricas}>
        <PainelMetrica rotulo="Visualizações" valor={anuncio.vistas} icone="eye" />
        <PainelMetrica rotulo="Contatos" valor={anuncio.contatos} icone="phone" />
        <PainelMetrica rotulo="Favoritado por" valor={anuncio.favoritos} icone="heart" />
        <PainelMetrica rotulo="Dias no ar" valor={anuncio.datas.diasNoAr} icone="clock" />
      </div>

      <div className={styles.grade}>
        <div className={styles.coluna}>
          {/* ── gráfico ─────────────────────────────────── */}
          <PainelCartao
            titulo="Visualizações"
            descricao="Últimos 14 dias"
            icone="chart"
            permiteEstouro
          >
            {maximo > 0 ? (
              <div className={styles.grafico}>
                {anuncio.serie.map((valor, indice) => (
                  <div key={indice} className={styles.coluna14}>
                    <Dica texto={`${valor} em ${14 - indice} dia(s) atrás`} posicao="cima">
                      <span className={`${styles.barra} ${styles[degrau(valor, maximo)]}`} />
                    </Dica>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.vazio}>
                <span className={styles.vazioIcone}>
                  <Icon name="chart" size={22} />
                </span>

                <p className={styles.vazioTexto}>
                  Sem visualizações no período — o {palavra} não esteve no ar.
                </p>
              </div>
            )}
          </PainelCartao>

          {/* ── quem mandou mensagem ────────────────────── */}
          <PainelCartao
            titulo="Quem entrou em contato"
            descricao={`${anuncio.quemContatou.length} pessoa(s) chamaram por este ${palavra}`}
            icone="phone"
            semPadding
          >
            {anuncio.quemContatou.length ? (
              <ul className={styles.contatos}>
                {anuncio.quemContatou.map((contato) => (
                  <li key={contato.id}>
                    <Link
                      href={`/painel/mensagens?contato=${contato.id}`}
                      className={styles.contato}
                    >
                      <span className={styles.avatar}>
                        {contato.nome
                          .split(' ')
                          .slice(0, 2)
                          .map((parte) => parte[0])
                          .join('')}
                      </span>

                      <span className={styles.contatoTexto}>
                        <strong>{contato.nome}</strong>
                        <span>
                          {contato.tipo} · {contato.cidade}
                        </span>
                      </span>

                      <span className={styles.contatoLado}>
                        <span
                          className={`${styles.canal} ${
                            contato.canal === 'whatsapp' ? styles.zap : styles.chat
                          }`}
                        >
                          <Icon
                            name={contato.canal === 'whatsapp' ? 'whatsapp' : 'mail'}
                            size={12}
                          />
                          {ROTULO_CANAL[contato.canal]}
                        </span>
                        <span className={styles.quando}>{contato.quando}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={`${styles.vazio} ${styles.vazioComRecuo}`}>
                <span className={styles.vazioIcone}>
                  <Icon name="phone" size={22} />
                </span>

                <p className={styles.vazioTexto}>Ninguém entrou em contato ainda.</p>

                <p className={styles.vazioDica}>
                  Anúncio com foto boa e preço à vista costuma receber mais chamadas.
                </p>
              </div>
            )}
          </PainelCartao>

          {/* ── conteúdo ────────────────────────────────── */}
          <PainelCartao
            titulo="O que está publicado"
            acao={{ href: `/painel/anuncios/${anuncio.id}/editar`, rotulo: 'Editar' }}
            icone="edit"
          >
            <dl className={styles.dados}>
              <div>
                <dt>Preço</dt>
                <dd className={styles.preco}>{anuncio.preco}</dd>
              </div>

              <div>
                <dt>Categoria</dt>
                <dd>{anuncio.categoria}</dd>
              </div>

              {anuncio.marca ? (
                <div>
                  <dt>Marca</dt>
                  <dd>{anuncio.marca}</dd>
                </div>
              ) : null}

              {anuncio.condicao ? (
                <div>
                  <dt>Condição</dt>
                  <dd>{anuncio.condicao}</dd>
                </div>
              ) : null}

              <div>
                <dt>Fotos</dt>
                <dd>{anuncio.fotos}</dd>
              </div>

              <div>
                <dt>Localização</dt>
                <dd>
                  {anuncio.localizacao.municipio} · {anuncio.localizacao.uf}
                  {anuncio.localizacao.aproximada ? (
                    <span className={styles.nota}> (aproximada)</span>
                  ) : null}
                </dd>
              </div>
            </dl>

            <p className={styles.descricao}>{anuncio.descricao}</p>
          </PainelCartao>
        </div>

        {/* ── lateral: datas e histórico ────────────────── */}
        <div className={styles.coluna}>
          <PainelCartao titulo="Datas" icone="clock">
            <dl className={styles.datas}>
              <div>
                <dt>Criado</dt>
                <dd>{data(anuncio.datas.criadoEm)}</dd>
              </div>
              <div>
                <dt>Publicado</dt>
                <dd>{data(anuncio.datas.publicadoEm)}</dd>
              </div>
              <div>
                <dt>Expira</dt>
                <dd className={expirando ? styles.destaqueAviso : ''}>
                  {data(anuncio.datas.expiraEm)}
                </dd>
              </div>
            </dl>
          </PainelCartao>

          <PainelCartao titulo="Histórico" icone="grid" semPadding>
            <ol className={styles.historico}>
              {anuncio.historico.map((evento) => (
                <li key={evento.id} className={styles.evento}>
                  <span className={styles.eventoIcone}>
                    <Icon name={evento.icone} size={14} />
                  </span>

                  <span className={styles.eventoTexto}>
                    <strong>{evento.acao}</strong>
                    <span>{data(evento.data)}</span>
                  </span>
                </li>
              ))}
            </ol>
          </PainelCartao>
        </div>
      </div>

      {/* ── remoção em duas etapas ──────────────────────── */}
      <Modal
        open={paraRemover}
        title="Remover anúncio"
        onClose={() => setParaRemover(false)}
        footer={
          <div className={styles.rodapeModal}>
            <button
              type="button"
              className={styles.cancelarModal}
              onClick={() => setParaRemover(false)}
            >
              Cancelar
            </button>

            <button type="button" className={styles.remover} onClick={confirmarRemocao}>
              <Icon name="trash" size={16} />
              Remover anúncio
            </button>
          </div>
        }
      >
        <div className={styles.confirmacao}>
          <p className={styles.aviso}>
            O anúncio sai do ar e deixa de aparecer na busca. As{' '}
            <strong>{anuncio.vistas} visualizações</strong> e os{' '}
            <strong>{anuncio.contatos} contatos</strong> já acumulados também são perdidos.
          </p>

          <p className={styles.alternativa}>
            Se a intenção é só tirar do ar por um tempo,{' '}
            <button
              type="button"
              className={styles.linkAcao}
              onClick={() => {
                pausar();
                setParaRemover(false);
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
      </Modal>
    </>
  );
}
