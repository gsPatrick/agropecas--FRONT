'use client';

/**
 * Administração → Anúncios.
 *
 * Poder total sobre o conteúdo: ocultar, destacar, aprovar, editar e remover
 * qualquer anúncio, de qualquer conta.
 *
 * Editar abre no anúncio real, dentro do painel do dono, para não existirem
 * duas telas de edição divergindo com o tempo. O que fica aqui é o que só a
 * administração pode: mudar a situação e o destaque.
 *
 * ⚠️ "Anunciar em nome de alguém" e os números de visualizações/contatos por
 * linha saíram: a API de listagem (`admin.conteudo.anuncios.service.listar`)
 * não devolve contato nem uma rota de criação em nome de terceiro ligada
 * diretamente a esta tela — ver o comentário no topo de
 * `lib/dados/admin-anuncios.js`.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminEtiqueta from '@/components/AdminEtiqueta/AdminEtiqueta';
import AdminAcaoModal from '@/components/AdminAcaoModal/AdminAcaoModal';
import PainelSegmentos from '@/components/PainelSegmentos/PainelSegmentos';
import Input from '@/components/Input/Input';
import Icon from '@/components/Icon/Icon';
import Dica from '@/components/Dica/Dica';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import {
  listarAnuncios,
  aprovarAnuncio,
  ocultarAnuncio,
  removerAnuncio,
  destacarAnuncio,
  STATUS_ANUNCIO,
} from '@/lib/dados/admin-anuncios';
import styles from './page.module.css';

const ABAS = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'publicado', rotulo: 'No ar' },
  { id: 'em_analise', rotulo: 'Em análise' },
  { id: 'oculto', rotulo: 'Ocultos' },
  { id: 'reprovado', rotulo: 'Reprovados' },
  { id: 'denunciados', rotulo: 'Com denúncia' },
];

const MOTIVOS = [
  'Conteúdo em desacordo com as regras da plataforma',
  'Preço enganoso confirmado após verificação',
  'Anúncio duplicado pelo mesmo anunciante',
  'Dados de contato dentro da imagem',
];

function formatarPreco(anuncio) {
  return typeof anuncio.preco === 'number'
    ? anuncio.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : anuncio.preco || 'A combinar';
}

function formatarQuando(data) {
  return data ? new Date(data).toLocaleDateString('pt-BR') : '—';
}

export default function AdminAnunciosPage() {
  const aviso = useAviso();

  const [aba, setAba] = useState('todos');
  const [busca, setBusca] = useState('');
  const [anuncios, setAnuncios] = useState(null);
  const [acao, setAcao] = useState(null);

  /* a busca aceita vir pela URL: é o que faz "ver detalhes", na moderação e
     nas denúncias, cair no anúncio certo em vez de na lista inteira */
  useEffect(() => {
    const pedida = new URLSearchParams(window.location.search).get('busca');
    if (pedida) setBusca(pedida);
  }, []);

  useEffect(() => {
    let cancelado = false;
    setAnuncios(null);

    const status = aba === 'todos' || aba === 'denunciados' || aba === 'em_analise' ? undefined : aba;
    const moderacaoStatus = aba === 'em_analise' ? 'em_analise' : undefined;

    listarAnuncios({
      status,
      moderacaoStatus,
      comDenuncias: aba === 'denunciados' || undefined,
      busca: busca || undefined,
    })
      .then(({ itens }) => {
        if (!cancelado) setAnuncios(itens);
      })
      .catch((erro) => {
        if (!cancelado) {
          setAnuncios([]);
          aviso.erro(erro.message);
        }
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, busca]);

  const lista = anuncios || [];

  const contagens = {
    todos: lista.length,
    publicado: lista.filter((anuncio) => anuncio.status === 'publicado').length,
    em_analise: lista.filter((anuncio) => anuncio.moderacaoStatus === 'em_analise').length,
    oculto: lista.filter((anuncio) => anuncio.status === 'oculto').length,
    reprovado: lista.filter((anuncio) => anuncio.moderacaoStatus === 'reprovado').length,
    denunciados: lista.filter((anuncio) => anuncio.totalDenuncias > 0).length,
  };

  function atualizarLocal(id, mudancas) {
    setAnuncios((atual) => atual.map((item) => (item.id === id ? { ...item, ...mudancas } : item)));
  }

  async function alternarDestaque(anuncio) {
    const proximo = !anuncio.destaque;

    try {
      await destacarAnuncio(anuncio.id, { destacar: proximo });
      atualizarLocal(anuncio.id, { destaque: proximo });
      aviso.sucesso(
        proximo
          ? `"${anuncio.titulo}" aparece em destaque na busca.`
          : `Destaque retirado de "${anuncio.titulo}".`
      );
    } catch (erro) {
      aviso.erro(erro.message);
    }
  }

  async function publicar(anuncio) {
    try {
      await aprovarAnuncio(anuncio.id);
      atualizarLocal(anuncio.id, { status: 'publicado', moderacaoStatus: 'aprovado' });
      aviso.sucesso(`"${anuncio.titulo}" está no ar.`);
    } catch (erro) {
      aviso.erro(erro.message);
    }
  }

  async function aplicar({ motivo }) {
    const { anuncio, tipo } = acao;

    try {
      if (tipo === 'ocultar') {
        await ocultarAnuncio(anuncio.id, motivo);
        atualizarLocal(anuncio.id, { status: 'oculto' });
        aviso.sucesso(`"${anuncio.titulo}" foi ocultado.`);
      } else if (tipo === 'remover') {
        await removerAnuncio(anuncio.id, motivo);
        setAnuncios((atual) => atual.filter((item) => item.id !== anuncio.id));
        aviso.sucesso(`"${anuncio.titulo}" foi removido.`);
      }
    } catch (erro) {
      aviso.erro(erro.message);
    }

    setAcao(null);
  }

  if (!anuncios) {
    return (
      <>
        <header className={styles.topo}>
          <div>
            <h1 className={styles.titulo}>Anúncios</h1>
          </div>
        </header>
        <div className={styles.quadro}>
          <div className={styles.carregando}>
            <Esqueleto altura={54} raio={10} />
            <Esqueleto altura={54} raio={10} />
            <Esqueleto altura={54} raio={10} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <header className={styles.topo}>
        <div>
          <h1 className={styles.titulo}>Anúncios</h1>
          <p className={styles.descricao}>
            {contagens.todos} no total · {contagens.denunciados} com denúncia
          </p>
        </div>
      </header>

      <div className={styles.filtros}>
        <PainelSegmentos
          opcoes={ABAS}
          valor={aba}
          onMudar={setAba}
          contagens={contagens}
          rotulo="Situação"
        />

        <div className={styles.campoBusca}>
          <Input
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Título, anunciante ou código"
            iconLeft="search"
            aria-label="Buscar anúncio"
          />
        </div>
      </div>

      <div className={styles.quadro}>
        {lista.length ? (
          <ul className={styles.lista}>
            {lista.map((anuncio) => {
              const situacao = STATUS_ANUNCIO[anuncio.status] || STATUS_ANUNCIO.publicado;

              return (
                <li key={anuncio.id} className={styles.linha}>
                  <Link href={`/admin/anuncios/${anuncio.id}`} className={styles.miniatura}>
                    {anuncio.capa ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={anuncio.capa} alt="" width={40} height={40} style={{ objectFit: 'cover', borderRadius: 'inherit' }} />
                    ) : (
                      <Icon name="image" size={16} />
                    )}
                  </Link>

                  <div className={styles.texto}>
                    <Link href={`/admin/anuncios/${anuncio.id}`} className={styles.anuncioTitulo}>
                      {anuncio.titulo}
                      {anuncio.destaque ? (
                        <Dica texto="Em destaque na busca">
                          <span className={styles.destaque}>
                            <Icon name="check" size={10} />
                          </span>
                        </Dica>
                      ) : null}
                    </Link>

                    <span className={styles.meta}>
                      {formatarPreco(anuncio)} ·{' '}
                      {anuncio.dono ? (
                        <Link href={`/admin/usuarios/${anuncio.dono.id}`} className={styles.dono}>
                          {anuncio.dono.nome}
                        </Link>
                      ) : (
                        '—'
                      )}{' '}
                      · {anuncio.uf || '—'} · {formatarQuando(anuncio.criadoEm)}
                    </span>
                  </div>

                  <span className={styles.numeros}>
                    <span>
                      <Icon name="eye" size={13} />
                      {anuncio.totalVisualizacoes}
                    </span>
                    {anuncio.totalDenuncias ? (
                      <span className={styles.denuncias}>
                        <Icon name="bell" size={13} />
                        {anuncio.totalDenuncias}
                      </span>
                    ) : null}
                  </span>

                  <span className={styles.situacao}>
                    <AdminEtiqueta tom={situacao.tom} ponto>
                      {situacao.rotulo}
                    </AdminEtiqueta>
                  </span>

                  <span className={styles.acoes}>
                    <Dica
                      texto={anuncio.destaque ? 'Tirar destaque' : 'Destacar na busca'}
                      alinhamento="fim"
                    >
                      <button
                        type="button"
                        className={`${styles.acaoIcone} ${anuncio.destaque ? styles.acaoAtiva : ''}`}
                        onClick={() => alternarDestaque(anuncio)}
                        aria-label={anuncio.destaque ? 'Tirar destaque' : 'Destacar'}
                      >
                        <Icon name="chart" size={15} />
                      </button>
                    </Dica>

                    {anuncio.status === 'oculto' || anuncio.moderacaoStatus === 'em_analise' ? (
                      <Dica texto="Publicar" alinhamento="fim">
                        <button
                          type="button"
                          className={styles.acaoIcone}
                          onClick={() => publicar(anuncio)}
                          aria-label="Publicar"
                        >
                          <Icon name="check" size={15} />
                        </button>
                      </Dica>
                    ) : (
                      <Dica texto="Ocultar da busca" alinhamento="fim">
                        <button
                          type="button"
                          className={styles.acaoIcone}
                          onClick={() =>
                            setAcao({
                              id: `ocultar-${anuncio.id}`,
                              anuncio,
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
                          aria-label="Ocultar"
                        >
                          <Icon name="eye-off" size={15} />
                        </button>
                      </Dica>
                    )}

                    <Dica texto="Editar anúncio" alinhamento="fim">
                      <Link
                        href={`/painel/anuncios/${anuncio.id}/editar`}
                        className={styles.acaoIcone}
                        aria-label="Editar"
                      >
                        <Icon name="edit" size={15} />
                      </Link>
                    </Dica>

                    <Dica texto="Abrir ficha do anúncio" alinhamento="fim">
                      <Link
                        href={`/admin/anuncios/${anuncio.id}`}
                        className={styles.acaoIcone}
                        aria-label={`Abrir ${anuncio.titulo}`}
                      >
                        <Icon name="chevron-right" size={15} />
                      </Link>
                    </Dica>

                    <Dica texto="Remover definitivamente" alinhamento="fim">
                      <button
                        type="button"
                        className={`${styles.acaoIcone} ${styles.acaoPerigo}`}
                        onClick={() =>
                          setAcao({
                            id: `remover-${anuncio.id}`,
                            anuncio,
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
                        aria-label="Remover"
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </Dica>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.vazio}>Nenhum anúncio com esses filtros.</p>
        )}
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
