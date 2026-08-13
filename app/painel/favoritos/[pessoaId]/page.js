'use client';

/**
 * Página do contato favorito.
 *
 * Tudo que já foi tratado com aquela pessoa, agrupado por anúncio e separado
 * pela situação dele: o que está no ar continua sendo negociação em aberto; o
 * que saiu do ar é histórico. A régua é o anúncio, não a conversa — é ele que
 * define se ainda há o que combinar.
 *
 * Sem essa separação a página vira uma pilha em que a negociação viva de hoje
 * aparece embaixo de uma de três meses atrás, e a pessoa perde justamente a
 * que dava dinheiro.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import PainelCartao from '@/components/PainelCartao/PainelCartao';
import PainelSegmentos from '@/components/PainelSegmentos/PainelSegmentos';
import Icon from '@/components/Icon/Icon';
import Dica from '@/components/Dica/Dica';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import { useSessao, PERFIS } from '@/lib/sessao';
import { useFavoritos } from '@/lib/favoritos';
import { useChat } from '@/components/ChatProvider/ChatProvider';
import { ROTULO_STATUS } from '@/lib/dados/meus-anuncios';
import styles from './page.module.css';

const ABAS_FAVORITOS = [
  { id: 'ativas', rotulo: 'Em negociação' },
  { id: 'encerradas', rotulo: 'Histórico' },
  { id: 'todas', rotulo: 'Tudo' },
];

/** mesmo status real do anúncio (`STATUS_ANUNCIO`), com o tom visual que
    esta tela já usava — `oculto` é o único que o mock não previa (medida da
    administração, ver `lib/dados/meus-anuncios.js`) */
const SITUACAO_CONVERSA = {
  publicado: { rotulo: 'Em negociação', tom: 'success', icone: 'check' },
  pausado: { rotulo: 'Anúncio pausado', tom: 'warning', icone: 'eye-off' },
  oculto: { rotulo: 'Anúncio ocultado', tom: 'warning', icone: 'eye-off' },
  expirado: { rotulo: 'Anúncio expirado', tom: 'neutral', icone: 'clock' },
  rascunho: { rotulo: 'Anúncio em rascunho', tom: 'neutral', icone: 'edit' },
};

