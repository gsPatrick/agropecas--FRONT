'use client';

/**
 * Administração → Usuários.
 *
 * Listagem com filtro por situação e por tipo de perfil, busca por nome ou
 * e-mail, e ações em lote — porque golpe raramente vem de uma conta só, e
 * sancionar quinze cadastros um a um é o que faz a moderação desistir no
 * meio.
 *
 * ⚠️ Sem aba "Aguardando": a API não tem fila de aprovação de cadastro (a
 * conta ativa sozinha ao confirmar o e-mail ou entrar pela primeira vez) —
 * ver o comentário no topo de `lib/dados/admin-usuarios.js`.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminEtiqueta from '@/components/AdminEtiqueta/AdminEtiqueta';
import AdminAcaoModal from '@/components/AdminAcaoModal/AdminAcaoModal';
import PainelSegmentos from '@/components/PainelSegmentos/PainelSegmentos';
import Input from '@/components/Input/Input';
import Field from '@/components/Field/Field';
import Modal from '@/components/Modal/Modal';
import Button from '@/components/Button/Button';
import Icon from '@/components/Icon/Icon';
import Dica from '@/components/Dica/Dica';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import {
  listarUsuarios,
  editarUsuario,
  suspenderUsuario,
  banirUsuario,
  restaurarUsuario,
  sancionarEmLote,
  STATUS_USUARIO,
  TIPOS_PERFIL,
} from '@/lib/dados/admin-usuarios';
import styles from './page.module.css';

const ABAS = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'pendente', rotulo: 'Pendentes' },
  { id: 'ativo', rotulo: 'Ativos' },
  { id: 'suspenso', rotulo: 'Suspensos' },
  { id: 'banido', rotulo: 'Banidos' },
  { id: 'denunciados', rotulo: 'Com denúncia' },
];

const MOTIVOS = [
  'Anúncios repetidos com preço divergente',
  'Suspeita de golpe relatada por outros usuários',
  'Conteúdo ofensivo em conversas',
  'Dados de contato indevidos nas fotos',
];

export default function AdminUsuariosPage() {
  const aviso = useAviso();

  const [aba, setAba] = useState('todos');
  const [tipo, setTipo] = useState('todos');
  const [busca, setBusca] = useState('');
  const [usuarios, setUsuarios] = useState(null);
  const [marcados, setMarcados] = useState([]);
  const [acao, setAcao] = useState(null);
  const [editando, setEditando] = useState(null);

  useEffect(() => {
    const pedida = new URLSearchParams(window.location.search).get('aba');
    if (pedida && ABAS.some((item) => item.id === pedida)) setAba(pedida);
  }, []);

  useEffect(() => {
    let cancelado = false;
    setUsuarios(null);

    listarUsuarios({
      status: aba === 'todos' || aba === 'denunciados' ? undefined : aba,
      tipoPerfil: tipo === 'todos' ? undefined : tipo,
      busca: busca || undefined,
      comDenuncias: aba === 'denunciados' || undefined,
    })
      .then(({ itens }) => {
        if (!cancelado) setUsuarios(itens);
      })
      .catch((erro) => {
        if (!cancelado) {
          setUsuarios([]);
          aviso.erro(erro.message);
        }
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, tipo, busca]);

  const lista = usuarios || [];
  const todosMarcados = lista.length > 0 && lista.every((usuario) => marcados.includes(usuario.id));

  function alternarMarca(id) {
    setMarcados((atual) => (atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]));
  }

  function alternarTodos() {
    setMarcados(todosMarcados ? [] : lista.map((usuario) => usuario.id));
  }

  function atualizarLocal(id, mudancas) {
    setUsuarios((atual) => atual.map((item) => (item.id === id ? { ...item, ...mudancas } : item)));
  }

  async function aplicar({ motivo, prazo }) {
    const alvos = acao.alvos;
    const dias = prazo && prazo !== 'indeterminado' ? Number(prazo) : undefined;

    try {
      if (alvos.length > 1) {
        await sancionarEmLote({ ids: alvos, acao: acao.acaoApi, motivo, dias });
        setUsuarios((atual) =>
          atual.map((item) =>
            alvos.includes(item.id) ? { ...item, situacao: acao.situacao } : item
          )
        );
        aviso.sucesso(`${alvos.length} conta(s) atualizadas.`);
      } else {
        const id = alvos[0];
        if (acao.acaoApi === 'suspender') await suspenderUsuario(id, { motivo, dias });
        else if (acao.acaoApi === 'banir') await banirUsuario(id, { motivo });
        else if (acao.acaoApi === 'restaurar') await restaurarUsuario(id, motivo);

        atualizarLocal(id, { situacao: acao.situacao });
        aviso.sucesso(`${acao.nome} — ${STATUS_USUARIO[acao.situacao].rotulo.toLowerCase()}.`);
      }
    } catch (erro) {
      aviso.erro(erro.message);
    }

    setMarcados([]);
    setAcao(null);
  }

  async function salvarEdicao(evento) {
    evento.preventDefault();

    try {
      await editarUsuario(editando.id, {
        nome: editando.nome,
        email: editando.email,
        motivo: 'Correção de cadastro pela administração',
      });
      atualizarLocal(editando.id, { nome: editando.nome, email: editando.email });
      aviso.sucesso('Dados do usuário atualizados.');
      setEditando(null);
    } catch (erro) {
      aviso.erro(erro.message);
    }
  }

  function pedirSancao(tipoAcao, usuariosAlvo) {
    const alvos = usuariosAlvo.map((usuario) => usuario.id);
    const nome = usuariosAlvo.length === 1 ? usuariosAlvo[0].nome : `${alvos.length} contas`;

    const receitas = {
      suspender: {
        id: `suspender-${alvos.join('-')}`,
        titulo: `Suspender ${nome}`,
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
        id: `banir-${alvos.join('-')}`,
        titulo: `Banir ${nome}`,
        descricao: 'Bloqueio permanente. Use quando a fraude estiver comprovada.',
        confirmar: 'Banir definitivamente',
        situacao: 'banido',
        acaoApi: 'banir',
        destrutiva: true,
        consequencias: [
          'Todos os anúncios saem do ar imediatamente',
          'O acesso é encerrado em todos os aparelhos',
          'Só outro administrador consegue reverter',
        ],
      },
      restaurar: {
        id: `restaurar-${alvos.join('-')}`,
        titulo: `Restaurar ${nome}`,
        descricao: 'Devolve o acesso e reativa o cadastro.',
        confirmar: 'Restaurar acesso',
        situacao: 'ativo',
        acaoApi: 'restaurar',
        consequencias: [
          'A pessoa volta a acessar e a anunciar',
          'Os anúncios continuam fora do ar até ela republicar',
        ],
      },
    };

    setAcao({ ...receitas[tipoAcao], alvos, nome });
  }

  const selecionados = lista.filter((usuario) => marcados.includes(usuario.id));

  if (!usuarios) {
    return (
      <>
        <header className={styles.topo}>
          <div>
            <h1 className={styles.titulo}>Usuários</h1>
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
          <h1 className={styles.titulo}>Usuários</h1>
          <p className={styles.descricao}>{lista.length} cadastros nesta visão</p>
        </div>
      </header>

      <div className={styles.filtros}>
        <PainelSegmentos opcoes={ABAS} valor={aba} onMudar={setAba} rotulo="Situação" />

        <div className={styles.direita}>
          <div className={styles.campoTipo}>
            <Input as="select" value={tipo} onChange={(evento) => setTipo(evento.target.value)} aria-label="Tipo de perfil">
              <option value="todos">Todos os perfis</option>
              {Object.entries(TIPOS_PERFIL).map(([id, rotulo]) => (
                <option key={id} value={id}>
                  {rotulo}
                </option>
              ))}
            </Input>
          </div>

          <div className={styles.campoBusca}>
            <Input
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Nome ou e-mail"
              iconLeft="search"
              aria-label="Buscar usuário"
            />
          </div>
        </div>
      </div>

      {marcados.length ? (
        <div className={styles.lote}>
          <span className={styles.loteTexto}>
            <strong>{marcados.length}</strong> selecionado(s)
          </span>

          <div className={styles.loteAcoes}>
            <button type="button" className={styles.loteBotao} onClick={() => pedirSancao('suspender', selecionados)}>
              <Icon name="eye-off" size={14} />
              Suspender
            </button>

            <button type="button" className={`${styles.loteBotao} ${styles.lotePerigo}`} onClick={() => pedirSancao('banir', selecionados)}>
              <Icon name="trash" size={14} />
              Banir
            </button>

            <button type="button" className={styles.loteBotao} onClick={() => pedirSancao('restaurar', selecionados)}>
              <Icon name="check" size={14} />
              Restaurar
            </button>

            <button type="button" className={styles.loteLimpar} onClick={() => setMarcados([])}>
              Limpar seleção
            </button>
          </div>
        </div>
      ) : null}

      <div className={styles.quadro}>
        <div className={styles.cabecalho}>
          <label className={styles.marcaTodos}>
            <input type="checkbox" checked={todosMarcados} onChange={alternarTodos} aria-label="Selecionar todos os visíveis" />
          </label>

          <span className={styles.colPessoa}>Pessoa</span>
          <span className={styles.colTipo}>Perfil</span>
          <span className={styles.colNumero}>Anúncios</span>
          <span className={styles.colSituacao}>Situação</span>
          <span className={styles.colAcoes}>Ações</span>
        </div>

        {lista.length ? (
          <ul className={styles.lista}>
            {lista.map((usuario) => {
              const situacao = STATUS_USUARIO[usuario.situacao] || STATUS_USUARIO.ativo;

              return (
                <li key={usuario.id} className={styles.linha}>
                  <label className={styles.marca}>
                    <input
                      type="checkbox"
                      checked={marcados.includes(usuario.id)}
                      onChange={() => alternarMarca(usuario.id)}
                      aria-label={`Selecionar ${usuario.nome}`}
                    />
                  </label>

                  <Link href={`/admin/usuarios/${usuario.id}`} className={styles.pessoa}>
                    <span className={styles.avatar}>{usuario.iniciais}</span>

                    <span className={styles.pessoaTexto}>
                      <strong className={styles.nome}>
                        {usuario.nome}
                        {usuario.verificado ? (
                          <Dica texto="Perfil verificado">
                            <span className={styles.verificado}>
                              <Icon name="check" size={10} />
                            </span>
                          </Dica>
                        ) : null}
                      </strong>

                      <span className={styles.contato}>{usuario.email}</span>
                    </span>
                  </Link>

                  <span className={styles.colTipo}>{usuario.tipo ? TIPOS_PERFIL[usuario.tipo] : '—'}</span>

                  <span className={styles.colNumero}>{usuario.anuncios}</span>

                  <span className={styles.colSituacao}>
                    <AdminEtiqueta tom={situacao.tom} ponto>
                      {situacao.rotulo}
                    </AdminEtiqueta>
                  </span>

                  <span className={styles.colAcoes}>
                    <Dica texto="Editar dados" alinhamento="fim">
                      <button
                        type="button"
                        className={styles.acaoIcone}
                        onClick={() => setEditando({ ...usuario })}
                        aria-label={`Editar ${usuario.nome}`}
                      >
                        <Icon name="edit" size={15} />
                      </button>
                    </Dica>

                    {usuario.situacao === 'suspenso' || usuario.situacao === 'banido' ? (
                      <Dica texto="Restaurar acesso" alinhamento="fim">
                        <button
                          type="button"
                          className={styles.acaoIcone}
                          onClick={() => pedirSancao('restaurar', [usuario])}
                          aria-label={`Restaurar ${usuario.nome}`}
                        >
                          <Icon name="check" size={15} />
                        </button>
                      </Dica>
                    ) : (
                      <Dica texto="Suspender conta" alinhamento="fim">
                        <button
                          type="button"
                          className={styles.acaoIcone}
                          onClick={() => pedirSancao('suspender', [usuario])}
                          aria-label={`Suspender ${usuario.nome}`}
                        >
                          <Icon name="eye-off" size={15} />
                        </button>
                      </Dica>
                    )}

                    <Dica texto="Abrir ficha completa" alinhamento="fim">
                      <Link href={`/admin/usuarios/${usuario.id}`} className={styles.acaoIcone} aria-label={`Abrir ${usuario.nome}`}>
                        <Icon name="chevron-right" size={15} />
                      </Link>
                    </Dica>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.vazio}>Nenhum usuário com esses filtros. Tente outro termo ou volte para "Todos".</p>
        )}
      </div>

      <AdminAcaoModal acao={acao} motivos={MOTIVOS} onFechar={() => setAcao(null)} onConfirmar={aplicar} />

      {editando ? (
        <Modal
          open
          onClose={() => setEditando(null)}
          title={`Editar ${editando.nome}`}
          description="Alterações feitas pela administração ficam registradas na auditoria."
          footer={
            <div className={styles.rodapeModal}>
              <Button variant="ghost" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
              <Button variant="forest" onClick={salvarEdicao}>
                Salvar alterações
              </Button>
            </div>
          }
        >
          <div className={styles.campos}>
            <Field label="Nome" htmlFor="edit-nome">
              <Input id="edit-nome" value={editando.nome} onChange={(evento) => setEditando({ ...editando, nome: evento.target.value })} />
            </Field>

            <Field label="E-mail" htmlFor="edit-email">
              <Input id="edit-email" type="email" value={editando.email} onChange={(evento) => setEditando({ ...editando, email: evento.target.value })} />
            </Field>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
