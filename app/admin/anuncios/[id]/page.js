'use client';

/**
 * Administração → ficha do anúncio.
 *
 * Traz o que a API expõe: descrição, fotos, contagem de denúncias abertas e o
 * motivo da última decisão de moderação. As ações ficam numa coluna própria,
 * separadas dos dados, pelo mesmo motivo da ficha do usuário: é misturando
 * ação destrutiva com conteúdo que se erra o clique.
 *
 * ⚠️ "Sinais" automáticos, histórico de moderação evento a evento, lista de
 * conversas e o texto de cada denúncia não existem na resposta de
 * `GET /admin/anuncios/:id` (`moderacao.fila.service.ver` /
 * `admin.conteudo.anuncios.service.ver`) — nem categoria, marca, condição ou
 * forma de entrega, porque `linha()` não expõe essas colunas. Essas seções do
 * mock foram removidas em vez de preenchidas com dado inventado; ver o
 * comentário no topo de `lib/dados/admin-anuncios.js`.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import PainelCartao from '@/components/PainelCartao/PainelCartao';
import AdminEtiqueta from '@/components/AdminEtiqueta/AdminEtiqueta';
import AdminAcaoModal from '@/components/AdminAcaoModal/AdminAcaoModal';
import Icon from '@/components/Icon/Icon';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import {
  obterAnuncio,
  aprovarAnuncio,
  ocultarAnuncio,
  removerAnuncio,
  destacarAnuncio,
  STATUS_ANUNCIO,
} from '@/lib/dados/admin-anuncios';
import styles from './page.module.css';

const MOTIVOS = [
  'Conteúdo em desacordo com as regras da plataforma',
  'Preço enganoso confirmado após verificação',
  'Anúncio duplicado pelo mesmo anunciante',
  'Dados de contato dentro da imagem ou da descrição',
];

function formatarPreco(anuncio) {
  return typeof anuncio.preco === 'number'
    ? anuncio.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : anuncio.preco || 'A combinar';
}

function formatarData(data) {
  return data ? new Date(data).toLocaleDateString('pt-BR') : null;
}

export default function AdminAnuncioPage() {
  const { id } = useParams();
  const router = useRouter();
  const aviso = useAviso();

  const [anuncio, setAnuncio] = useState(null);
  const [ausente, setAusente] = useState(false);
  const [acao, setAcao] = useState(null);

  useEffect(() => {
    let cancelado = false;
    setAnuncio(null);
    setAusente(false);

    obterAnuncio(id)
      .then((dados) => {
        if (!cancelado) setAnuncio(dados);
      })
      .catch((erro) => {
        if (!cancelado) {
          setAusente(true);
          aviso.erro(erro.message);
        }
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (ausente) {
    return (
      <div className={styles.ausente}>
        <p className={styles.ausenteTitulo}>Anúncio não encontrado</p>
        <Link href="/admin/anuncios" className={styles.ausenteAcao}>
          <Icon name="chevron-left" size={15} />
          Voltar à listagem
        </Link>
      </div>
    );
  }

  if (!anuncio) {
    return (
      <div className={styles.carregando}>
        <Esqueleto altura={70} raio={12} />
        <Esqueleto altura={220} raio={12} />
      </div>
    );
  }

  const situacao = STATUS_ANUNCIO[anuncio.status] || STATUS_ANUNCIO.publicado;
  const noAr = anuncio.status === 'publicado';
  const emAnalise = anuncio.moderacaoStatus === 'em_analise';

  async function atualizarComo(dados, mensagem) {
    setAnuncio((atual) => ({ ...atual, ...dados }));
    aviso.sucesso(mensagem);
  }

  async function alternarDestaque() {
    const proximo = !anuncio.destaque;
    try {
      await destacarAnuncio(anuncio.id, { destacar: proximo });
      atualizarComo(
        { destaque: proximo },
        proximo
          ? `"${anuncio.titulo}" aparece em destaque na busca.`
          : `Destaque retirado de "${anuncio.titulo}".`
      );
    } catch (erro) {
      aviso.erro(erro.message);
    }
  }

  async function publicar() {
    try {
      await aprovarAnuncio(anuncio.id);
      atualizarComo({ status: 'publicado', moderacaoStatus: 'aprovado' }, `"${anuncio.titulo}" está no ar.`);
    } catch (erro) {
      aviso.erro(erro.message);
    }
  }

  async function aplicar({ motivo }) {
    try {
      if (acao.tipo === 'ocultar') {
        await ocultarAnuncio(anuncio.id, motivo);
        atualizarComo({ status: 'oculto' }, `"${anuncio.titulo}" foi ocultado.`);
      } else if (acao.tipo === 'remover') {
        await removerAnuncio(anuncio.id, motivo);
        aviso.sucesso(`"${anuncio.titulo}" foi removido.`);
        router.push('/admin/anuncios');
        return;
      }
    } catch (erro) {
      aviso.erro(erro.message);
    }

    setAcao(null);
  }

  return (
    <>
      <header className={styles.topo}>
        <Link href="/admin/anuncios" className={styles.voltar} aria-label="Voltar à listagem">
          <Icon name="chevron-left" size={18} />
        </Link>

        <div className={styles.identidade}>
          <h1 className={styles.titulo}>{anuncio.titulo}</h1>

          <p className={styles.descricaoTopo}>
            {formatarPreco(anuncio)} · {anuncio.uf || '—'}
            {formatarData(anuncio.publicadoEm) ? ` · publicado ${formatarData(anuncio.publicadoEm)}` : ''}
            {formatarData(anuncio.expiraEm) ? ` · expira em ${formatarData(anuncio.expiraEm)}` : ''}
          </p>
        </div>

        <div className={styles.etiquetasTopo}>
          <AdminEtiqueta tom={situacao.tom} ponto>
            {situacao.rotulo}
          </AdminEtiqueta>

          {anuncio.destaque ? <AdminEtiqueta tom="alerta">Em destaque</AdminEtiqueta> : null}
        </div>
      </header>

      {anuncio.moderacaoMotivo ? (
        <section className={styles.sinais}>
          <span className={styles.sinaisIcone}>
            <Icon name="bell" size={17} />
          </span>

          <div className={styles.sinaisTexto}>
            <strong>Motivo da última decisão de moderação</strong>
            <ul>
              <li>
                <Icon name="chevron-right" size={12} />
                {anuncio.moderacaoMotivo}
              </li>
            </ul>
          </div>
        </section>
      ) : null}

      <div className={styles.grade}>
        <div className={styles.coluna}>
          <PainelCartao titulo="O anúncio" icone="grid">
            {anuncio.fotos.length ? (
              <div className={styles.fotos}>
                {anuncio.fotos.map((foto) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={foto.id} src={foto.url} alt="" className={styles.foto} />
                ))}
              </div>
            ) : null}

            <p className={styles.descricao}>{anuncio.descricao || 'Sem descrição.'}</p>

            <dl className={styles.dados}>
              {[
                ['Tipo', anuncio.tipo === 'servico' ? 'Serviço' : anuncio.tipo === 'maquina' ? 'Máquina' : 'Peça'],
                ['Código', anuncio.codigo],
              ].map(([rotulo, valor]) => (
                <div key={rotulo} className={styles.dado}>
                  <dt>{rotulo}</dt>
                  <dd>{valor}</dd>
                </div>
              ))}
            </dl>
          </PainelCartao>

          <div className={styles.metricas}>
            {[
              { rotulo: 'Visualizações', valor: anuncio.totalVisualizacoes || 0, icone: 'eye' },
              { rotulo: 'Denúncias abertas', valor: anuncio.denunciasAbertas || 0, icone: 'bell', perigo: true },
            ].map((metrica) => (
              <div
                key={metrica.rotulo}
                className={`${styles.metrica} ${
                  metrica.perigo && metrica.valor > 0 ? styles.metricaPerigo : ''
                }`}
              >
                <Icon name={metrica.icone} size={15} />
                <strong>{metrica.valor}</strong>
                <span>{metrica.rotulo}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className={styles.coluna}>
          {anuncio.dono ? (
            <PainelCartao titulo="Anunciante" icone="user">
              <Link href={`/admin/usuarios/${anuncio.dono.id}`} className={styles.dono}>
                <span className={styles.avatar}>
                  {anuncio.dono.nome
                    ?.split(' ')
                    .slice(0, 2)
                    .map((parte) => parte[0])
                    .join('')
                    .toUpperCase()}
                </span>

                <span className={styles.donoTexto}>
                  <strong>{anuncio.dono.nome}</strong>
                  <span>{anuncio.dono.email}</span>
                </span>
              </Link>

              <div className={styles.donoAtalhos}>
                <Link href={`/admin/usuarios/${anuncio.dono.id}/anuncios`} className={styles.atalho}>
                  <Icon name="grid" size={14} />
                  Outros anúncios
                </Link>
              </div>
            </PainelCartao>
          ) : null}

          <PainelCartao titulo="Ações" icone="gear">
            <div className={styles.acoes}>
              <Link href={`/painel/anuncios/${anuncio.id}/editar`} className={styles.acao}>
                <Icon name="edit" size={16} />
                <span>
                  <strong>Editar anúncio</strong>
                  <span>Alteração registrada em seu nome</span>
                </span>
              </Link>

              {emAnalise ? (
                <button type="button" className={`${styles.acao} ${styles.acaoPrincipal}`} onClick={publicar}>
                  <Icon name="check" size={16} />
                  <span>
                    <strong>Aprovar e publicar</strong>
                    <span>Vai ao ar imediatamente</span>
                  </span>
                </button>
              ) : null}

              <button
                type="button"
                className={`${styles.acao} ${anuncio.destaque ? styles.acaoAtiva : ''}`}
                onClick={alternarDestaque}
              >
                <Icon name="chart" size={16} />
                <span>
                  <strong>{anuncio.destaque ? 'Tirar destaque' : 'Destacar na busca'}</strong>
                  <span>Define quem aparece primeiro no resultado</span>
                </span>
              </button>

              {noAr ? (
                <button
                  type="button"
                  className={`${styles.acao} ${styles.acaoAlerta}`}
                  onClick={() =>
                    setAcao({
                      id: 'ocultar',
                      tipo: 'ocultar',
                      titulo: 'Ocultar anúncio',
                      descricao: 'Sai das buscas; o anunciante pode corrigir e reenviar.',
                      confirmar: 'Ocultar',
                      consequencias: [
                        'O anúncio deixa de aparecer para qualquer visitante',
                        'O anunciante recebe o motivo e pode editar',
                      ],
                    })
                  }
                >
                  <Icon name="eye-off" size={16} />
                  <span>
                    <strong>Ocultar da busca</strong>
                    <span>Reversível — o dono pode corrigir</span>
                  </span>
                </button>
              ) : (
                <button type="button" className={styles.acao} onClick={publicar}>
                  <Icon name="check" size={16} />
                  <span>
                    <strong>Publicar</strong>
                    <span>Devolve o anúncio à busca</span>
                  </span>
                </button>
              )}

              <button
                type="button"
                className={`${styles.acao} ${styles.acaoPerigo}`}
                onClick={() =>
                  setAcao({
                    id: 'remover',
                    tipo: 'remover',
                    titulo: 'Remover anúncio',
                    descricao: 'Remoção definitiva, com registro na auditoria.',
                    confirmar: 'Remover',
                    destrutiva: true,
                    palavra: 'REMOVER',
                    consequencias: [
                      'O anúncio sai do ar e não pode ser republicado',
                      'As conversas ligadas a ele ficam guardadas',
                      'A ação fica registrada no seu nome',
                    ],
                  })
                }
              >
                <Icon name="trash" size={16} />
                <span>
                  <strong>Remover anúncio</strong>
                  <span>Definitivo — exige confirmação por escrito</span>
                </span>
              </button>
            </div>
          </PainelCartao>
        </aside>
      </div>

      <AdminAcaoModal
        acao={acao}
        motivos={MOTIVOS}
        onFechar={() => setAcao(null)}
        onConfirmar={aplicar}
      />
    </>
  );
}
