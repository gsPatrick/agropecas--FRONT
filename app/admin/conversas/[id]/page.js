'use client';

/**
 * Administração → conversas de uma pessoa.
 *
 * Segundo passo do fluxo: escolhida a conta em `/admin/conversas`, aqui estão
 * as conversas dela — e o conteúdo só aparece quando uma é aberta.
 *
 * A ordem importa. Abrir direto num apanhado de todas as conversas da
 * plataforma faria a leitura de mensagem alheia começar por acidente, no
 * primeiro item que estivesse no topo. Passando pela escolha da conta, ler
 * vira uma decisão em dois tempos: **de quem** e **qual** — e as duas ficam
 * registradas na auditoria.
 *
 * ⚠️ Diferenças reais em relação ao mock:
 *  · **Abrir exige motivo.** `GET /admin/conversas/:id` recusa sem um texto
 *    de 10+ caracteres (`admin.comunidade.conversas.service.js` §4) — não é
 *    fricção de UI, é a API. O motivo é pedido pelo mesmo modal usado em
 *    sanção de usuário (`AdminAcaoModal`), reaproveitado com seus próprios
 *    textos.
 *  · **Sem remoção de mensagem.** A API tem essa capacidade
 *    (`DELETE /admin/mensagens/:id`), mas sob outra permissão
 *    (`mensagem.remover`) — esta tela é oversight só-leitura.
 *  · **Sem ficha de cadastro embutida.** O cabeçalho da pessoa vem só do que
 *    a própria conversa carrega (nome, tipo, foto); a ficha completa é
 *    `/admin/usuarios/:id`, um clique adiante.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminEtiqueta from '@/components/AdminEtiqueta/AdminEtiqueta';
import AdminAcaoModal from '@/components/AdminAcaoModal/AdminAcaoModal';
import Input from '@/components/Input/Input';
import Icon from '@/components/Icon/Icon';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import { listarConversas, obterConversa } from '@/lib/dados/admin-conversas';
import { TIPOS_PERFIL } from '@/lib/dados/admin-usuarios';
import styles from './page.module.css';

const MOTIVOS = [
  'Mensagem com dado de contato para negociar fora da plataforma',
  'Conteúdo ofensivo relatado em denúncia',
  'Pedido de adiantamento com indício de golpe',
];

export default function ConversasDaPessoaPage() {
  const { id } = useParams();
  const aviso = useAviso();

  const [base, setBase] = useState(null);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState('');
  const [abertaId, setAbertaId] = useState(null);
  const [leitura, setLeitura] = useState(null);
  const [carregandoLeitura, setCarregandoLeitura] = useState(false);
  const [acao, setAcao] = useState(null);

  useEffect(() => {
    if (!id) return;
    const controlador = new AbortController();

    listarConversas({ usuarioId: id, sinal: controlador.signal })
      .then(({ itens }) => setBase(itens))
      .catch((e) => {
        if (e.name !== 'AbortError') setErro(e.message || 'Não foi possível carregar as conversas.');
      });

    return () => controlador.abort();
  }, [id]);

  /* a pessoa desta tela não tem rota própria (só a conversa carrega os dois
     lados) — os dados do cabeçalho vêm da primeira conversa encontrada */
  const pessoa = useMemo(() => {
    if (!base?.length) return null;
    const primeira = base[0];
    return primeira.anunciante?.id === id ? primeira.anunciante : primeira.interessado;
  }, [base, id]);

  if (base && !pessoa) {
    return (
      <div className={styles.semSelecao}>
        <p className={styles.semTitulo}>{erro ? 'Não foi possível carregar' : 'Usuário sem conversas'}</p>
        <Link href="/admin/conversas" className={styles.atalho}>
          <Icon name="chevron-left" size={14} />
          Voltar à escolha
        </Link>
      </div>
    );
  }

  const termo = busca.trim().toLowerCase();

  const lista = (base || []).filter((conversa) =>
    termo
      ? (conversa.anuncio?.titulo || '').toLowerCase().includes(termo) ||
        (conversa.anunciante?.nome || '').toLowerCase().includes(termo) ||
        (conversa.interessado?.nome || '').toLowerCase().includes(termo)
      : true
  );

  const denunciadas = (base || []).filter((conversa) => conversa.denunciasAbertas > 0).length;

  /** quem é a outra ponta desta conversa, do ponto de vista de quem foi escolhido */
  const outraPonta = (conversa) =>
    conversa.anunciante?.id === id ? conversa.interessado : conversa.anunciante;

  function pedirMotivo(conversa) {
    setAcao({
      id: `abrir-${conversa.id}`,
      conversa,
      titulo: 'Abrir conversa',
      descricao: 'A leitura fica registrada na auditoria, em nome do titular dos dados.',
      confirmar: 'Abrir e ler',
      destrutiva: false,
    });
  }

  async function confirmarAbertura({ motivo }) {
    const conversa = acao.conversa;
    setAcao(null);
    setAbertaId(conversa.id);
    setCarregandoLeitura(true);

    try {
      const resultado = await obterConversa(conversa.id, { motivo });
      setLeitura(resultado);
      aviso.info('Leitura registrada na auditoria.');
    } catch (e) {
      aviso.erro(e.message || 'Não foi possível abrir a conversa.');
      setAbertaId(null);
    } finally {
      setCarregandoLeitura(false);
    }
  }

  const aberta = abertaId ? lista.find((c) => c.id === abertaId) || base?.find((c) => c.id === abertaId) : null;

  return (
    <>
      <header className={styles.topo}>
        <Link href="/admin/conversas" className={styles.voltar} aria-label="Voltar à escolha">
          <Icon name="chevron-left" size={18} />
        </Link>

        <span className={styles.avatarTopo}>{pessoa?.iniciais || '…'}</span>

        <div className={styles.identidade}>
          <h1 className={styles.titulo}>Conversas de {pessoa?.nome || '…'}</h1>
          <p className={styles.descricao}>
            {pessoa ? `${TIPOS_PERFIL[pessoa.tipo] || 'Usuário'} · ` : ''}
            {base ? `${base.length} conversa(s)` : 'Carregando…'}
            {denunciadas ? ` · ${denunciadas} ligada(s) a denúncia` : ''}
          </p>
        </div>

        <div className={styles.atalhos}>
          <Link href={`/admin/usuarios/${id}`} className={styles.atalho}>
            <Icon name="user" size={14} />
            Ficha
          </Link>
        </div>
      </header>

      <div className={styles.aviso}>
        <Icon name="eye-off" size={16} />
        <span>
          Conversas são dados pessoais. Abrir uma registra a leitura na auditoria
          com o seu nome, a data e o motivo do acesso.
        </span>
      </div>

      <div className={styles.grade}>
        {/* ── conversas da pessoa ──────────────────────── */}
        <div className={styles.quadro}>
          <div className={styles.buscaLinha}>
            <div className={styles.campoBusca}>
              <Input
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Anúncio ou pessoa"
                iconLeft="search"
                aria-label="Buscar nesta lista"
              />
            </div>
          </div>

          {!base ? (
            <p className={styles.vazio}>Carregando…</p>
          ) : lista.length ? (
            <ul className={styles.lista}>
              {lista.map((conversa) => {
                const outro = outraPonta(conversa);

                return (
                  <li key={conversa.id} className={styles.item}>
                    <button
                      type="button"
                      className={`${styles.conversa} ${
                        conversa.id === abertaId ? styles.conversaAtiva : ''
                      }`}
                      onClick={() => pedirMotivo(conversa)}
                    >
                      <span className={styles.avatar}>{outro?.iniciais}</span>

                      <span className={styles.texto}>
                        <strong className={styles.nomes}>{outro?.nome}</strong>

                        <span className={styles.sobre}>
                          <Icon name="image" size={11} />
                          {conversa.anuncio?.titulo}
                        </span>

                        <span className={styles.rodapeItem}>
                          {conversa.anunciante?.id === id ? 'anunciante' : 'interessado'} ·{' '}
                          {conversa.totalMensagens} mensagens
                        </span>
                      </span>

                      {conversa.denunciasAbertas ? (
                        <AdminEtiqueta tom="perigo">Denúncia</AdminEtiqueta>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={styles.vazio}>
              {base.length ? 'Nenhuma conversa com esse termo.' : 'Esta conta ainda não tem conversas.'}
            </p>
          )}
        </div>

        {/* ── leitura ──────────────────────────────────── */}
        <div className={styles.painel}>
          {carregandoLeitura ? (
            <p className={styles.vazio}>Abrindo conversa…</p>
          ) : aberta && leitura ? (
            <>
              <header className={styles.cabecalho}>
                <div className={styles.cabecalhoTexto}>
                  <strong>{aberta.anuncio?.titulo}</strong>
                  <span>
                    <Link href={`/admin/usuarios/${aberta.anunciante?.id}`}>
                      {aberta.anunciante?.nome}
                    </Link>
                    {' e '}
                    <Link href={`/admin/usuarios/${aberta.interessado?.id}`}>
                      {aberta.interessado?.nome}
                    </Link>
                  </span>
                </div>

                {aberta.anuncio?.id ? (
                  <Link href={`/admin/anuncios/${aberta.anuncio.id}`} className={styles.verAnuncio}>
                    Ver anúncio
                    <Icon name="chevron-right" size={13} />
                  </Link>
                ) : null}
              </header>

              <div className={styles.fio}>
                {leitura.mensagens.map((mensagem) => (
                  <div
                    key={mensagem.id}
                    className={`${styles.balao} ${
                      mensagem.remetenteId === aberta.anunciante?.id ? styles.balaoDono : ''
                    }`}
                  >
                    <span className={styles.quem}>
                      {mensagem.remetenteId === aberta.anunciante?.id
                        ? aberta.anunciante?.nome
                        : aberta.interessado?.nome}
                    </span>

                    {mensagem.removida ? (
                      <p className={styles.removida}>
                        <Icon name="trash" size={12} />
                        Mensagem removida
                      </p>
                    ) : (
                      <p className={styles.mensagem}>{mensagem.conteudo}</p>
                    )}

                    <span className={styles.linhaBalao}>
                      <span className={styles.hora}>
                        {mensagem.criadoEm ? new Date(mensagem.criadoEm).toLocaleString('pt-BR') : ''}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.semSelecao}>
              <span className={styles.semIcone}>
                <Icon name="mail" size={22} />
              </span>
              <p className={styles.semTitulo}>Escolha uma conversa</p>
              <p className={styles.semTexto}>
                O conteúdo só aparece ao abrir — e a leitura fica registrada.
              </p>
            </div>
          )}
        </div>
      </div>

      <AdminAcaoModal acao={acao} motivos={MOTIVOS} onFechar={() => setAcao(null)} onConfirmar={confirmarAbertura} />
    </>
  );
}
