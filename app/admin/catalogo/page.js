'use client';

/**
 * Administração → Catálogo.
 *
 * O **vocabulário fechado** que as telas do produto usam: categorias, marcas,
 * máquinas e serviços — mais culturas, só para leitura (ver
 * `lib/dados/admin-catalogo.js` para o porquê de cada coleção estar ou não
 * aqui, e por que "tipos de máquina"/"raios"/"formas de entrega" saíram).
 *
 * Fechado e não campo livre porque a busca depende disso: em texto solto,
 * "retífica de cabeçote" e "retificar cabecote" viram dois serviços
 * diferentes, e nenhum aparece na busca do outro.
 *
 * Cada item mostra **quantas contas ou anúncios dependem dele** quando a API
 * expõe esse número — é o que separa desativar de apagar; apagar em uso a
 * própria API recusa com 409.
 */

import { useEffect, useState } from 'react';
import PainelCartao from '@/components/PainelCartao/PainelCartao';
import AdminEtiqueta from '@/components/AdminEtiqueta/AdminEtiqueta';
import AdminAcaoModal from '@/components/AdminAcaoModal/AdminAcaoModal';
import Input from '@/components/Input/Input';
import Button from '@/components/Button/Button';
import Icon from '@/components/Icon/Icon';
import Dica from '@/components/Dica/Dica';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import {
  COLECOES,
  carregarColecao,
  criarItem,
  editarItem,
  removerItem,
  ordenarColecao,
  carregarMarcas,
} from '@/lib/dados/admin-catalogo';
import styles from './page.module.css';

const ORDENAVEIS = ['categorias-peca', 'categorias-servico', 'servicos'];

