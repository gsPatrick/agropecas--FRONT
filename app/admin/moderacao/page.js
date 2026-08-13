'use client';

/**
 * Administração → Moderação.
 *
 * Fila de anúncios esperando decisão, uma de cada vez. Não é uma tabela: é uma
 * fila de trabalho. Moderar em tabela obriga a abrir e fechar cada item, e o
 * que se ganha em visão geral se perde em ritmo — a fila só anda quando cada
 * decisão custa um clique.
 *
 * O **motivo de o anúncio estar aqui** aparece antes do anúncio, quando a API
 * já registrou um (moderacaoMotivo, de uma rodada anterior). Sem isso, moderar
 * é ler tudo procurando o problema que outra pessoa já tinha achado.
 *
 * Aprovar não pede confirmação; reprovar e ocultar pedem, com motivo — porque
 * o primeiro é o caminho esperado e os outros interrompem o trabalho de alguém.
 *
 * Fonte real: `GET /admin/moderacao/fila` (`listarFilaModeracao`, em
 * `lib/dados/admin-anuncios.js`), que já traz o dono e a capa numa consulta
 * batelada — ver `moderacao.fila.service.js` na API.
 *
 * Lacunas em relação ao mock original, e como foram tratadas aqui:
 *   · não existe contagem de fotos do anúncio — a API devolve só a capa
 *     (`item.capa`), então a caixa mostra a imagem em vez de "N foto(s)";
 *   · o dono da fila não traz tipo de perfil nem iniciais prontas — as
 *     iniciais são calculadas aqui a partir do nome, e o tipo de perfil não é
 *     exibido;
 *   · não existe "cidade" na linha da fila, só `uf` — trocado um pelo outro;
 *   · o "alerta" do topo do cartão agora é `moderacaoMotivo`, quando a API o
 *     preencheu numa rodada anterior — não é mais um texto qualquer.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminEtiqueta from '@/components/AdminEtiqueta/AdminEtiqueta';
import AdminAcaoModal from '@/components/AdminAcaoModal/AdminAcaoModal';
import Icon from '@/components/Icon/Icon';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import {
  listarFilaModeracao,
  aprovarAnuncio,
  reprovarAnuncio,
  ocultarAnuncio,
  moderarEmLote,
} from '@/lib/dados/admin-anuncios';
import styles from './page.module.css';

const MOTIVOS_REPROVA = [
  'Preço incompatível com o item anunciado',
  'Fotos não correspondem ao produto',
  'Dados de contato dentro da imagem',
  'Categoria errada para o item',
  'Descrição insuficiente para identificar a peça',
];

/** "há 2 horas" em vez de data ISO — mesma régua usada na vitrine pública */
function quando(iso) {
  if (!iso) return '';
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (Number.isNaN(minutos)) return '';
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  const dias = Math.floor(horas / 24);
  if (dias < 30) return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  const meses = Math.floor(dias / 30);
  return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
}

