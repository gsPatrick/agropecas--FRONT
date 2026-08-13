'use client';

/**
 * Administração → dados de perfil de um usuário.
 *
 * ⚠️ Reduzida em relação ao mock (`lib/exclusivas-mock.js`): a API do Admin
 * não tem endpoint de leitura nem de escrita para propriedade/maquinário
 * (produtor), atendimento/horários/entrega (loja) ou serviços/raio
 * (prestador) — esses dados moram em tabelas próprias que só o dono edita
 * (`GET/PATCH /perfil/*`, do lado do painel, não do admin). Criar essa
 * gestão pelo lado do admin é escopo de v2.0.
 *
 * O que É real hoje: o resumo do perfil (nome de exibição, documento, selo)
 * e a decisão de verificar/revogar — `admin.perfis.service`.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import PainelCartao from '@/components/PainelCartao/PainelCartao';
import AdminEtiqueta from '@/components/AdminEtiqueta/AdminEtiqueta';
import AdminAcaoModal from '@/components/AdminAcaoModal/AdminAcaoModal';
import Icon from '@/components/Icon/Icon';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import { obterUsuario, verificarPerfil, revogarVerificacaoPerfil, TIPOS_PERFIL } from '@/lib/dados/admin-usuarios';
import styles from './page.module.css';

export default function PerfilDoUsuarioPage() {
  const { id } = useParams();
  const aviso = useAviso();

  const [usuario, setUsuario] = useState(null);
  const [ausente, setAusente] = useState(false);
  const [acao, setAcao] = useState(null);

  useEffect(() => {
    let cancelado = false;

    obterUsuario(id)
      .then((dados) => {
        if (!cancelado) setUsuario(dados);
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

  if (!usuario) {
    return (
      <div className={styles.carregando}>
        <Esqueleto altura={60} raio={12} />
        <Esqueleto altura={200} raio={12} />
      </div>
    );
  }

  const perfil = usuario.perfil;

  async function aplicar({ motivo }) {
    try {
      if (acao.tipo === 'verificar') {
        await verificarPerfil(perfil.id, motivo);
        setUsuario((atual) => ({ ...atual, perfil: { ...atual.perfil, verificado: true } }));
        aviso.sucesso('Perfil verificado.');
      } else {
        await revogarVerificacaoPerfil(perfil.id, motivo);
        setUsuario((atual) => ({ ...atual, perfil: { ...atual.perfil, verificado: false } }));
        aviso.sucesso('Verificação revogada.');
      }
    } catch (erro) {
      aviso.erro(erro.message);
    }
    setAcao(null);
  }

  return (
    <>
      <header className={styles.topo}>
        <Link href={`/admin/usuarios/${id}`} className={styles.voltar} aria-label="Voltar à ficha">
          <Icon name="chevron-left" size={18} />
        </Link>

        <div className={styles.identidade}>
          <h1 className={styles.titulo}>Perfil de {usuario.nome}</h1>
          <p className={styles.descricao}>{usuario.tipo ? TIPOS_PERFIL[usuario.tipo] : 'Sem perfil cadastrado'}</p>
        </div>

        {perfil ? (
          <AdminEtiqueta tom={perfil.verificado ? 'ok' : 'neutro'} ponto>
            {perfil.verificado ? 'Verificado' : 'Sem selo'}
          </AdminEtiqueta>
        ) : null}
      </header>

      {!perfil ? (
        <PainelCartao titulo="Sem perfil" icone="user">
          <p className={styles.vazio}>Esta conta ainda não completou o cadastro de perfil (produtor, loja ou prestador).</p>
        </PainelCartao>
      ) : (
        <>
          <PainelCartao titulo="Dados do perfil" icone="user">
            <dl className={styles.dados}>
              {[
                ['Nome de exibição', perfil.nomeExibicao || '—'],
                ['UF', perfil.uf || '—'],
                ['Tipo de documento', perfil.documentoTipo || '—'],
                ['Documento', perfil.documento || '—'],
                ['Anúncios ativos', String(perfil.totalAnunciosAtivos ?? 0)],
              ].map(([rotulo, valor]) => (
                <div key={rotulo} className={styles.dado}>
                  <dt>{rotulo}</dt>
                  <dd>{valor}</dd>
                </div>
              ))}
            </dl>
          </PainelCartao>

          <p className={styles.nota}>
            <Icon name="bell" size={15} />
            Propriedade, maquinário, horários, entrega e serviços prestados só o próprio dono edita, pelo painel dele — a
            administração ainda não tem tela de escrita para esses dados.
          </p>

          <PainelCartao titulo="Verificação" icone="check">
            <div className={styles.acoes}>
              {perfil.verificado ? (
                <button
                  type="button"
                  className={styles.acao}
                  onClick={() =>
                    setAcao({
                      id: 'revogar',
                      tipo: 'revogar',
                      titulo: `Revogar verificação de ${usuario.nome}`,
                      descricao: 'O selo some do perfil imediatamente.',
                      confirmar: 'Revogar selo',
                      destrutiva: true,
                      consequencias: ['O selo deixa de aparecer nos anúncios e na busca'],
                    })
                  }
                >
                  <Icon name="close" size={16} />
                  <span>
                    <strong>Revogar verificação</strong>
                    <span>Motivo obrigatório — vira histórico de reputação</span>
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.acao}
                  onClick={() =>
                    setAcao({
                      id: 'verificar',
                      tipo: 'verificar',
                      titulo: `Verificar ${usuario.nome}`,
                      descricao: 'Concede o selo de perfil conferido.',
                      confirmar: 'Verificar perfil',
                      consequencias: ['O selo passa a aparecer ao lado do nome nos anúncios'],
                    })
                  }
                >
                  <Icon name="check" size={16} />
                  <span>
                    <strong>Verificar perfil</strong>
                    <span>Documento e dados conferidos manualmente</span>
                  </span>
                </button>
              )}
            </div>
          </PainelCartao>
        </>
      )}

      <AdminAcaoModal acao={acao} onFechar={() => setAcao(null)} onConfirmar={aplicar} />
    </>
  );
}
