'use client';

/**
 * Administração → Documentos legais.
 *
 * Onde os Termos de Uso, a Política de Privacidade e a Política de Cookies são
 * de fato ESCRITOS. A tela de LGPD lista os documentos e conta quem aceitou;
 * ela responde "como estamos?". Esta responde "o que vamos publicar?", que é
 * outro trabalho e outro risco.
 *
 * Três decisões moldam a tela:
 *
 *  · **Prévia obrigatória, lado a lado.** O texto é gravado num formato mínimo
 *    (`## Título`, `- item`, parágrafo) e interpretado pelo site público. Sem
 *    ver o resultado, publica-se um documento legal às cegas — e a correção
 *    custa outra versão, que custa o reaceite de toda a base.
 *  · **Publicar é ação grave.** Versão nova com aceite obrigatório coloca
 *    todos os usuários na tela de reaceite no próximo acesso e zera a
 *    contagem. Por isso passa pelo `AdminAcaoModal` com palavra de
 *    confirmação, e o número de contas afetadas aparece escrito no modal —
 *    não em letra miúda.
 *  · **Histórico visível.** Publicar não apaga a versão anterior: os
 *    consentimentos antigos apontam para ela. Quem publicou e quando é a
 *    resposta que o jurídico vai pedir depois do problema.
 *
 * Dados: `GET /admin/lgpd/documentos` (metadados + contagem de reaceite) e
 * `GET /lgpd/documentos/:tipo` (texto integral, para o editor começar do que
 * está no ar). O metadado NÃO traz o texto de propósito — ele é grande e a
 * lista não precisa dele.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PainelCartao from '@/components/PainelCartao/PainelCartao';
import AdminEtiqueta from '@/components/AdminEtiqueta/AdminEtiqueta';
import AdminAcaoModal from '@/components/AdminAcaoModal/AdminAcaoModal';
import PainelBarraSalvar from '@/components/PainelBarraSalvar/PainelBarraSalvar';
import Field from '@/components/Field/Field';
import Input from '@/components/Input/Input';
import Button from '@/components/Button/Button';
import Icon from '@/components/Icon/Icon';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import api from '@/lib/api';
import {
  TIPOS_DOCUMENTO,
  converterConteudo,
  conferirFormato,
  documentoPorTipo,
  rotuloDoTipo,
} from '@/lib/documento-legal';
import styles from './page.module.css';

/* sugestões de resumo da mudança. O texto vai para a auditoria E para o aviso
   de reaceite que o usuário lê — "atualização" sozinho não explica nada a
   quem está sendo obrigado a concordar de novo */
const MOTIVOS = [
  'Ajuste de redação, sem mudança de regra',
  'Nova seção sobre tratamento de dados',
  'Adequação a exigência legal',
  'Correção de informação incorreta',
];

const RASCUNHO_VAZIO = { titulo: '', versao: '', conteudo: '', tipo: null };

