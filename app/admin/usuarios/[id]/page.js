'use client';

/**
 * Administração → ficha do usuário.
 *
 * Tudo que a plataforma sabe sobre a pessoa e tudo que dá para fazer com a
 * conta, numa tela só. **Dados** à esquerda, **poderes** à direita.
 *
 * ⚠️ Sem aprovar/recusar/desativar/ativar/excluir: só existem `suspender`,
 * `banir` e `restaurar` de verdade — ver `lib/dados/admin-usuarios.js`.
 * Também sem "verificar perfil" daqui: a verificação de loja/prestador tem
 * fila própria (`admin.perfis.service`), fora do escopo desta ficha.
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
  obterUsuario,
  suspenderUsuario,
  banirUsuario,
  restaurarUsuario,
  encerrarSessoesUsuario,
  atribuirPapel,
  removerPapel,
  STATUS_USUARIO,
  TIPOS_PERFIL,
} from '@/lib/dados/admin-usuarios';
import styles from './page.module.css';

const SECAO_DO_PERFIL = {
  produtor: { rotulo: 'Propriedade e maquinário', icone: 'leaf', dica: 'É o que liga a conta às peças compatíveis' },
  loja: { rotulo: 'Atendimento da loja', icone: 'store', dica: 'Horários, entrega e canais de contato' },
  prestador: { rotulo: 'Serviços prestados', icone: 'wrench', dica: 'O que faz e até onde vai — define em que buscas aparece' },
};

const PAPEIS = [
  { id: 'usuario', rotulo: 'Usuário', descricao: 'Anunciar, conversar, favoritar' },
  { id: 'moderador', rotulo: 'Moderador', descricao: 'Aprovar anúncios e resolver denúncias' },
  { id: 'admin', rotulo: 'Administrador', descricao: 'Poder total, inclusive sobre outros administradores' },
];

function formatarData(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminUsuarioPage() {
  const { id } = useParams();
  const router = useRouter();
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
        <p className={styles.ausenteTitulo}>Usuário não encontrado</p>
        <Link href="/admin/usuarios" className={styles.ausenteAcao}>
          <Icon name="chevron-left" size={15} />
          Voltar à listagem
        </Link>
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className={styles.carregando}>
        <Esqueleto altura={70} raio={12} />
        <Esqueleto altura={220} raio={12} />
      </div>
    );
  }

  const situacao = STATUS_USUARIO[usuario.situacao] || STATUS_USUARIO.ativo;
  const secaoPerfil = usuario.tipo ? SECAO_DO_PERFIL[usuario.tipo] : null;

  async function aplicar({ motivo, prazo, avisar }) {
    const dias = prazo && prazo !== 'indeterminado' ? Number(prazo) : undefined;

    try {
      if (acao.id === 'sessoes') {
        await encerrarSessoesUsuario(usuario.id);
        aviso.sucesso('Sessões encerradas em todos os aparelhos.');
        setAcao(null);
        return;
      }

      if (acao.acaoApi === 'suspender') await suspenderUsuario(usuario.id, { motivo, dias, notificar: avisar });
      else if (acao.acaoApi === 'banir') await banirUsuario(usuario.id, { motivo, notificar: avisar });
      else if (acao.acaoApi === 'restaurar') await restaurarUsuario(usuario.id, motivo);

      setUsuario((atual) => ({ ...atual, situacao: acao.situacao, motivoStatus: motivo }));
      aviso.sucesso(`${usuario.nome}: ${STATUS_USUARIO[acao.situacao].rotulo.toLowerCase()}.`);
    } catch (erro) {
      aviso.erro(erro.message);
    }

    setAcao(null);
  }

  async function alternarPapel(papel) {
    const tem = usuario.papeis.some((item) => item.papel === papel.id || item === papel.id);

    try {
      if (tem) {
        await removerPapel(usuario.id, papel.id);
        setUsuario((atual) => ({ ...atual, papeis: atual.papeis.filter((item) => (item.papel || item) !== papel.id) }));
        aviso.sucesso(`Papel "${papel.rotulo}" removido.`);
      } else {
        const papeis = await atribuirPapel(usuario.id, papel.id);
        setUsuario((atual) => ({ ...atual, papeis }));
        aviso.sucesso(`Papel "${papel.rotulo}" concedido.`);
      }
    } catch (erro) {
      aviso.erro(erro.message);
    }
  }

  function pedirSancao(tipoAcao) {
    const receitas = {
      suspender: {
        id: 'suspender',
        titulo: `Suspender ${usuario.nome}`,
        descricao: 'A conta fica bloqueada pelo prazo escolhido.',
        confirmar: 'Suspender',
        situacao: 'suspenso',
        acaoApi: 'suspender',
        comPrazo: true,
        prazoTitulo: 'Ficar suspenso por quanto tempo',
        consequencias: [
          'Os anúncios saem do ar enquanto durar a suspensão',
          'As conversas ficam guardadas, sem poder responder',
          'A pessoa pode voltar quando o prazo terminar',
        ],
      },
      banir: {
        id: 'banir',
        titulo: `Banir ${usuario.nome}`,
        descricao: 'Bloqueio permanente. Use com fraude comprovada.',
        confirmar: 'Banir definitivamente',
        situacao: 'banido',
        acaoApi: 'banir',
        destrutiva: true,
        palavra: 'BANIR',
        consequencias: [
          'Todos os anúncios saem do ar imediatamente',
          'O acesso é encerrado em todos os aparelhos',
          'Só outro administrador consegue reverter',
        ],
      },
      restaurar: {
        id: 'restaurar',
        titulo: `Restaurar ${usuario.nome}`,
        descricao: 'Devolve o acesso e reativa o cadastro.',
        confirmar: 'Restaurar acesso',
        situacao: 'ativo',
        acaoApi: 'restaurar',
        consequencias: [
          'A pessoa volta a acessar e a anunciar',
          'Os anúncios seguem fora do ar até ela republicar',
        ],
      },
      sessoes: {
        id: 'sessoes',
        titulo: `Encerrar sessões de ${usuario.nome}`,
        descricao: 'A conta é desconectada de todos os aparelhos agora.',
        confirmar: 'Encerrar sessões',
        situacao: usuario.situacao,
        consequencias: [
          'Todos os aparelhos precisam entrar de novo',
          'Se a conta estiver invadida, quem entrou perde o acesso',
          'A pessoa continua podendo entrar com a senha atual',
        ],
      },
    };

    setAcao(receitas[tipoAcao]);
  }

  return (
    <>
      <header className={styles.topo}>
        <Link href="/admin/usuarios" className={styles.voltar} aria-label="Voltar à listagem">
          <Icon name="chevron-left" size={18} />
        </Link>

        <span className={styles.avatar}>{usuario.iniciais}</span>

        <div className={styles.identidade}>
          <h1 className={styles.nome}>{usuario.nome}</h1>
          <p className={styles.origem}>
            {usuario.tipo ? TIPOS_PERFIL[usuario.tipo] : 'Sem perfil'} · {usuario.perfil?.uf || '—'}
          </p>
        </div>

        <AdminEtiqueta tom={situacao.tom} ponto>
          {situacao.rotulo}
        </AdminEtiqueta>
      </header>

      {usuario.situacao === 'suspenso' || usuario.situacao === 'banido' ? (
        <div className={styles.sancao}>
          <Icon name="bell" size={17} />

          <div className={styles.sancaoTexto}>
            <strong>
              {situacao.rotulo}
              {usuario.suspensoAte ? ` — até ${formatarData(usuario.suspensoAte)}` : ''}
            </strong>
            {usuario.motivoStatus ? <span>“{usuario.motivoStatus}”</span> : null}
          </div>

          <button type="button" className={styles.sancaoAcao} onClick={() => pedirSancao('restaurar')}>
            Restaurar acesso
          </button>
        </div>
      ) : null}

      <div className={styles.grade}>
        <div className={styles.coluna}>
          <PainelCartao titulo="Cadastro" icone="user">
            <dl className={styles.dados}>
              {[
                ['E-mail', usuario.email],
                ['Telefone', usuario.telefone || '—'],
                ['WhatsApp', usuario.whatsapp || '—'],
                ['Anúncios publicados', String(usuario.contadores?.anuncios ?? 0)],
                ['Denúncias recebidas', String(usuario.contadores?.denunciasRecebidas ?? 0)],
                ['Sessões ativas', String(usuario.contadores?.sessoesAtivas ?? 0)],
                ['Plano', usuario.plano?.nome || 'Gratuito'],
              ].map(([rotulo, valor]) => (
                <div key={rotulo} className={styles.dado}>
                  <dt>{rotulo}</dt>
                  <dd>{valor}</dd>
                </div>
              ))}
            </dl>
          </PainelCartao>

          <PainelCartao
            titulo="Anúncios"
            descricao="Publicados por esta conta."
            icone="grid"
            acao={{ href: `/admin/usuarios/${usuario.id}/anuncios`, rotulo: 'Ver e mexer' }}
          >
            <p className={styles.vazio}>{usuario.contadores?.anuncios ?? 0} anúncio(s) — abra "Ver e mexer" para a lista completa.</p>
          </PainelCartao>

          <PainelCartao
            titulo="Denúncias"
            descricao="Recebidas sobre esta conta ou seus anúncios."
            icone="bell"
            acao={{ href: '/admin/denuncias', rotulo: 'Ver fila de denúncias' }}
          >
            <p className={styles.vazio}>{usuario.contadores?.denunciasRecebidas ?? 0} denúncia(s) registrada(s) sobre esta conta.</p>
          </PainelCartao>
        </div>

        <aside className={styles.coluna}>
          <PainelCartao titulo="Ações" icone="gear">
            <div className={styles.acoes}>
              <button type="button" className={styles.acao} onClick={() => pedirSancao('sessoes')}>
                <Icon name="logout" size={16} />
                <span>
                  <strong>Encerrar sessões</strong>
                  <span>Desconecta a conta de todos os aparelhos</span>
                </span>
              </button>

              {secaoPerfil ? (
                <Link href={`/admin/usuarios/${usuario.id}/perfil`} className={styles.acao}>
                  <Icon name={secaoPerfil.icone} size={16} />
                  <span>
                    <strong>{secaoPerfil.rotulo}</strong>
                    <span>{secaoPerfil.dica}</span>
                  </span>
                </Link>
              ) : null}

              <Link href={`/admin/usuarios/${usuario.id}/anuncios`} className={styles.acao}>
                <Icon name="grid" size={16} />
                <span>
                  <strong>Ver e mexer nos anúncios</strong>
                  <span>Ocultar, publicar, destacar ou remover</span>
                </span>
              </Link>

              <Link href={`/admin/conversas/${usuario.id}`} className={styles.acao}>
                <Icon name="mail" size={16} />
                <span>
                  <strong>Ver conversas</strong>
                  <span>Leitura registrada na auditoria</span>
                </span>
              </Link>

              {usuario.situacao !== 'suspenso' && usuario.situacao !== 'banido' ? (
                <>
                  <button type="button" className={`${styles.acao} ${styles.acaoAlerta}`} onClick={() => pedirSancao('suspender')}>
                    <Icon name="eye-off" size={16} />
                    <span>
                      <strong>Suspender conta</strong>
                      <span>Bloqueio temporário, com prazo</span>
                    </span>
                  </button>

                  <button type="button" className={`${styles.acao} ${styles.acaoPerigo}`} onClick={() => pedirSancao('banir')}>
                    <Icon name="trash" size={16} />
                    <span>
                      <strong>Banir conta</strong>
                      <span>Permanente — exige confirmação por escrito</span>
                    </span>
                  </button>
                </>
              ) : (
                <button type="button" className={styles.acao} onClick={() => pedirSancao('restaurar')}>
                  <Icon name="check" size={16} />
                  <span>
                    <strong>Restaurar acesso</strong>
                    <span>Devolve o acesso e reativa o cadastro</span>
                  </span>
                </button>
              )}
            </div>
          </PainelCartao>

          <PainelCartao titulo="Papéis" descricao="O que esta conta pode fazer na plataforma." icone="user">
            <ul className={styles.papeis}>
              {PAPEIS.map((papel) => {
                const tem = usuario.papeis.some((item) => (item.papel || item) === papel.id);

                return (
                  <li key={papel.id} className={styles.papel}>
                    <div className={styles.papelTexto}>
                      <strong>{papel.rotulo}</strong>
                      <span>{papel.descricao}</span>
                    </div>

                    <button
                      type="button"
                      className={`${styles.papelBotao} ${tem ? styles.papelAtivo : ''}`}
                      onClick={() => alternarPapel(papel)}
                      aria-pressed={tem}
                    >
                      {tem ? 'Remover' : 'Conceder'}
                    </button>
                  </li>
                );
              })}
            </ul>
          </PainelCartao>
        </aside>
      </div>

      <AdminAcaoModal acao={acao} onFechar={() => setAcao(null)} onConfirmar={aplicar} />
    </>
  );
}