export default function AdminCatalogoPage() {
  const aviso = useAviso();

  const [colecaoId, setColecaoId] = useState(COLECOES[0].id);
  const [itens, setItens] = useState(null);
  const [contagens, setContagens] = useState({});
  const [novo, setNovo] = useState('');
  const [marcaNova, setMarcaNova] = useState('');
  const [modeloNovo, setModeloNovo] = useState('');
  const [marcas, setMarcas] = useState([]);
  const [editando, setEditando] = useState(null);
  const [acao, setAcao] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const config = COLECOES.find((item) => item.id === colecaoId);
  const podeOrdenar = ORDENAVEIS.includes(colecaoId);

  useEffect(() => {
    let cancelado = false;
    setItens(null);

    carregarColecao(colecaoId)
      .then((lista) => {
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
  }, [colecaoId]);

  /* contagem por aba, para o menu lateral mostrar "N itens" sem recarregar
     tudo a cada troca — carrega uma vez, em paralelo */
  useEffect(() => {
    let cancelado = false;

    Promise.all(
      COLECOES.map((item) =>
        carregarColecao(item.id)
          .then((lista) => [item.id, lista.length])
          .catch(() => [item.id, 0])
      )
    ).then((pares) => {
      if (!cancelado) setContagens(Object.fromEntries(pares));
    });

    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (colecaoId !== 'maquinas') return;

    carregarMarcas()
      .then(setMarcas)
      .catch(() => {});
  }, [colecaoId]);

  const grupos = (() => {
    if (!itens) return [];
    if (!itens.some((item) => item.grupo)) return [{ nome: null, itens }];

    const mapa = new Map();
    itens.forEach((item) => {
      const atual = mapa.get(item.grupo) || [];
      mapa.set(item.grupo, [...atual, item]);
    });

    return [...mapa.entries()].map(([nome, lista]) => ({ nome, itens: lista }));
  })();

  async function adicionar(evento) {
    evento.preventDefault();

    if (colecaoId === 'maquinas') {
      if (!marcaNova || !modeloNovo.trim()) return;

      setSalvando(true);
      try {
        const criada = await criarItem('maquinas', { marcaId: marcaNova, modelo: modeloNovo.trim() });
        setItens((atual) => [
          ...atual,
          { id: criada.id, nome: criada.modelo, ativo: true, ordem: 0, usos: null, marcaId: marcaNova },
        ]);
        setModeloNovo('');
        aviso.sucesso(`"${criada.modelo}" entrou em máquinas.`);
      } catch (erro) {
        aviso.erro(erro.message);
      } finally {
        setSalvando(false);
      }
      return;
    }

    const nome = novo.trim();
    if (!nome) return;

    if (itens.some((item) => item.nome.toLowerCase() === nome.toLowerCase())) {
      aviso.erro(`"${nome}" já existe nesta lista.`);
      return;
    }

    setSalvando(true);
    try {
      const corpo = { nome };
      if (config.tipo) corpo.tipo = config.tipo;

      const criado = await criarItem(colecaoId, corpo);
      setItens((atual) => [
        ...atual,
        { id: criado.id, nome: criado.nome, ativo: true, ordem: atual.length, usos: 0, grupo: null },
      ]);
      setNovo('');
      aviso.sucesso(`"${nome}" entrou em ${config.rotulo.toLowerCase()}.`);
    } catch (erro) {
      aviso.erro(erro.message);
    } finally {
      setSalvando(false);
    }
  }

  async function salvarNome(evento) {
    evento.preventDefault();
    const nomeNovo = editando.nome.trim();
    if (!nomeNovo) return;

    try {
      const campo = colecaoId === 'maquinas' ? { modelo: nomeNovo } : { nome: nomeNovo };
      await editarItem(colecaoId, editando.id, campo);
      setItens((atual) =>
        atual.map((item) => (item.id === editando.id ? { ...item, nome: nomeNovo } : item))
      );
      aviso.sucesso('Nome atualizado. Quem já usava continua ligado a ele.');
      setEditando(null);
    } catch (erro) {
      aviso.erro(erro.message);
    }
  }

  async function alternarAtivo(item) {
    try {
      await editarItem(colecaoId, item.id, { ativo: !item.ativo });
      setItens((atual) =>
        atual.map((atual2) => (atual2.id === item.id ? { ...atual2, ativo: !item.ativo } : atual2))
      );
      aviso.sucesso(
        item.ativo
          ? `"${item.nome}" saiu das opções — quem já usa continua como está.`
          : `"${item.nome}" voltou às opções.`
      );
    } catch (erro) {
      aviso.erro(erro.message);
    }
  }

  async function apagar() {
    const alvo = acao.item;

    try {
      await removerItem(colecaoId, alvo.id);
      setItens((atual) => atual.filter((item) => item.id !== alvo.id));
      aviso.sucesso(`"${alvo.nome}" foi apagado do catálogo.`);
    } catch (erro) {
      /* a API recusa com 409 quando está em uso — a mensagem dela já explica
         o que travou (quantos anúncios, subcategorias etc.) */
      aviso.erro(erro.message);
    }
    setAcao(null);
  }

  async function mover(item, direcao) {
    const lista = [...itens];
    const posicao = lista.findIndex((atual) => atual.id === item.id);
    const destino = posicao + direcao;

    if (destino < 0 || destino >= lista.length) return;

    [lista[posicao], lista[destino]] = [lista[destino], lista[posicao]];
    setItens(lista);

    try {
      await ordenarColecao(colecaoId, lista.map((linha) => linha.id));
    } catch (erro) {
      aviso.erro(erro.message);
    }
  }

  const emUso = (itens || []).filter((item) => item.usos > 0).length;

  return (
    <>
      <header className={styles.topo}>
        <div>
          <h1 className={styles.titulo}>Catálogo</h1>
          <p className={styles.descricao}>
            As listas que o site oferece nos formulários e nos filtros.
          </p>
        </div>
      </header>

      <p className={styles.explicacao}>
        <Icon name="bell" size={15} />
        Estas listas são fechadas de propósito: em campo livre, "retífica de
        cabeçote" e "retificar cabecote" viram coisas diferentes e nenhuma
        aparece na busca da outra.
      </p>

      <div className={styles.grade}>
        {/* ── coleções ─────────────────────────────────── */}
        <nav className={styles.colecoes} aria-label="Listas do catálogo">
          {COLECOES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.colecao} ${item.id === colecaoId ? styles.colecaoAtiva : ''}`}
              onClick={() => setColecaoId(item.id)}
              aria-current={item.id === colecaoId ? 'page' : undefined}
            >
              <span className={styles.colecaoIcone}>
                <Icon name={item.icone} size={16} />
              </span>

              <span className={styles.colecaoTexto}>
                <strong>{item.rotulo}</strong>
                <span>{contagens[item.id] ?? '…'} itens</span>
              </span>
            </button>
          ))}
        </nav>

        {/* ── itens ────────────────────────────────────── */}
        <div className={styles.conteudo}>
          <PainelCartao
            titulo={config.rotulo}
            descricao={`Aparece em: ${config.onde}.`}
            icone={config.icone}
            semPadding
            permiteEstouro
          >
            {config.somenteLeitura ? (
              <p className={styles.explicacao}>
                <Icon name="eye" size={14} />
                Só leitura — sem endpoint de escrita para esta coleção.
              </p>
            ) : colecaoId === 'maquinas' ? (
              <form className={styles.adicionar} onSubmit={adicionar}>
                <Input
                  as="select"
                  value={marcaNova}
                  onChange={(evento) => setMarcaNova(evento.target.value)}
                  aria-label="Marca"
                >
                  <option value="">Marca…</option>
                  {marcas.map((marca) => (
                    <option key={marca.id} value={marca.id}>
                      {marca.nome}
                    </option>
                  ))}
                </Input>

                <Input
                  value={modeloNovo}
                  onChange={(evento) => setModeloNovo(evento.target.value)}
                  placeholder="Modelo — ex.: 6110J"
                  aria-label="Modelo"
                />

                <Button type="submit" iconLeft="plus" disabled={!marcaNova || !modeloNovo.trim() || salvando}>
                  Adicionar
                </Button>
              </form>
            ) : (
              <form className={styles.adicionar} onSubmit={adicionar}>
                <Input
                  value={novo}
                  onChange={(evento) => setNovo(evento.target.value)}
                  placeholder={`Novo item em ${config.rotulo.toLowerCase()}`}
                  aria-label="Nome do novo item"
                />

                <Button type="submit" iconLeft="plus" disabled={!novo.trim() || salvando}>
                  Adicionar
                </Button>
              </form>
            )}

            {!itens ? (
              <div className={styles.carregando}>
                <Esqueleto altura={44} raio={10} />
                <Esqueleto altura={44} raio={10} />
                <Esqueleto altura={44} raio={10} />
              </div>
            ) : (
              <>
                {grupos.map((grupo) => (
                  <div key={grupo.nome || 'unico'}>
                    {grupo.nome ? <span className={styles.grupoNome}>{grupo.nome}</span> : null}

                    <ul className={styles.itens}>
                      {grupo.itens.map((item) => (
                        <li key={item.id} className={`${styles.item} ${item.ativo ? '' : styles.itemInativo}`}>
                          {podeOrdenar ? (
                            <span className={styles.ordem}>
                              <button type="button" onClick={() => mover(item, -1)} aria-label={`Subir ${item.nome}`}>
                                <Icon name="chevron-left" size={13} className={styles.paraCima} />
                              </button>

                              <button type="button" onClick={() => mover(item, 1)} aria-label={`Descer ${item.nome}`}>
                                <Icon name="chevron-right" size={13} className={styles.paraBaixo} />
                              </button>
                            </span>
                          ) : null}

                          {editando?.id === item.id ? (
                            <form className={styles.edicao} onSubmit={salvarNome}>
                              <Input
                                value={editando.nome}
                                onChange={(evento) => setEditando({ ...editando, nome: evento.target.value })}
                                aria-label="Novo nome"
                              />

                              <Button type="submit" size="sm">
                                Salvar
                              </Button>

                              <Button type="button" variant="ghost" size="sm" onClick={() => setEditando(null)}>
                                Cancelar
                              </Button>
                            </form>
                          ) : (
                            <>
                              <span className={styles.nome}>
                                {item.marcaNome ? `${item.marcaNome} ` : ''}
                                {item.nome}
                              </span>

                              {item.usos !== null ? (
                                <span className={styles.usos}>
                                  {item.usos > 0 ? `${item.usos} em uso` : 'sem uso'}
                                </span>
                              ) : null}

                              {!item.ativo ? <AdminEtiqueta tom="neutro">Fora das opções</AdminEtiqueta> : null}

                              {!config.somenteLeitura ? (
                                <span className={styles.acoes}>
                                  <Dica texto="Renomear" alinhamento="fim">
                                    <button
                                      type="button"
                                      className={styles.icone}
                                      onClick={() => setEditando({ ...item })}
                                      aria-label={`Renomear ${item.nome}`}
                                    >
                                      <Icon name="edit" size={14} />
                                    </button>
                                  </Dica>

                                  <Dica texto={item.ativo ? 'Tirar das opções' : 'Voltar às opções'} alinhamento="fim">
                                    <button
                                      type="button"
                                      className={styles.icone}
                                      onClick={() => alternarAtivo(item)}
                                      aria-label={item.ativo ? 'Desativar' : 'Ativar'}
                                    >
                                      <Icon name={item.ativo ? 'eye-off' : 'check'} size={14} />
                                    </button>
                                  </Dica>

                                  <Dica texto={item.usos > 0 ? 'Em uso — prefira tirar das opções' : 'Apagar do catálogo'} alinhamento="fim">
                                    <button
                                      type="button"
                                      className={`${styles.icone} ${styles.iconePerigo}`}
                                      onClick={() =>
                                        setAcao({
                                          id: `apagar-${item.id}`,
                                          item,
                                          titulo: `Apagar "${item.nome}"`,
                                          descricao: config.aviso,
                                          confirmar: 'Apagar do catálogo',
                                          destrutiva: item.usos > 0,
                                          consequencias: [
                                            item.usos > 0
                                              ? `${item.usos} cadastro(s) usam este item — a API recusa a remoção enquanto isso`
                                              : 'Nenhum cadastro usa este item hoje',
                                            'Some dos formulários e dos filtros da busca',
                                          ],
                                        })
                                      }
                                      aria-label={`Apagar ${item.nome}`}
                                    >
                                      <Icon name="trash" size={14} />
                                    </button>
                                  </Dica>
                                </span>
                              ) : null}
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                <p className={styles.rodape}>
                  {itens.length} itens{emUso ? ` · ${emUso} em uso` : ''} · {config.aviso}
                </p>
              </>
            )}
          </PainelCartao>
        </div>
      </div>

      <AdminAcaoModal
        acao={
          acao && {
            ...acao,
            /* apagar item de catálogo não usa o motivo/palavra do modal —
               a única confirmação que faz sentido aqui é "sim, apagar" */
            palavra: undefined,
          }
        }
        onFechar={() => setAcao(null)}
        onConfirmar={apagar}
      />
    </>
  );
}