function formatarPreco(preco) {
  if (preco == null) return null;
  if (preco === 'A combinar') return 'A combinar';
  return preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function iniciaisDe(nome) {
  if (!nome) return '?';
  const partes = nome.trim().split(/\s+/);
  const primeiras = partes.length > 1 ? [partes[0], partes[partes.length - 1]] : [partes[0]];
  return primeiras.map((parte) => parte[0]).join('').toUpperCase();
}

export default function AdminModeracaoPage() {
  const aviso = useAviso();

  const [itens, setItens] = useState(null);
  const [somenteDenunciados, setSomenteDenunciados] = useState(false);
  const [acao, setAcao] = useState(null);
  const [marcados, setMarcados] = useState([]);

  useEffect(() => {
    let cancelado = false;
    setItens(null);
    setMarcados([]);

    listarFilaModeracao({ comDenuncias: somenteDenunciados || undefined })
      .then(({ itens: lista }) => {
        if (!cancelado) setItens(lista);
      })
      .catch((erro) => {
        if (!cancelado) {
          setItens([]);
          aviso.erro(erro.message);
        }
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [somenteDenunciados]);

  const fila = itens || [];

  function removerDaFila(id) {
    setItens((atual) => (atual || []).filter((item) => item.id !== id));
    setMarcados((atual) => atual.filter((item) => item !== id));
  }

  function alternarMarca(id) {
    setMarcados((atual) => (atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]));
  }

  async function aprovar(anuncio) {
    try {
      await aprovarAnuncio(anuncio.id);
      removerDaFila(anuncio.id);
      aviso.sucesso(`"${anuncio.titulo}" está no ar.`);
    } catch (erro) {
      aviso.erro(erro.message);
    }
  }

  async function decidir({ motivo }) {
    const { anuncio, verbo, tipo, alvos } = acao;

    try {
      if (alvos && alvos.length > 1) {
        const { falhas } = await moderarEmLote({ ids: alvos, acao: tipo, motivo });
        alvos.forEach((id) => {
          if (!falhas.some((falha) => String(falha.id) === String(id))) removerDaFila(id);
        });
        aviso.sucesso(
          falhas.length
            ? `${alvos.length - falhas.length} de ${alvos.length} anúncio(s) ${verbo}. ${falhas.length} não foram aplicados.`
            : `${alvos.length} anúncio(s) ${verbo}.`
        );
      } else if (tipo === 'reprovar') {
        await reprovarAnuncio(anuncio.id, motivo);
        removerDaFila(anuncio.id);
        aviso.sucesso(`"${anuncio.titulo}" ${verbo}. O anunciante foi avisado.`);
      } else {
        await ocultarAnuncio(anuncio.id, motivo);
        removerDaFila(anuncio.id);
        aviso.sucesso(`"${anuncio.titulo}" ${verbo}. O anunciante foi avisado.`);
      }
    } catch (erro) {
      aviso.erro(erro.message);
    } finally {
      setAcao(null);
    }
  }

  const selecionados = fila.filter((item) => marcados.includes(item.id));

  if (!itens) {
    return (
      <>
        <header className={styles.topo}>
          <div>
            <h1 className={styles.titulo}>Moderação</h1>
          </div>
        </header>
        <div className={styles.carregando}>
          <Esqueleto altura={150} raio={12} />
          <Esqueleto altura={150} raio={12} />
          <Esqueleto altura={150} raio={12} />
        </div>
      </>
    );
  }

  return (
    <>
      <header className={styles.topo}>
        <div>
          <h1 className={styles.titulo}>Moderação</h1>
          <p className={styles.descricao}>
            {fila.length ? `${fila.length} anúncio(s) esperando decisão` : 'Fila vazia. Nada esperando decisão.'}
          </p>
        </div>

        <button
          type="button"
          className={styles.filtroDenuncia}
          data-ativo={somenteDenunciados || undefined}
          onClick={() => setSomenteDenunciados((atual) => !atual)}
        >
          <Icon name="bell" size={15} />
          Só com denúncia
        </button>

        <Link href="/admin/anuncios" className={styles.verTodos}>
          <Icon name="grid" size={15} />
          Ver todos os anúncios
        </Link>
      </header>

      {marcados.length ? (
        <div className={styles.lote}>
          <span className={styles.loteTexto}>
            <strong>{marcados.length}</strong> selecionado(s)
          </span>

          <div className={styles.loteAcoes}>
            <button
              type="button"
              className={styles.loteBotao}
              onClick={() =>
                setAcao({
                  id: 'lote-reprovar',
                  tipo: 'reprovar',
                  alvos: marcados,
                  verbo: 'foram reprovados',
                  titulo: `Reprovar ${marcados.length} anúncio(s)`,
                  descricao: 'Nenhum vai ao ar e todo mundo recebe o motivo.',
                  confirmar: 'Reprovar todos',
                  destrutiva: true,
                })
              }
            >
              <Icon name="close" size={14} />
              Reprovar selecionados
            </button>

            <button
              type="button"
              className={styles.loteBotao}
              onClick={() =>
                setAcao({
                  id: 'lote-ocultar',
                  tipo: 'ocultar',
                  alvos: marcados,
                  verbo: 'foram ocultados',
                  titulo: `Ocultar ${marcados.length} anúncio(s)`,
                  descricao: 'Saem das buscas; os anunciantes podem corrigir e reenviar.',
                  confirmar: 'Ocultar todos',
                })
              }
            >
              <Icon name="eye-off" size={14} />
              Ocultar selecionados
            </button>

            <button type="button" className={styles.loteLimpar} onClick={() => setMarcados([])}>
              Limpar seleção
            </button>
          </div>
        </div>
      ) : null}

      {fila.length ? (
        <ul className={styles.fila}>
          {fila.map((anuncio) => {
            const preco = formatarPreco(anuncio.preco);

            return (
              <li key={anuncio.id} className={styles.cartao}>
                {anuncio.moderacaoMotivo ? (
                  <div className={styles.alerta}>
                    <Icon name="bell" size={15} />
                    {anuncio.moderacaoMotivo}
                  </div>
                ) : null}

                <div className={styles.corpo}>
                  <label className={styles.marca}>
                    <input
                      type="checkbox"
                      checked={marcados.includes(anuncio.id)}
                      onChange={() => alternarMarca(anuncio.id)}
                      aria-label={`Selecionar ${anuncio.titulo}`}
                    />
                  </label>

                  <div className={styles.fotos}>
                    {anuncio.capa ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={anuncio.capa} alt="" className={styles.capaImagem} />
                    ) : (
                      <>
                        <Icon name="image" size={22} />
                        <span>sem foto</span>
                      </>
                    )}
                  </div>

                  <div className={styles.dados}>
                    <div className={styles.linhaTitulo}>
                      <h2 className={styles.anuncioTitulo}>{anuncio.titulo}</h2>
                      {preco ? <span className={styles.preco}>{preco}</span> : null}
                    </div>

                    <p className={styles.meta}>
                      {anuncio.dono ? (
                        <Link href={`/admin/usuarios/${anuncio.dono.id}`} className={styles.dono}>
                          <span className={styles.avatar}>{iniciaisDe(anuncio.dono.nome)}</span>
                          {anuncio.dono.nome}
                        </Link>
                      ) : (
                        <span>Dono não identificado</span>
                      )}

                      {anuncio.uf ? (
                        <>
                          <span className={styles.separador}>·</span>
                          {anuncio.uf}
                        </>
                      ) : null}

                      {anuncio.criadoEm ? (
                        <>
                          <span className={styles.separador}>·</span>
                          enviado {quando(anuncio.criadoEm)}
                        </>
                      ) : null}
                    </p>

                    <div className={styles.etiquetas}>
                      <AdminEtiqueta tom="alerta" ponto>
                        Em análise
                      </AdminEtiqueta>

                      {anuncio.totalDenuncias ? (
                        <AdminEtiqueta tom="perigo">{anuncio.totalDenuncias} denúncia(s)</AdminEtiqueta>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className={styles.acoes}>
                  <button type="button" className={styles.aprovar} onClick={() => aprovar(anuncio)}>
                    <Icon name="check" size={16} />
                    Aprovar e publicar
                  </button>

                  <button
                    type="button"
                    className={styles.secundario}
                    onClick={() =>
                      setAcao({
                        id: `ocultar-${anuncio.id}`,
                        anuncio,
                        tipo: 'ocultar',
                        verbo: 'foi ocultado',
                        titulo: 'Ocultar anúncio',
                        descricao: 'Sai das buscas, mas o anunciante pode corrigir e reenviar.',
                        confirmar: 'Ocultar',
                        consequencias: [
                          'O anúncio não aparece para ninguém',
                          'O anunciante consegue editar e enviar de novo',
                        ],
                      })
                    }
                  >
                    <Icon name="eye-off" size={15} />
                    Ocultar
                  </button>

                  <button
                    type="button"
                    className={styles.reprovar}
                    onClick={() =>
                      setAcao({
                        id: `reprovar-${anuncio.id}`,
                        anuncio,
                        tipo: 'reprovar',
                        verbo: 'foi reprovado',
                        titulo: 'Reprovar anúncio',
                        descricao: 'O anúncio não vai ao ar e o anunciante recebe o motivo.',
                        confirmar: 'Reprovar',
                        destrutiva: true,
                        consequencias: [
                          'O anúncio não é publicado',
                          'O motivo vai por e-mail para quem anunciou',
                          'Reprovações repetidas contam para sanção da conta',
                        ],
                      })
                    }
                  >
                    <Icon name="close" size={15} />
                    Reprovar
                  </button>

                  <Link href={`/admin/anuncios/${anuncio.id}`} className={styles.detalhe}>
                    Ver detalhes
                    <Icon name="chevron-right" size={14} />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className={styles.vazio}>
          <span className={styles.vazioIcone}>
            <Icon name="check" size={24} />
          </span>

          <p className={styles.vazioTitulo}>Fila vazia</p>
          <p className={styles.vazioTexto}>Nenhum anúncio esperando decisão no momento.</p>
        </div>
      )}

      <AdminAcaoModal
        acao={acao}
        motivos={MOTIVOS_REPROVA}
        onFechar={() => setAcao(null)}
        onConfirmar={decidir}
      />
    </>
  );
}
