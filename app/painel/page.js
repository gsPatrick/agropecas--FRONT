'use client';

/**
 * Início do painel.
 *
 * Ordem das seções = ordem das perguntas de quem abre a tela:
 *
 *  1. **O que está pegando fogo?** — anúncios prestes a expirar. Painel que
 *     abre em gráfico bonito e esconde o aviso faz a pessoa descobrir dias
 *     depois que o anúncio saiu do ar sozinho.
 *
 *     As pendências de cadastro saíram desta tela por decisão do cliente —
 *     elas continuam em `painel-mock` e pertencem às telas de perfil, onde a
 *     pessoa está justamente preenchendo o que falta.
 *  2. **Como estou indo?** — métricas, com período escolhível.
 *  3. **O que eu tenho no ar?** — a lista, filtrável por status.
 *  4. **Quem me procurou?** — contatos recentes.
 *
 * O grid é de 12 colunas em vez de blocos empilhados: assim os cartões da
 * lateral se alinham com a lista principal e a tela para de parecer três
 * páginas coladas.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PainelTopo from '@/components/PainelTopo/PainelTopo';
import PainelCartao from '@/components/PainelCartao/PainelCartao';
import PainelMetrica from '@/components/PainelMetrica/PainelMetrica';
import PainelRelogio from '@/components/PainelRelogio/PainelRelogio';
import PainelSegmentos from '@/components/PainelSegmentos/PainelSegmentos';
import Pagination from '@/components/Pagination/Pagination';
import Icon from '@/components/Icon/Icon';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { useSessao } from '@/lib/sessao';
import { useChat } from '@/components/ChatProvider/ChatProvider';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import {
  carregarDadosPainel,
  PERIODOS,
  STATUS_ANUNCIO,
  ROTULO_STATUS,
  ROTULO_CANAL,
} from '@/lib/dados/painel';
import { acaoPrincipal } from '@/lib/painel-menu';
import styles from './page.module.css';

export default function PainelPage() {
  const { perfil, usuario, tipoPerfil } = useSessao();
  const { naoLidas } = useChat();
  const aviso = useAviso();

  const [periodo, setPeriodo] = useState('7d');
  const [status, setStatus] = useState('todos');
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const [dados, setDados] = useState(null);

  useEffect(() => {
    if (!usuario) return undefined;

    const controle = new AbortController();

    carregarDadosPainel(tipoPerfil, periodo, { sinal: controle.signal })
      .then(setDados)
      .catch((erro) => {
        if (erro.name !== 'AbortError') aviso.erro('Não foi possível carregar o painel.');
      });

    return () => controle.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id, tipoPerfil, periodo]);

  if (!usuario) return null;

  const acao = acaoPrincipal(perfil);

  if (!dados) {
    return (
      <>
        <PainelTopo
          perfil={perfil}
          titulo={`Olá, ${usuario.nome.split(' ')[0]}`}
          descricao={<PainelRelogio />}
        />

        <section className={styles.metricas}>
          {Array.from({ length: 4 }, (_, indice) => (
            <Esqueleto key={indice} altura={104} raio={12} />
          ))}
        </section>
      </>
    );
  }

  const primeiroNome = usuario.nome.split(' ')[0];
  const comparacao = PERIODOS.find((p) => p.id === periodo).comparacao;

  const filtrados =
    status === 'todos' ? dados.anuncios : dados.anuncios.filter((a) => a.status === status);

  /* a página é presa ao intervalo válido em vez de guardada como está: trocar
     o filtro estando na página 3 deixaria a lista vazia sem explicação */
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * porPagina;
  const anuncios = filtrados.slice(inicio, inicio + porPagina);

  /* os contatos acompanham a MESMA página e a mesma quantidade: a barra é uma
     só e fica embaixo dos dois cartões — passar a página e ver só um lado
     mudar leria como defeito. As duas listas têm o mesmo tamanho justamente
     para isso funcionar.

     O teto é `anuncios.length` e não `porPagina`: com o filtro em "Rascunhos"
     a lista da esquerda cai para 4, e manter 10 contatos ao lado deixaria o
     bloco torto justamente quando os dois deveriam andar juntos */
  const contatos = dados.contatos.slice(inicio, inicio + anuncios.length);

  function trocarStatus(novoStatus) {
    setStatus(novoStatus);
    setPagina(1);
  }

  /* os contatos acompanham a MESMA página e a mesma quantidade: a barra é uma
     só e fica embaixo dos dois cartões — passar a página e ver só um lado
     mudar leria como defeito. As duas listas têm o mesmo tamanho justamente
     para isso funcionar */
  function trocarPorPagina(quantidade) {
    setPorPagina(quantidade);
    setPagina(1);
  }

  const novos = dados.contatos.filter((c) => c.novo).length;
  const ehPrestador = tipoPerfil === 'prestador';
  const palavra = ehPrestador ? 'serviço' : 'anúncio';

  return (
    <>
      <PainelTopo
        perfil={perfil}
        titulo={`Olá, ${primeiroNome}`}
        descricao={<PainelRelogio />}
        acoes={
          <Link href={acao.href} className={styles.acaoTopo}>
            <Icon name="plus" size={17} />
            <span>{acao.rotulo}</span>
          </Link>
        }
      />

      {/* ── 1. o que exige ação, lado a lado ───────────── */}
      {dados.expirando.length || naoLidas > 0 ? (
        <section className={styles.avisos}>
          {dados.expirando.length ? (
            <Link href="/painel/anuncios?filtro=expirando" className={styles.alerta}>
              <span className={styles.alertaIcone}>
                <Icon name="clock" size={18} />
              </span>

              <span className={styles.alertaTexto}>
                <strong>
                  {dados.expirando.length} {palavra}
                  {dados.expirando.length > 1 ? 's' : ''} expirando
                </strong>
                <span>
                  O mais próximo sai do ar em{' '}
                  {Math.min(...dados.expirando.map((a) => a.expiraEm))} dia(s). Renove para não
                  perder as visualizações já acumuladas.
                </span>
              </span>

              <Icon name="chevron-right" size={18} className={styles.alertaSeta} />
            </Link>
          ) : null}

          {naoLidas > 0 ? (
            <Link href="/painel/mensagens" className={styles.aviso}>
              <span className={styles.avisoIcone}>
                <Icon name="mail" size={18} />
              </span>

              <span className={styles.avisoTexto}>
                <strong>
                  {naoLidas} mensagem{naoLidas > 1 ? 's' : ''} sem ler
                </strong>
                <span>
                  Quem chama e não recebe resposta procura outro anunciante. Responder rápido é o
                  que fecha negócio.
                </span>
              </span>

              <Icon name="chevron-right" size={18} className={styles.avisoSeta} />
            </Link>
          ) : null}
        </section>
      ) : null}

      {/* ── 2. como estou indo ─────────────────────────── */}
      <section className={styles.secao}>
        <header className={styles.secaoTopo}>
          <h2 className={styles.secaoTitulo}>Seu desempenho</h2>

          <PainelSegmentos
            rotulo="Período das métricas"
            opcoes={PERIODOS}
            valor={periodo}
            onMudar={setPeriodo}
          />
        </header>

        <div className={styles.metricas}>
          {dados.metricas.map((metrica) => (
            <PainelMetrica key={metrica.chave} {...metrica} comparacao={comparacao} />
          ))}
        </div>
      </section>

      {/* ── 3 e 4. lista + lateral ─────────────────────── */}
      <div className={styles.grade}>
        <PainelCartao
          titulo={ehPrestador ? 'Seus serviços' : 'Seus anúncios'}
          acao={{ href: '/painel/anuncios', rotulo: 'Ver todos' }}
          icone="grid"
          className={styles.principal}
          semPadding
        >
          <div className={styles.filtros}>
            <PainelSegmentos
              rotulo="Filtrar por situação"
              opcoes={STATUS_ANUNCIO}
              valor={status}
              onMudar={trocarStatus}
              contagens={dados.contagem}
            />
          </div>

          {anuncios.length ? (
            <>
              <ul className={styles.anuncios}>
                {anuncios.map((anuncio) => (
                  <li key={anuncio.id}>
                    <Link href={`/painel/anuncios/${anuncio.id}`} className={styles.anuncio}>
                      <span className={styles.miniatura} aria-hidden="true">
                        <Icon name="image" size={18} />
                      </span>

                      <span className={styles.anuncioTexto}>
                        <span className={styles.anuncioLinha}>
                          <strong className={styles.anuncioTitulo}>{anuncio.titulo}</strong>

                          <span className={`${styles.status} ${styles[anuncio.status]}`}>
                            {ROTULO_STATUS[anuncio.status]}
                          </span>
                        </span>

                        <span className={styles.anuncioMeta}>
                          <span className={styles.preco}>{anuncio.preco}</span>

                          {/* números com o rótulo abreviado e alinhados: a
                              versão anterior escrevia "96 visualizações · 4
                              contatos" por extenso, e a linha ficava longa
                              demais para ser lida de relance numa lista */}
                          <span className={styles.numero} title="Visualizações">
                            <Icon name="eye" size={13} />
                            {anuncio.vistas}
                          </span>

                          <span className={styles.numero} title="Contatos recebidos">
                            <Icon name="phone" size={13} />
                            {anuncio.contatos}
                          </span>

                          {anuncio.expiraEm !== undefined && anuncio.expiraEm <= 7 ? (
                            <span className={styles.expira}>expira em {anuncio.expiraEm}d</span>
                          ) : null}
                        </span>
                      </span>

                      <Icon name="chevron-right" size={16} className={styles.anuncioSeta} />
                    </Link>
                  </li>
                ))}
              </ul>

            </>
          ) : (
            <div className={styles.vazio}>
              <Icon name="grid" size={26} />
              <p>
                Nenhum {palavra} com a situação{' '}
                <strong>{STATUS_ANUNCIO.find((s) => s.id === status).rotulo.toLowerCase()}</strong>.
              </p>
              <button type="button" className={styles.vazioAcao} onClick={() => trocarStatus('todos')}>
                Ver todos
              </button>
            </div>
          )}
        </PainelCartao>

        <PainelCartao
          titulo="Últimos contatos"
          acao={{ href: '/painel/mensagens', rotulo: 'Mensagens' }}
          icone="phone"
          className={styles.secundario}
          semPadding
        >
          {/* mesma faixa do cartão ao lado, para as duas listas começarem na
              mesma altura. A descrição saiu daqui: ela ocupava uma altura
              diferente da dos filtros e era o que desalinhava os dois */}
          <div className={styles.filtros}>
            <p className={styles.resumoLista}>
              Quem chamou você e por qual anúncio
              <span className={styles.resumoNumeros}>
                <strong>{dados.contatos.length}</strong> no total
                {novos > 0 ? (
                  <>
                    <span className={styles.resumoSeparador}>·</span>
                    <strong className={styles.resumoNovos}>{novos} novos</strong>
                  </>
                ) : null}
              </span>
            </p>
          </div>

          <ul className={styles.contatos}>
            {contatos.map((contato) => (
              <li key={contato.id}>
                <Link href={`/painel/mensagens?contato=${contato.id}`} className={styles.contato}>
                  {/* metade esquerda: QUEM procurou */}
                  <span className={styles.ladoContato}>
                    <span className={styles.avatarContato}>
                      {contato.nome
                        .split(' ')
                        .slice(0, 2)
                        .map((p) => p[0])
                        .join('')}
                    </span>

                    <span className={styles.ladoTexto}>
                      <span className={styles.linhaTopo}>
                        <strong className={styles.contatoNome}>{contato.nome}</strong>
                        {contato.novo ? <span className={styles.novo}>novo</span> : null}
                      </span>

                      <span className={styles.contatoQuem}>{contato.tipo}</span>
                      {contato.cidade ? (
                        <span className={styles.contatoQuem}>{contato.cidade}</span>
                      ) : null}

                      {/* o canal fica com o contato: é por onde ELE chamou */}
                      <span
                        className={`${styles.canal} ${
                          contato.canal === 'whatsapp' ? styles.canalZap : styles.canalChat
                        }`}
                      >
                        <Icon name={contato.canal === 'whatsapp' ? 'whatsapp' : 'mail'} size={12} />
                        {ROTULO_CANAL[contato.canal]}
                      </span>
                    </span>
                  </span>

                  {/* a seta liga as duas metades: quem procurou → sobre o quê */}
                  <span className={styles.ligacao} aria-hidden="true">
                    <Icon name="arrow-right" size={16} />
                  </span>

                  {/* metade direita: SOBRE QUAL anúncio */}
                  <span className={styles.ladoAnuncio}>
                    <span className={styles.miniaturaContato}>
                      <Icon name="image" size={16} />
                    </span>

                    <span className={styles.ladoTexto}>
                      <span className={styles.linhaTopo}>
                        <span className={styles.etiqueta}>Anúncio</span>
                        <span className={styles.quando}>{contato.quando}</span>
                      </span>

                      <strong className={styles.anuncioNome}>{contato.anuncio}</strong>
                      {contato.anuncioPreco ? (
                        <span className={styles.anuncioPreco}>{contato.anuncioPreco}</span>
                      ) : null}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </PainelCartao>

        {/* a barra atravessa as duas colunas e encosta nos dois cartões: eles
            deixam de ser dois blocos soltos e viram um só. O `porPagina` é
            compartilhado — mudar aqui reduz as duas listas ao mesmo tempo */}
        <div className={styles.barraPaginacao}>
          <Pagination
            pagina={paginaAtual}
            total={filtrados.length}
            porPagina={porPagina}
            onPagina={setPagina}
            onPorPagina={trocarPorPagina}
            opcoes={[5, 10, 15, 20]}
            variante="embutida"
          />
        </div>
      </div>
    </>
  );
}