function formatarData(valor) {
  if (!valor) return '—';

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '—';

  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Próxima versão sugerida: incrementa o último número.
 *
 * Sugerir e não impor — a API só exige numeração numérica, e a decisão entre
 * 1.1 e 2.0 é de quem escreveu (correção de vírgula não é versão maior). Mas
 * começar do zero a cada publicação é como o campo vira "2" duas vezes e a
 * segunda tentativa volta com conflito.
 */
function proximaVersao(atual) {
  if (!atual) return '1.0';

  const partes = String(atual).split('.');
  const ultima = Number(partes[partes.length - 1]);
  if (Number.isNaN(ultima)) return atual;

  return [...partes.slice(0, -1), ultima + 1].join('.');
}

/* ── esqueleto ─────────────────────────────────────────── */
/* imita a forma da lista real — três linhas, uma por documento — para a tela
   não pular de altura quando os dados chegarem */
function ListaEsqueleto() {
  return (
    <ul className={styles.documentos}>
      {TIPOS_DOCUMENTO.map((tipo) => (
        <li className={styles.documento} key={tipo.id}>
          <div className={styles.documentoTexto}>
            <Esqueleto largura="42%" altura="1em" />
            <Esqueleto largura="64%" altura="0.9em" />
          </div>

          <Esqueleto largura={90} altura="1em" />
          <Esqueleto largura={120} altura={32} raio={12} />
        </li>
      ))}
    </ul>
  );
}

export default function AdminTermosPage() {
  const aviso = useAviso();

  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  /* o editor só existe depois de escolher um documento: um formulário aberto
     sem alvo convida a publicar no tipo errado, que é irreversível */
  const [rascunho, setRascunho] = useState(RASCUNHO_VAZIO);
  const [carregandoTexto, setCarregandoTexto] = useState(false);
  const [original, setOriginal] = useState('');
  const [acao, setAcao] = useState(null);
  const [publicando, setPublicando] = useState(false);

  const carregar = useCallback(async (sinal) => {
    setCarregando(true);
    setErro(null);

    try {
      /* `listar` e não `get`: a contagem de reaceite viaja em `meta`, e é ela
         que diz o tamanho do estrago antes de publicar */
      const resposta = await api.listar('/admin/lgpd/documentos', null, { sinal });
      setDados({ ...resposta.dados, ...resposta.meta });
    } catch (falha) {
      if (falha.name === 'AbortError') return;
      setErro(falha.mensagem || 'Não foi possível carregar os documentos.');
    } finally {
      if (!sinal?.aborted) setCarregando(false);
    }
  }, []);

  useEffect(() => {
    const controle = new AbortController();
    carregar(controle.signal);
    return () => controle.abort();
  }, [carregar]);

  const vigentes = dados?.vigentes || [];
  const versoes = dados?.versoes || [];
  const reaceite = dados?.reaceitePendente || {};

  /* a lista é dirigida pelos TIPOS que a plataforma tem, não pelo que a API
     devolveu: um documento que nunca foi publicado precisa aparecer aqui —
     é justamente o que falta publicar */
  const linhas = useMemo(
    () =>
      TIPOS_DOCUMENTO.map((tipo) => ({
        ...tipo,
        vigente: vigentes.find((documento) => documento.tipo === tipo.id) || null,
        contagem: reaceite[tipo.id] || null,
      })),
    [vigentes, reaceite]
  );

  const emEdicao = rascunho.tipo ? documentoPorTipo(rascunho.tipo) : null;
  const linhaEmEdicao = linhas.find((linha) => linha.id === rascunho.tipo) || null;

  const secoes = useMemo(() => converterConteudo(rascunho.conteudo), [rascunho.conteudo]);
  const avisosFormato = useMemo(
    () => (rascunho.conteudo.trim() ? conferirFormato(rascunho.conteudo) : []),
    [rascunho.conteudo]
  );

  const alterado =
    Boolean(rascunho.tipo) &&
    (rascunho.conteudo !== original ||
      rascunho.versao !== proximaVersao(linhaEmEdicao?.vigente?.versao) ||
      rascunho.titulo !== (linhaEmEdicao?.vigente?.titulo || linhaEmEdicao?.rotulo || ''));

  /* a API exige 50 caracteres e versão numérica; conferir aqui evita a ida ao
     servidor só para voltar com erro de campo */
  const podePublicar =
    Boolean(rascunho.tipo) &&
    rascunho.conteudo.trim().length >= 50 &&
    /^[0-9]+(\.[0-9]+)*$/.test(rascunho.versao.trim()) &&
    !carregandoTexto;

  /**
   * Abre o editor já com o texto que está no ar.
   *
   * Documento legal quase nunca é reescrito do zero — muda um parágrafo. Abrir
   * em branco levaria alguém a colar de um Word, e é assim que a formatação
   * mínima se perde e o site público renderiza um bloco só.
   */
  async function editar(linha) {
    setRascunho({
      tipo: linha.id,
      titulo: linha.vigente?.titulo || linha.rotulo,
      versao: proximaVersao(linha.vigente?.versao),
      conteudo: '',
    });

    setOriginal('');

    if (!linha.vigente) return;

    setCarregandoTexto(true);

    try {
      const documento = await api.get(`/lgpd/documentos/${linha.id}`);
      const texto = documento?.conteudo || '';

      setRascunho((atual) =>
        /* se a pessoa já trocou de documento enquanto o texto vinha, o texto
           antigo não pode cair no rascunho novo */
        atual.tipo === linha.id ? { ...atual, conteudo: texto } : atual
      );
      setOriginal(texto);
    } catch (falha) {
      aviso.erro('Não foi possível carregar o texto em vigor. Comece pelo texto novo.');
    } finally {
      setCarregandoTexto(false);
    }
  }

  function fecharEditor() {
    setRascunho(RASCUNHO_VAZIO);
    setOriginal('');
  }

  function abrirConfirmacao() {
    const contagem = linhaEmEdicao?.contagem;
    const contas = contagem?.contasAtivas ?? 0;

    setAcao({
      id: `publicar-${rascunho.tipo}-${rascunho.versao}`,
      titulo: `Publicar ${rotuloDoTipo(rascunho.tipo)} versão ${rascunho.versao}`,
      descricao:
        'A versão anterior deixa de vigorar no mesmo instante e o texto novo entra no ar para quem visitar o site.',
      confirmar: 'Publicar nova versão',
      /* palavra de confirmação: a ação não tem desfazer. Despublicar exige
         publicar de novo o texto antigo, com número de versão novo */
      destrutiva: true,
      palavra: 'PUBLICAR',
      consequencias: [
        `${contas} conta(s) ativa(s) passam a estar com o consentimento desatualizado`,
        emEdicao?.travaUso
          ? 'Cada usuário vê a tela de reaceite no próximo acesso e não usa a plataforma sem concordar'
          : 'Cada usuário é avisado da mudança, mas o uso da plataforma não é travado',
        'A contagem de aceites recomeça do zero nesta versão',
        'A versão anterior fica no histórico — os aceites antigos continuam apontando para ela',
        'Não há desfazer: voltar atrás exige publicar o texto antigo como versão nova',
      ],
    });
  }

  async function publicar({ motivo }) {
    setPublicando(true);

    try {
      await api.post('/admin/lgpd/documentos', {
        tipo: rascunho.tipo,
        versao: rascunho.versao.trim(),
        titulo: rascunho.titulo.trim() || rotuloDoTipo(rascunho.tipo),
        conteudo: rascunho.conteudo,
        /* o motivo do modal É o resumo da mudança: ele vai para a auditoria e
           para o aviso que o usuário lê ao reaceitar */
        resumoMudancas: motivo,
        exigeNovoAceite: true,
      });

      aviso.sucesso(
        `${rotuloDoTipo(rascunho.tipo)} versão ${rascunho.versao} publicada. O reaceite começa agora.`
      );

      setAcao(null);
      fecharEditor();
      await carregar();
    } catch (falha) {
      aviso.erro(falha.mensagem || 'Não foi possível publicar. Nada foi alterado.');
    } finally {
      setPublicando(false);
    }
  }

  const totalPendente = dados?.totalReaceitePendente || 0;

  return (
    <>
      <header className={styles.topo}>
        <div>
          <h1 className={styles.titulo}>Documentos legais</h1>
          <p className={styles.descricao}>
            Termos de Uso, Política de Privacidade e Política de Cookies — o texto
            que está no ar e o que vai entrar no lugar.
          </p>
        </div>
      </header>

      {erro ? (
        <div className={styles.alerta} role="alert">
          <Icon name="close" size={17} />
          <span>{erro}</span>

          <Button variant="outline" size="sm" onClick={() => carregar()}>
            Tentar de novo
          </Button>
        </div>
      ) : null}

      {!erro && totalPendente > 0 ? (
        <p className={styles.explicacao}>
          <Icon name="bell" size={15} />
          {totalPendente} consentimento(s) desatualizado(s) hoje. Publicar outra
          versão agora soma a esta fila — vale conferir se não é melhor esperar.
        </p>
      ) : null}

      {/* ── documentos em vigor ──────────────────────────── */}
      <PainelCartao
        titulo="Documentos em vigor"
        descricao="Versão vigente, desde quando, e quantos já aceitaram."
        icone="grid"
        semPadding
      >
        {carregando ? (
          <ListaEsqueleto />
        ) : (
          <ul className={styles.documentos}>
            {linhas.map((linha) => (
              <li key={linha.id} className={styles.documento}>
                <div className={styles.documentoTexto}>
                  <strong>
                    {linha.rotulo}{' '}
                    {linha.vigente ? (
                      <span className={styles.versao}>versão {linha.vigente.versao}</span>
                    ) : null}
                  </strong>

                  <span className={styles.quando}>
                    {linha.vigente
                      ? `Em vigor desde ${formatarData(linha.vigente.vigenteDe)}`
                      : 'Nunca publicado — o site mostra o texto de reserva'}
                  </span>
                </div>

                <span className={styles.aceites}>
                  {linha.contagem?.aceiteRastreado === false ? (
                    /* cookies não tem linha própria em `consentimentos`: dizer
                       "0 aceites" seria inventar um número */
                    'aceite não contabilizado'
                  ) : (
                    <>
                      <strong>{linha.contagem?.aceitaramVersaoVigente ?? 0}</strong> de{' '}
                      {linha.contagem?.contasAtivas ?? 0} aceitaram
                    </>
                  )}
                </span>

                {linha.contagem?.desatualizados ? (
                  <AdminEtiqueta tom="alerta">
                    {linha.contagem.desatualizados} sem aceitar
                  </AdminEtiqueta>
                ) : (
                  <AdminEtiqueta tom="ok" ponto>
                    Sem pendência
                  </AdminEtiqueta>
                )}

                <span className={styles.documentoAcoes}>
                  {linha.caminho ? (
                    <Link
                      href={linha.caminho}
                      className={styles.verNoSite}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon name="eye" size={14} />
                      Ver no site
                    </Link>
                  ) : null}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => editar(linha)}
                    disabled={rascunho.tipo === linha.id}
                  >
                    Nova versão
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </PainelCartao>

      {/* ── editor + prévia ──────────────────────────────── */}
      {emEdicao ? (
        <form
          className={styles.formulario}
          onSubmit={(evento) => {
            evento.preventDefault();
            if (podePublicar) abrirConfirmacao();
          }}
        >
          <PainelCartao
            titulo={`Nova versão · ${emEdicao.rotulo}`}
            descricao="O texto da esquerda é gravado como está; a direita é como o visitante vê."
            icone="edit"
          >
            <div className={styles.identificacao}>
              <Field
                label="Título do documento"
                htmlFor="titulo-documento"
                hint="Aparece como cabeçalho da página pública."
              >
                <Input
                  id="titulo-documento"
                  value={rascunho.titulo}
                  onChange={(evento) =>
                    setRascunho((atual) => ({ ...atual, titulo: evento.target.value }))
                  }
                  placeholder={emEdicao.rotulo}
                />
              </Field>

              <Field
                label="Número da versão"
                htmlFor="versao-documento"
                hint={
                  linhaEmEdicao?.vigente
                    ? `A versão em vigor é a ${linhaEmEdicao.vigente.versao}. Use só números e pontos.`
                    : 'Primeira publicação deste documento. Use só números e pontos.'
                }
                error={
                  rascunho.versao.trim() && !/^[0-9]+(\.[0-9]+)*$/.test(rascunho.versao.trim())
                    ? 'Use versionamento numérico (ex.: 2.1).'
                    : undefined
                }
              >
                <Input
                  id="versao-documento"
                  value={rascunho.versao}
                  onChange={(evento) =>
                    setRascunho((atual) => ({ ...atual, versao: evento.target.value }))
                  }
                  placeholder="2.1"
                  inputMode="decimal"
                />
              </Field>
            </div>

            <p className={styles.formato}>
              <Icon name="bell" size={15} />
              Formato aceito: <code>## Título</code> abre uma seção, <code>- item</code>{' '}
              vira lista, e linha solta vira parágrafo. É só isso — negrito e
              outros sinais aparecem literais no site.
            </p>

            <div className={styles.lado}>
              {/* ── o texto ─────────────────────────────── */}
              <div className={styles.coluna}>
                <span className={styles.colunaRotulo}>
                  <Icon name="edit" size={14} />
                  Texto da versão
                </span>

                {carregandoTexto ? (
                  <div className={styles.esqueletoTexto}>
                    <Esqueleto largura="100%" altura="1em" repetir={12} />
                  </div>
                ) : (
                  <Input
                    as="textarea"
                    id="conteudo-documento"
                    className={styles.editor}
                    rows={22}
                    value={rascunho.conteudo}
                    onChange={(evento) =>
                      setRascunho((atual) => ({ ...atual, conteudo: evento.target.value }))
                    }
                    placeholder={'## 1. Sobre este documento\nPrimeiro parágrafo.\n\n- primeiro item\n- segundo item'}
                    aria-label="Conteúdo do documento"
                  />
                )}

                <span className={styles.contador}>
                  {rascunho.conteudo.trim().length} caracteres · {secoes.length} seção(ões) ·
                  mínimo de 50 caracteres
                </span>
              </div>

              {/* ── como o visitante vê ─────────────────── */}
              <div className={styles.coluna}>
                <span className={styles.colunaRotulo}>
                  <Icon name="eye" size={14} />
                  Como o visitante vê
                </span>

                <div className={styles.previa}>
                  <span className={styles.previaEtiqueta}>Documento legal</span>
                  <h3 className={styles.previaTitulo}>
                    {rascunho.titulo.trim() || emEdicao.rotulo}
                  </h3>

                  {secoes.length ? (
                    <>
                      <ol className={styles.previaIndice}>
                        {secoes.map((secao) => (
                          <li key={secao.id}>{secao.title || 'Sem título'}</li>
                        ))}
                      </ol>

                      {secoes.map((secao) => (
                        <section className={styles.previaSecao} key={secao.id}>
                          {secao.title ? (
                            <h4 className={styles.previaSecaoTitulo}>{secao.title}</h4>
                          ) : null}

                          {secao.blocos.map((bloco, indice) =>
                            bloco.tipo === 'lista' ? (
                              <ul className={styles.previaLista} key={`lista-${indice}`}>
                                {bloco.itens.map((item, posicao) => (
                                  <li key={`${posicao}-${item.slice(0, 24)}`}>{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className={styles.previaParagrafo} key={`p-${indice}`}>
                                {bloco.texto}
                              </p>
                            )
                          )}
                        </section>
                      ))}
                    </>
                  ) : (
                    <p className={styles.previaVazia}>
                      Assim que houver texto, ele aparece aqui exatamente como o
                      site vai mostrar.
                    </p>
                  )}
                </div>

                {avisosFormato.length ? (
                  <ul className={styles.avisosFormato}>
                    {avisosFormato.map((texto) => (
                      <li key={texto}>
                        <Icon name="chevron-right" size={13} />
                        {texto}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </PainelCartao>

          <PainelBarraSalvar
            alterado={alterado && podePublicar && !publicando}
            onDescartar={fecharEditor}
            rotulo="Publicar nova versão"
            textoSalvo={
              alterado
                ? 'Falta o número da versão ou o texto mínimo'
                : 'Nada mudou em relação ao texto em vigor'
            }
          />
        </form>
      ) : null}

      {/* ── histórico ────────────────────────────────────── */}
      <PainelCartao
        titulo="Histórico de versões"
        descricao="Publicar não apaga: os aceites antigos continuam apontando para a versão que a pessoa leu."
        icone="clock"
        semPadding
      >
        {carregando ? (
          <ListaEsqueleto />
        ) : versoes.length ? (
          <ul className={styles.historico}>
            {versoes.map((versao) => (
              <li key={versao.id} className={styles.versaoLinha}>
                <span className={styles.selo}>{versao.versao}</span>

                <div className={styles.documentoTexto}>
                  <strong>{versao.titulo || rotuloDoTipo(versao.tipo)}</strong>

                  <span className={styles.quando}>
                    {rotuloDoTipo(versao.tipo)} · em vigor de{' '}
                    {formatarData(versao.vigenteDe)}
                    {versao.vigenteAte ? ` até ${formatarData(versao.vigenteAte)}` : ''} ·
                    publicado por {versao.publicadoPor?.nome || 'implantação do sistema'}
                  </span>

                  {versao.resumoMudancas ? (
                    <p className={styles.resumo}>“{versao.resumoMudancas}”</p>
                  ) : null}
                </div>

                {versao.vigente ? (
                  <AdminEtiqueta tom="ok" ponto>
                    Em vigor
                  </AdminEtiqueta>
                ) : (
                  <AdminEtiqueta tom="neutro">Substituída</AdminEtiqueta>
                )}

                {/* o hash é o que prova que o texto aceito é o texto no ar */}
                <code className={styles.hash} title={versao.hashConteudo || ''}>
                  {(versao.hashConteudo || '').slice(0, 10)}
                </code>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.vazio}>Nenhuma versão publicada ainda.</p>
        )}
      </PainelCartao>

      <AdminAcaoModal
        acao={acao}
        motivos={MOTIVOS}
        onFechar={() => setAcao(null)}
        onConfirmar={publicar}
      />
    </>
  );
}
