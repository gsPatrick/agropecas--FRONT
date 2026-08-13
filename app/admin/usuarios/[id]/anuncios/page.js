'use client';

/**
 * Administração → anúncios de um usuário.
 *
 * Existe separada da listagem geral porque a pergunta é outra. Em
 * `/admin/anuncios` a pergunta é “o que está errado na plataforma”; aqui é “o
 * que esta pessoa publica” — o padrão aparece vendo os anúncios dela lado a
 * lado: preços fora da curva, fotos repetidas, reanúncios.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminEtiqueta from '@/components/AdminEtiqueta/AdminEtiqueta';
import AdminAcaoModal from '@/components/AdminAcaoModal/AdminAcaoModal';
import Icon from '@/components/Icon/Icon';
import Dica from '@/components/Dica/Dica';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import { obterUsuario } from '@/lib/dados/admin-usuarios';
import {
  listarAnuncios,
  removerAnuncio,
  ocultarAnuncio,
  aprovarAnuncio,
  destacarAnuncio,
  STATUS_ANUNCIO,
} from '@/lib/dados/admin-anuncios';
import styles from './page.module.css';

const MOTIVOS = [
  'Conteúdo em desacordo com as regras da plataforma',
  'Preço enganoso confirmado após verificação',
  'Anúncio duplicado pelo mesmo anunciante',
  'Dados de contato dentro da imagem',
];

function formatarPreco(valor) {
  if (valor == null) return 'A combinar';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function AnunciosDoUsuarioPage() {
  const { id } = useParams();
  const aviso = useAviso();

  const [usuario, setUsuario] = useState(null);
  const [ausente, setAusente] = useState(false);
  const [anuncios, setAnuncios] = useState(null);
  const [acao, setAcao] = useState(null);

  useEffect(() => {
    let cancelado = false;

    Promise.all([obterUsuario(id), listarAnuncios({ usuarioId: id })])
      .then(([dadosUsuario, { itens }]) => {
        if (cancelado) return;
        setUsuario(dadosUsuario);
        setAnuncios(itens);
      })
      .catch(() => {
        if (!cancelado) setAusente(true);
      });

    return () => {
      cancelado = true;
    };
  }, [id]);

  if (ausente) {
    return (
      <div className={styles.ausente}>
        <p>Usuário não encontrado.</p>
        <Link href="/admin/usuarios">Voltar à listagem</Link>
      </div>
    );
  }

  if (!usuario || !anuncios) {
    return (
      <div className={styles.carregando}>
        <Esqueleto altura={60} raio={12} />
        <Esqueleto altura={110} raio={12} />
        <Esqueleto altura={110} raio={12} />
      </div>
    );
  }

  function atualizarLocal(anuncioId, mudancas) {
    setAnuncios((atual) => atual.map((item) => (item.id === anuncioId ? { ...item, ...mudancas } : item)));
  }

  const resumo = anuncios.reduce((acc, anuncio) => ({ ...acc, [anuncio.status]: (acc[anuncio.status] || 0) + 1 }), {});

  async function aplicar({ motivo }) {
    try {
      if (acao.tipo === 'remover') {
        await removerAnuncio(acao.anuncio.id, motivo);
        setAnuncios((atual) => atual.filter((item) => item.id !== acao.anuncio.id));
      } else if (acao.tipo === 'ocultar') {
        await ocultarAnuncio(acao.anuncio.id, motivo);
        atualizarLocal(acao.anuncio.id, { status: 'oculto' });
      }
      aviso.sucesso(acao.mensagem);
    } catch (erro) {
      aviso.erro(erro.message);
    }
    setAcao(null);
  }

  async function alternarDestaque(anuncio) {
    try {
      await destacarAnuncio(anuncio.id, { destacar: !anuncio.destaque });
      atualizarLocal(anuncio.id, { destaque: !anuncio.destaque });
      aviso.sucesso(anuncio.destaque ? `Destaque retirado de "${anuncio.titulo}".` : `"${anuncio.titulo}" aparece em destaque.`);
    } catch (erro) {
      aviso.erro(erro.message);
    }
  }

  async function aprovar(anuncio) {
    try {
      await aprovarAnuncio(anuncio.id);
      atualizarLocal(anuncio.id, { moderacaoStatus: 'aprovado' });
      aviso.sucesso(`"${anuncio.titulo}" foi aprovado.`);
    } catch (erro) {
      aviso.erro(erro.message);
    }
  }

  return (
    <>
      <header className={styles.topo}>
        <Link href={`/admin/usuarios/${id}`} className={styles.voltar} aria-label="Voltar à ficha">
          <Icon name="chevron-left" size={18} />
        </Link>

        <div className={styles.identidade}>
          <h1 className={styles.titulo}>Anúncios de {usuario.nome}</h1>
          <p className={styles.descricao}>
            {anuncios.length} anúncio(s)
            {Object.entries(resumo).length
              ? ' · ' + Object.entries(resumo).map(([status, total]) => `${total} ${STATUS_ANUNCIO[status].rotulo.toLowerCase()}`).join(' · ')
              : ''}
          </p>
        </div>

        <Link href={`/admin/conversas/${id}`} className={styles.atalho}>
          <Icon name="mail" size={15} />
          Ver conversas
        </Link>
      </header>

      {anuncios.length ? (
        <ul className={styles.lista}>
          {anuncios.map((anuncio) => {
            const situacao = STATUS_ANUNCIO[anuncio.status];
            const noAr = anuncio.status === 'publicado';

            return (
              <li key={anuncio.id} className={styles.cartao}>
                <div className={styles.corpo}>
                  <span className={styles.miniatura}>
                    {anuncio.capa ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={anuncio.capa} alt="" />
                    ) : (
                      <Icon name="image" size={20} />
                    )}
                  </span>

                  <div className={styles.dados}>
                    <div className={styles.linhaTitulo}>
                      <h2 className={styles.anuncioTitulo}>{anuncio.titulo}</h2>
                      <span className={styles.preco}>{formatarPreco(anuncio.preco)}</span>
                    </div>

                    <div className={styles.etiquetas}>
                      <AdminEtiqueta tom={situacao.tom} ponto>
                        {situacao.rotulo}
                      </AdminEtiqueta>

                      {anuncio.destaque ? <AdminEtiqueta tom="alerta">Em destaque</AdminEtiqueta> : null}

                      {anuncio.totalDenuncias ? (
                        <AdminEtiqueta tom="perigo">{anuncio.totalDenuncias} denúncia(s)</AdminEtiqueta>
                      ) : null}

                      {anuncio.moderacaoStatus === 'nao_revisado' ? (
                        <AdminEtiqueta tom="info">Aguarda revisão</AdminEtiqueta>
                      ) : null}
                    </div>

                    <p className={styles.numeros}>
                      <span>
                        <Icon name="eye" size={13} />
                        {anuncio.totalVisualizacoes} visualizações
                      </span>
                    </p>
                  </div>
                </div>

                <div className={styles.acoes}>
                  <Link href={`/painel/anuncios/${anuncio.id}`} className={styles.ver}>
                    <Icon name="eye" size={15} />
                    Ver anúncio
                  </Link>

                  {anuncio.moderacaoStatus === 'nao_revisado' || anuncio.moderacaoStatus === 'em_analise' ? (
                    <button type="button" className={styles.secundario} onClick={() => aprovar(anuncio)}>
                      <Icon name="check" size={15} />
                      Aprovar
                    </button>
                  ) : null}

                  {noAr ? (
                    <button
                      type="button"
                      className={styles.secundario}
                      onClick={() =>
                        setAcao({
                          id: `ocultar-${anuncio.id}`,
                          tipo: 'ocultar',
                          anuncio,
                          mensagem: `"${anuncio.titulo}" foi ocultado.`,
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
                      <Icon name="eye-off" size={15} />
                      Ocultar
                    </button>
                  ) : null}

                  <Dica texto={anuncio.destaque ? 'Tirar destaque' : 'Destacar na busca'} alinhamento="fim">
                    <button
                      type="button"
                      className={`${styles.icone} ${anuncio.destaque ? styles.iconeAtivo : ''}`}
                      onClick={() => alternarDestaque(anuncio)}
                      aria-label={anuncio.destaque ? 'Tirar destaque' : 'Destacar'}
                    >
                      <Icon name="chart" size={15} />
                    </button>
                  </Dica>

                  <Dica texto="Remover anúncio" alinhamento="fim">
                    <button
                      type="button"
                      className={`${styles.icone} ${styles.iconePerigo}`}
                      onClick={() =>
                        setAcao({
                          id: `remover-${anuncio.id}`,
                          tipo: 'remover',
                          anuncio,
                          mensagem: `"${anuncio.titulo}" foi removido.`,
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
                      aria-label="Remover anúncio"
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </Dica>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className={styles.vazio}>
          <p className={styles.vazioTitulo}>Nenhum anúncio</p>
          <p className={styles.vazioTexto}>Esta conta ainda não publicou nada, ou tudo foi removido.</p>
        </div>
      )}

      <AdminAcaoModal acao={acao} motivos={MOTIVOS} onFechar={() => setAcao(null)} onConfirmar={aplicar} />
    </>
  );
}