function iniciais(nome = '') {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export default function ContatoFavoritoPage() {
  const { pessoaId } = useParams();
  const { usuario } = useSessao();
  const { ehFavorito, alternar } = useFavoritos();
  const { conversas } = useChat();
  const aviso = useAviso();

  const [aba, setAba] = useState('ativas');

  if (!usuario) return null;

  const daPessoa = conversas.filter((conversa) => conversa.pessoaId === pessoaId);

  if (!daPessoa.length) {
    return (
      <div className={styles.ausente}>
        <p className={styles.ausenteTitulo}>Contato não encontrado</p>
        <p className={styles.ausenteTexto}>
          Ele pode ter saído dos favoritos ou não ter mais conversas com você.
        </p>
        <Link href="/painel/favoritos" className={styles.ausenteAcao}>
          <Icon name="chevron-left" size={15} />
          Voltar aos favoritos
        </Link>
      </div>
    );
  }

  const pessoa = daPessoa[0].pessoa;
  const pessoaTipo = daPessoa[0].pessoaTipo;
  const ativas = daPessoa.filter((conversa) => conversa.anuncio.status === 'publicado');
  const encerradas = daPessoa.filter((conversa) => conversa.anuncio.status !== 'publicado');
  const favorito = ehFavorito(pessoaId);

  const grupos = { ativas, encerradas, todas: daPessoa };
  const lista = grupos[aba] || daPessoa;

  const contagens = {
    ativas: ativas.length,
    encerradas: encerradas.length,
    todas: daPessoa.length,
  };

  function alternarFavorito() {
    const virou = alternar(pessoaId);

    aviso.sucesso(virou ? `${pessoa} voltou aos favoritos.` : `${pessoa} saiu dos favoritos.`);
  }

  return (
    <>
      {/* cabeçalho próprio, e não o PainelTopo: aqui o assunto é uma pessoa,
          com avatar e origem — não o nome de uma seção */}
      <header className={styles.topo}>
        <Link href="/painel/favoritos" className={styles.voltar} aria-label="Voltar aos favoritos">
          <Icon name="chevron-left" size={18} />
        </Link>

        <span className={styles.avatar}>{iniciais(pessoa)}</span>

        <div className={styles.identidade}>
          <h1 className={styles.nome}>{pessoa}</h1>
          {pessoaTipo ? <p className={styles.origem}>{PERFIS[pessoaTipo]?.rotulo}</p> : null}
        </div>

        <Dica texto={favorito ? 'Tirar dos favoritos' : 'Marcar como favorito'} alinhamento="fim">
          <button
            type="button"
            className={`${styles.coracao} ${favorito ? styles.coracaoAtivo : ''}`}
            onClick={alternarFavorito}
            aria-pressed={favorito}
            aria-label={`Favoritar ${pessoa}`}
          >
            <Icon name="heart" size={18} />
          </button>
        </Dica>
      </header>

      <div className={styles.resumo}>
        <div className={styles.numero}>
          <strong>{daPessoa.length}</strong>
          <span>anúncio(s) conversado(s)</span>
        </div>

        <div className={styles.numero}>
          <strong className={styles.vivo}>{ativas.length}</strong>
          <span>em negociação</span>
        </div>

        <div className={styles.numero}>
          <strong>{encerradas.length}</strong>
          <span>no histórico</span>
        </div>
      </div>

      <div className={styles.abas}>
        <PainelSegmentos
          opcoes={ABAS_FAVORITOS}
          valor={aba}
          onMudar={setAba}
          contagens={contagens}
          rotulo="Situação das conversas"
        />
      </div>

      <PainelCartao semPadding>
        {lista.length ? (
          <ul className={styles.anuncios}>
            {lista.map((conversa) => {
              const situacao = SITUACAO_CONVERSA[conversa.anuncio.status] || SITUACAO_CONVERSA.expirado;
              const ativa = conversa.anuncio.status === 'publicado';

              return (
                <li
                  key={conversa.id}
                  className={`${styles.anuncio} ${ativa ? '' : styles.anuncioEncerrado}`}
                >
                  <div className={styles.cabecalhoAnuncio}>
                    <span className={styles.miniatura}>
                      <Icon name="image" size={15} />
                    </span>

                    <div className={styles.dadosAnuncio}>
                      <Link
                        href={`/painel/anuncios/${conversa.anuncio.id}`}
                        className={styles.tituloAnuncio}
                      >
                        {conversa.anuncio.titulo}
                      </Link>

                      <span className={styles.preco}>{conversa.anuncio.preco}</span>
                    </div>

                    <span className={`${styles.situacao} ${styles[situacao.tom]}`}>
                      <Icon name={situacao.icone} size={12} />
                      {situacao.rotulo}
                    </span>
                  </div>

                  {conversa.ultimaMensagem ? (
                    <p className={styles.ultima}>
                      <span className={styles.autor}>
                        {conversa.ultimaMensagem.minha ? 'Você' : pessoa.split(' ')[0]}:
                      </span>
                      {conversa.ultimaMensagem.texto}
                    </p>
                  ) : null}

                  <div className={styles.rodape}>
                    {conversa.ultimaMensagem?.hora ? (
                      <span className={styles.quando}>
                        <Icon name="clock" size={12} />
                        {conversa.ultimaMensagem.hora}
                      </span>
                    ) : null}

                    {conversa.naoLidas > 0 ? (
                      <span className={styles.naoLidas}>{conversa.naoLidas} não lida(s)</span>
                    ) : null}

                    <Link href={`/painel/mensagens?conversa=${conversa.id}`} className={styles.abrir}>
                      {ativa ? 'Continuar conversa' : 'Ver conversa'}
                      <Icon name="arrow-right" size={14} />
                    </Link>
                  </div>

                  {!ativa ? (
                    <p className={styles.nota}>
                      Anúncio {ROTULO_STATUS[conversa.anuncio.status]?.toLowerCase()} — a
                      conversa fica guardada, mas quem procurar não encontra mais o item.
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className={styles.vazio}>
            <p className={styles.vazioTitulo}>
              {aba === 'ativas' ? 'Nenhuma negociação em aberto' : 'Nada no histórico ainda'}
            </p>

            <p className={styles.vazioTexto}>
              {aba === 'ativas'
                ? 'Todos os anúncios conversados com este contato saíram do ar. O histórico continua na aba ao lado.'
                : 'As conversas aparecem aqui quando o anúncio sai do ar — pausado, expirado ou removido.'}
            </p>
          </div>
        )}
      </PainelCartao>
    </>
  );
}
