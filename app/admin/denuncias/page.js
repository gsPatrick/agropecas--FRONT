'use client';

/**
 * Administração → Denúncias.
 *
 * Uma linha por denúncia, na ordem de prioridade que a própria API já
 * calcula (mais denúncias no mesmo alvo primeiro, empate pela mais antiga) —
 * ver `admin.comunidade.denuncias.service.listar`. `denunciasNoAlvo` é o
 * sinal de repetição que destaca o caso na lista.
 *
 * Resolver pede uma decisão explícita — procede ou não procede — e por baixo
 * chama `POST /admin/denuncias/:id/resolver` com `status`, `acaoTomada` e o
 * texto da decisão (`resolucao`), sempre em lote por padrão: a API resolve de
 * uma vez todas as denúncias abertas sobre o mesmo alvo.
 *
 * Lacuna conhecida: o denunciante não aparece na lista nem no detalhe padrão
 * — a API só devolve essa identidade por uma rota separada, com motivo e
 * registro de acesso (LGPD). "Ver conversas" foi trocado por um link para a
 * ficha do denunciado, que é o destino que a API realmente sustenta.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminEtiqueta from '@/components/AdminEtiqueta/AdminEtiqueta';
import AdminAcaoModal from '@/components/AdminAcaoModal/AdminAcaoModal';
import PainelSegmentos from '@/components/PainelSegmentos/PainelSegmentos';
import Icon from '@/components/Icon/Icon';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import {
  listarDenuncias,
  resolverDenuncia,
  MOTIVOS_DENUNCIA,
} from '@/lib/dados/admin-denuncias';
import styles from './page.module.css';

const ABAS = [
  { id: 'abertas', rotulo: 'Abertas' },
  { id: 'resolvidas', rotulo: 'Resolvidas' },
  { id: 'todas', rotulo: 'Todas' },
];

const MOTIVOS_DECISAO = [
  'Confirmado após conferir o anúncio e as conversas',
  'Denúncia sem elemento que sustente a acusação',
  'Anunciante corrigiu o problema após contato',
  'Reincidência — já houve advertência anterior',
];

const ABERTOS = new Set(['aberta', 'em_analise']);

function quando(dataIso) {
  if (!dataIso) return '';
  const diffMs = Date.now() - new Date(dataIso).getTime();
  const dias = Math.floor(diffMs / 86400000);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
}

export default function AdminDenunciasPage() {
  const aviso = useAviso();

  const [aba, setAba] = useState('abertas');
  const [denuncias, setDenuncias] = useState(null);
  const [acao, setAcao] = useState(null);

  useEffect(() => {
    let cancelado = false;
    setDenuncias(null);

    listarDenuncias({
      status: aba === 'abertas' ? 'aberta' : aba === 'resolvidas' ? undefined : undefined,
    })
      .then(({ itens }) => {
        if (!cancelado) setDenuncias(itens);
      })
      .catch((erro) => {
        if (!cancelado) {
          setDenuncias([]);
          aviso.erro(erro.message);
        }
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const todas = denuncias || [];

  const lista = todas.filter((denuncia) => {
    if (aba === 'abertas') return ABERTOS.has(denuncia.status);
    if (aba === 'resolvidas') return !ABERTOS.has(denuncia.status);
    return true;
  });

  const contagens = {
    abertas: todas.filter((denuncia) => ABERTOS.has(denuncia.status)).length,
    resolvidas: todas.filter((denuncia) => !ABERTOS.has(denuncia.status)).length,
    todas: todas.length,
  };

  function atualizarLocal(id, mudancas) {
    setDenuncias((atual) => atual.map((item) => (item.id === id ? { ...item, ...mudancas } : item)));
  }

  async function resolver({ motivo }) {
    const { denuncia, decisao, rotulo } = acao;

    try {
      await resolverDenuncia(denuncia.id, {
        status: decisao === 'procede' ? 'procedente' : 'improcedente',
        acaoTomada: decisao === 'procede' ? 'anuncio_ocultado' : 'nenhuma',
        resolucao: motivo,
      });

      atualizarLocal(denuncia.id, {
        status: decisao === 'procede' ? 'procedente' : 'improcedente',
        resolucao: motivo,
      });
      aviso.sucesso(`Denúncia resolvida: ${rotulo.toLowerCase()}.`);
    } catch (erro) {
      aviso.erro(erro.message);
    }

    setAcao(null);
  }

  function pedirDecisao(denuncia, decisao) {
    const receitas = {
      procede: {
        rotulo: 'Procede',
        titulo: 'Denúncia procede',
        descricao: 'O conteúdo sai do ar e o caso fica no histórico da conta.',
        confirmar: 'Confirmar e remover',
        destrutiva: true,
        consequencias: [
          'O anúncio é ocultado imediatamente',
          'O caso entra no histórico da conta denunciada',
          'Outras denúncias abertas sobre o mesmo alvo são resolvidas junto',
        ],
      },
      improcede: {
        rotulo: 'Não procede',
        titulo: 'Denúncia não procede',
        descricao: 'Nada muda para o anunciante; o caso é arquivado com o motivo.',
        confirmar: 'Arquivar denúncia',
        consequencias: [
          'O anúncio continua no ar',
          'O motivo fica registrado para o caso de nova denúncia',
        ],
      },
    };

    setAcao({ id: `${decisao}-${denuncia.id}`, denuncia, decisao, ...receitas[decisao] });
  }

  if (!denuncias) {
    return (
      <>
        <header className={styles.topo}>
          <div>
            <h1 className={styles.titulo}>Denúncias</h1>
          </div>
        </header>
        <div className={styles.carregando}>
          <Esqueleto altura={140} raio={10} repetir={3} />
        </div>
      </>
    );
  }

  return (
    <>
      <header className={styles.topo}>
        <div>
          <h1 className={styles.titulo}>Denúncias</h1>
          <p className={styles.descricao}>
            {contagens.abertas
              ? `${contagens.abertas} aberta(s) esperando decisão`
              : 'Nenhuma denúncia aberta.'}
          </p>
        </div>
      </header>

      <PainelSegmentos
        opcoes={ABAS}
        valor={aba}
        onMudar={setAba}
        contagens={contagens}
        rotulo="Situação das denúncias"
      />

      {lista.length ? (
        <ul className={styles.lista}>
          {lista.map((denuncia) => {
            const aberta = ABERTOS.has(denuncia.status);
            const repetida = denuncia.denunciasNoAlvo > 1;

            return (
              <li
                key={denuncia.id}
                className={`${styles.caso} ${repetida ? styles.casoRepetido : ''}`}
              >
                <div className={styles.cabecalho}>
                  <AdminEtiqueta tom={aberta ? 'alerta' : 'neutro'} ponto>
                    {aberta ? 'Aberta' : 'Resolvida'}
                  </AdminEtiqueta>

                  <span className={styles.motivo}>{MOTIVOS_DENUNCIA[denuncia.motivo] || denuncia.motivo}</span>

                  {repetida ? (
                    <span className={styles.repetidas}>
                      <Icon name="bell" size={12} />
                      {denuncia.denunciasNoAlvo} denúncias sobre o mesmo alvo
                    </span>
                  ) : null}

                  <span className={styles.quando}>{quando(denuncia.criadoEm)}</span>
                </div>

                <div className={styles.corpo}>
                  <div className={styles.alvo}>
                    <span className={styles.alvoRotulo}>
                      {denuncia.alvoTipo === 'anuncio' ? 'Anúncio denunciado' : 'Alvo denunciado'}
                    </span>

                    {denuncia.alvoTipo === 'anuncio' && denuncia.alvo ? (
                      <>
                        <Link href={`/admin/anuncios/${denuncia.alvoId}`} className={styles.alvoLink}>
                          <Icon name="image" size={14} />
                          {denuncia.alvo.titulo}
                        </Link>

                        {denuncia.denunciado ? (
                          <Link
                            href={`/admin/usuarios/${denuncia.denunciado.id}`}
                            className={styles.alvoDono}
                          >
                            de {denuncia.denunciado.nome}
                          </Link>
                        ) : null}
                      </>
                    ) : denuncia.denunciado ? (
                      <Link href={`/admin/usuarios/${denuncia.denunciado.id}`} className={styles.alvoLink}>
                        <span className={styles.avatar}>
                          {(denuncia.denunciado.nome || '?').slice(0, 1).toUpperCase()}
                        </span>
                        {denuncia.denunciado.nome}
                      </Link>
                    ) : (
                      <span className={styles.alvoLink}>{denuncia.alvoTipo}</span>
                    )}
                  </div>

                  <blockquote className={styles.relato}>
                    <span className={styles.autor}>Denúncia:</span>
                    “{denuncia.descricao || 'Sem descrição adicional.'}”
                  </blockquote>
                </div>

                <div className={styles.acoes}>
                  {aberta ? (
                    <>
                      <button
                        type="button"
                        className={styles.procede}
                        onClick={() => pedirDecisao(denuncia, 'procede')}
                      >
                        <Icon name="check" size={15} />
                        Procede — remover conteúdo
                      </button>

                      <button
                        type="button"
                        className={styles.improcede}
                        onClick={() => pedirDecisao(denuncia, 'improcede')}
                      >
                        <Icon name="close" size={15} />
                        Não procede
                      </button>

                      {denuncia.denunciado ? (
                        <Link
                          href={`/admin/usuarios/${denuncia.denunciado.id}`}
                          className={styles.investigar}
                        >
                          Ver ficha do denunciado
                          <Icon name="chevron-right" size={13} />
                        </Link>
                      ) : null}
                    </>
                  ) : (
                    <span className={styles.decidida}>
                      <Icon name="check" size={14} />
                      {denuncia.status === 'improcedente'
                        ? 'Arquivada — não procede'
                        : denuncia.status === 'procedente'
                          ? 'Conteúdo removido'
                          : 'Arquivada'}
                    </span>
                  )}
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
          <p className={styles.vazioTitulo}>Nada por aqui</p>
          <p className={styles.vazioTexto}>
            Nenhuma denúncia nesta aba. As novas aparecem em “Abertas”.
          </p>
        </div>
      )}

      <AdminAcaoModal
        acao={acao}
        motivos={MOTIVOS_DECISAO}
        onFechar={() => setAcao(null)}
        onConfirmar={resolver}
      />
    </>
  );
}
