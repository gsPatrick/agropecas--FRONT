'use client';

/**
 * Administração → LGPD.
 *
 * Duas responsabilidades legais, numa tela: os **pedidos** de quem exerce
 * direito sobre os próprios dados, e os **documentos** que a plataforma
 * mantém em vigor.
 *
 * A fila é ordenada pelo prazo, não pela data do pedido. A lei dá 15 dias
 * corridos; o que está a três dias do fim vem antes do que chegou hoje, mesmo
 * que o de hoje pareça mais urgente na leitura. Deixar vencer é infração, e
 * infração se evita olhando o relógio certo.
 *
 * ⚠️ Ver JSDoc de `lib/dados/admin-lgpd.js` para o que muda em relação ao
 * mock: o desfecho é uma decisão (concluir ou recusar, não "responder"
 * genérico), e não existe exportação de arquivo nem publicação de nova
 * versão de documento nesta tela — a API real não tem os dois endpoints.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PainelCartao from '@/components/PainelCartao/PainelCartao';
import AdminEtiqueta from '@/components/AdminEtiqueta/AdminEtiqueta';
import AdminAcaoModal from '@/components/AdminAcaoModal/AdminAcaoModal';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import Icon from '@/components/Icon/Icon';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import {
  listarSolicitacoesLgpd,
  responderSolicitacaoLgpd,
  listarDocumentosLgpd,
  STATUS_FINAIS,
  TIPOS_SOLICITACAO,
  TIPOS_DOCUMENTO,
} from '@/lib/dados/admin-lgpd';
import styles from './page.module.css';

const MOTIVOS = [
  'Dados exportados e enviados por e-mail ao titular',
  'Conta anonimizada conforme o pedido',
  'Correção aplicada após conferência do documento',
  'Pedido fora do escopo — explicado ao titular',
];

export default function AdminLgpdPage() {
  const aviso = useAviso();

  /* `null` = carregando */
  const [pedidos, setPedidos] = useState(null);
  const [documentos, setDocumentos] = useState(null);
  const [acao, setAcao] = useState(null);

  useEffect(() => {
    const controlador = new AbortController();

    listarSolicitacoesLgpd({ sinal: controlador.signal })
      .then(({ itens }) => setPedidos(itens))
      .catch((erro) => {
        if (erro.name !== 'AbortError') {
          setPedidos([]);
          aviso.erro('Não foi possível carregar os pedidos de LGPD.');
        }
      });

    listarDocumentosLgpd({ sinal: controlador.signal })
      .then((resultado) => setDocumentos(resultado))
      .catch((erro) => {
        if (erro.name !== 'AbortError') {
          setDocumentos({ vigentes: [], versoes: [], reaceitePendente: {}, totalReaceitePendente: 0 });
        }
      });

    return () => controlador.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emAberto = (pedidos || [])
    .filter((pedido) => !STATUS_FINAIS.includes(pedido.status))
    /* pelo prazo, não pela chegada: o que vence antes vem antes */
    .sort((a, b) => (a.diasRestantes ?? 0) - (b.diasRestantes ?? 0));

  const respondidos = (pedidos || []).filter((pedido) => STATUS_FINAIS.includes(pedido.status));
  const apertados = emAberto.filter((pedido) => pedido.vencendo || pedido.atrasada);

  async function responder({ motivo }) {
    const status = acao.status;
    const pedido = acao.pedido;

    try {
      const atualizado = await responderSolicitacaoLgpd(pedido.id, { status, resposta: motivo });

      setPedidos((atual) =>
        atual.map((item) => (item.id === pedido.id ? { ...item, ...atualizado } : item))
      );

      aviso.sucesso(
        status === 'concluida'
          ? 'Pedido concluído. O titular recebe a confirmação por e-mail.'
          : 'Pedido recusado. O titular recebe a explicação por e-mail.'
      );
      setAcao(null);
    } catch (erro) {
      aviso.erro(erro.message || 'Não foi possível registrar a resposta.');
    }
  }

  function abrirDecisao(pedido, status) {
    const tipo = TIPOS_SOLICITACAO[pedido.tipo] || pedido.tipo;

    setAcao({
      id: `${status}-${pedido.id}`,
      pedido,
      status,
      titulo:
        status === 'concluida'
          ? `Concluir: ${tipo.toLowerCase()}`
          : `Recusar: ${tipo.toLowerCase()}`,
      descricao: `Titular: ${pedido.titular?.nome || 'sem nome'}. Prazo restante: ${
        pedido.diasRestantes ?? '—'
      } dias.`,
      confirmar: status === 'concluida' ? 'Registrar conclusão' : 'Registrar recusa',
      consequencias: [
        'A resposta é enviada ao titular por e-mail',
        'O pedido sai da fila e fica no histórico',
        'O texto vale como prova de atendimento no prazo',
      ],
    });
  }

  const carregandoPedidos = pedidos === null;
  const carregandoDocumentos = documentos === null;

  return (
    <>
      <header className={styles.topo}>
        <div>
          <h1 className={styles.titulo}>LGPD</h1>
          <p className={styles.descricao}>
            {carregandoPedidos ? 'Carregando…' : `${emAberto.length} pedido(s) em aberto`}
            {!carregandoPedidos && apertados.length ? ` · ${apertados.length} com prazo apertado` : ''}
          </p>
        </div>
      </header>

      {!carregandoPedidos && apertados.length ? (
        <div className={styles.alerta}>
          <Icon name="clock" size={17} />
          <span>
            {apertados.length} pedido(s) vencem em breve ou já venceram. Passar de 15 dias
            corridos é infração à lei, não atraso de atendimento.
          </span>
        </div>
      ) : null}

      <PainelCartao
        titulo={`Pedidos em aberto${carregandoPedidos ? '' : ` (${emAberto.length})`}`}
        descricao="Ordenados pelo prazo legal, não pela data do pedido."
        icone="eye-off"
        semPadding
      >
        {carregandoPedidos ? (
          <div className={styles.carregando}>
            <Esqueleto altura={80} raio={10} repetir={3} />
          </div>
        ) : emAberto.length ? (
          <ul className={styles.pedidos}>
            {emAberto.map((pedido) => {
              const tipo = TIPOS_SOLICITACAO[pedido.tipo] || pedido.tipo;
              const apertado = pedido.vencendo || pedido.atrasada;

              return (
                <li key={pedido.id} className={`${styles.pedido} ${apertado ? styles.pedidoApertado : ''}`}>
                  <span className={`${styles.prazo} ${apertado ? styles.prazoApertado : ''}`}>
                    <strong>{pedido.diasRestantes ?? '—'}</strong>
                    <span>dias</span>
                  </span>

                  <div className={styles.pedidoTexto}>
                    <div className={styles.pedidoTopo}>
                      <strong>{tipo}</strong>

                      {pedido.titular?.id ? (
                        <Link href={`/admin/usuarios/${pedido.titular.id}`} className={styles.titular}>
                          <span className={styles.avatar}>
                            {(pedido.titular.nome || '?').slice(0, 2).toUpperCase()}
                          </span>
                          {pedido.titular.nome}
                        </Link>
                      ) : null}

                      <AdminEtiqueta tom={pedido.status === 'em_atendimento' ? 'info' : 'alerta'}>
                        {pedido.status === 'em_atendimento' ? 'Em atendimento' : 'Aberta'}
                      </AdminEtiqueta>
                    </div>

                    {pedido.descricao ? <p className={styles.relato}>"{pedido.descricao}"</p> : null}
                  </div>

                  <div className={styles.acoes}>
                    <button
                      type="button"
                      className={styles.exportar}
                      onClick={() => abrirDecisao(pedido, 'recusada')}
                    >
                      <Icon name="close" size={14} />
                      Recusar
                    </button>

                    <button
                      type="button"
                      className={styles.responder}
                      onClick={() => abrirDecisao(pedido, 'concluida')}
                    >
                      <Icon name="check" size={14} />
                      Concluir
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.vazio}>Nenhum pedido em aberto.</p>
        )}
      </PainelCartao>

      {!carregandoPedidos && respondidos.length ? (
        <PainelCartao
          titulo="Respondidos"
          descricao="Guardados como prova de atendimento no prazo."
          icone="check"
          semPadding
        >
          <ul className={styles.pedidos}>
            {respondidos.map((pedido) => (
              <li key={pedido.id} className={styles.pedido}>
                <span className={styles.feito}>
                  <Icon name={pedido.status === 'recusada' ? 'close' : 'check'} size={16} />
                </span>

                <div className={styles.pedidoTexto}>
                  <div className={styles.pedidoTopo}>
                    <strong>{TIPOS_SOLICITACAO[pedido.tipo] || pedido.tipo}</strong>
                    <span className={styles.quando}>{pedido.titular?.nome || 'sem nome'}</span>
                  </div>

                  <p className={styles.relato}>{pedido.resposta}</p>
                </div>
              </li>
            ))}
          </ul>
        </PainelCartao>
      ) : null}

      <PainelCartao
        titulo="Documentos em vigor"
        descricao="Cada nova versão exige aceite de quem já usa a plataforma."
        icone="grid"
        semPadding
      >
        {carregandoDocumentos ? (
          <div className={styles.carregando}>
            <Esqueleto altura={64} raio={10} repetir={3} />
          </div>
        ) : (
          <ul className={styles.documentos}>
            {documentos.vigentes.map((documento) => {
              const pendencia = documentos.reaceitePendente[documento.tipo];

              return (
                <li key={documento.id} className={styles.documento}>
                  <div className={styles.pedidoTexto}>
                    <strong>
                      {TIPOS_DOCUMENTO[documento.tipo] || documento.tipo}{' '}
                      <span className={styles.versao}>versão {documento.versao}</span>
                    </strong>
                    <span className={styles.quando}>
                      Em vigor desde {new Date(documento.vigenteDe).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  {pendencia?.aceiteRastreado ? (
                    <span className={styles.aceites}>
                      <strong>{pendencia.aceitaramVersaoVigente}</strong> aceites
                    </span>
                  ) : null}

                  {pendencia?.aceiteRastreado ? (
                    pendencia.desatualizados ? (
                      <AdminEtiqueta tom="alerta">{pendencia.desatualizados} sem aceitar</AdminEtiqueta>
                    ) : (
                      <AdminEtiqueta tom="ok" ponto>
                        Todos aceitaram
                      </AdminEtiqueta>
                    )
                  ) : (
                    <AdminEtiqueta tom="neutro">Aceite não rastreado</AdminEtiqueta>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </PainelCartao>

      <AdminAcaoModal
        acao={acao}
        motivos={MOTIVOS}
        onFechar={() => setAcao(null)}
        onConfirmar={responder}
      />
    </>
  );
}
