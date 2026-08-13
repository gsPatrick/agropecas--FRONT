'use client';

/**
 * Administração → Conversas (escolha da conta).
 *
 * Primeiro passo de dois: aqui se escolhe **de quem**; na tela seguinte, qual
 * conversa — e só então o conteúdo aparece.
 *
 * A etapa extra é de propósito. Uma lista única com as conversas de toda a
 * plataforma faria a leitura de mensagem alheia começar por acidente, no
 * primeiro item que estivesse no topo. Separando em dois tempos, ler passa a
 * ser uma decisão tomada duas vezes — e as duas ficam registradas.
 *
 * A lista mostra quantas conversas cada conta tem e quantas estão ligadas a
 * denúncia, que é o que decide por onde uma apuração começa.
 *
 * A API não tem uma rota "contas com conversa" — só `GET /admin/conversas`,
 * que devolve metadado sem conteúdo (ver `lib/dados/admin-conversas.js`).
 * Esta tela busca a lista inteira uma vez e agrupa por pessoa no cliente.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminEtiqueta from '@/components/AdminEtiqueta/AdminEtiqueta';
import PainelSegmentos from '@/components/PainelSegmentos/PainelSegmentos';
import Input from '@/components/Input/Input';
import Icon from '@/components/Icon/Icon';
import { listarConversas } from '@/lib/dados/admin-conversas';
import { TIPOS_PERFIL } from '@/lib/dados/admin-usuarios';
import styles from './page.module.css';

const ABAS = [
  { id: 'todos', rotulo: 'Com conversa' },
  { id: 'denunciadas', rotulo: 'Ligadas a denúncia' },
];

export default function AdminConversasPage() {
  const [aba, setAba] = useState('todos');
  const [busca, setBusca] = useState('');
  const [conversas, setConversas] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const controlador = new AbortController();

    listarConversas({ sinal: controlador.signal })
      .then(({ itens }) => setConversas(itens))
      .catch((e) => {
        if (e.name !== 'AbortError') setErro(e.message || 'Não foi possível carregar as conversas.');
      });

    return () => controlador.abort();
  }, []);

  /**
   * Uma linha por pessoa, com o resumo das conversas dela.
   *
   * Montado a partir das conversas e não da base de usuários: quem nunca
   * conversou não tem o que ler, e mostrar a conta vazia aqui daria uma lista
   * de mil e duzentos nomes para achar os poucos que importam.
   */
  const pessoas = useMemo(() => {
    if (!conversas) return [];

    const mapa = new Map();

    conversas.forEach((conversa) => {
      [conversa.anunciante, conversa.interessado].forEach((lado) => {
        if (!lado) return;

        const atual = mapa.get(lado.id) || {
          id: lado.id,
          nome: lado.nome,
          iniciais: lado.iniciais,
          tipo: lado.tipo,
          total: 0,
          denunciadas: 0,
          ultima: conversa.ultimaMensagemEm,
        };

        atual.total += 1;
        if (conversa.denunciasAbertas > 0) atual.denunciadas += 1;
        if (conversa.ultimaMensagemEm && (!atual.ultima || conversa.ultimaMensagemEm > atual.ultima)) {
          atual.ultima = conversa.ultimaMensagemEm;
        }

        mapa.set(lado.id, atual);
      });
    });

    return [...mapa.values()]
      /* quem tem denúncia primeiro, depois quem mais conversa: é a ordem em
         que uma apuração olharia */
      .sort((a, b) => b.denunciadas - a.denunciadas || b.total - a.total);
  }, [conversas]);

  const termo = busca.trim().toLowerCase();

  const lista = pessoas
    .filter((pessoa) => (aba === 'denunciadas' ? pessoa.denunciadas > 0 : true))
    .filter((pessoa) => (termo ? pessoa.nome.toLowerCase().includes(termo) : true));

  const contagens = {
    todos: pessoas.length,
    denunciadas: pessoas.filter((pessoa) => pessoa.denunciadas > 0).length,
  };

  return (
    <>
      <header className={styles.topo}>
        <div>
          <h1 className={styles.titulo}>Conversas</h1>
          <p className={styles.descricao}>
            Escolha de quem você quer ver as conversas.
          </p>
        </div>

        <div className={styles.campoBusca}>
          <Input
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Nome"
            iconLeft="search"
            aria-label="Buscar pessoa"
          />
        </div>
      </header>

      <div className={styles.aviso}>
        <Icon name="eye-off" size={16} />
        <span>
          Conversas são dados pessoais. Escolher uma conta ainda não mostra
          conteúdo — a leitura acontece ao abrir a conversa, e fica registrada
          na auditoria com o seu nome.
        </span>
      </div>

      <PainelSegmentos
        opcoes={ABAS}
        valor={aba}
        onMudar={setAba}
        contagens={contagens}
        rotulo="Filtro de contas"
      />

      <div className={styles.quadro}>
        {!conversas && !erro ? (
          <p className={styles.vazio}>Carregando…</p>
        ) : erro ? (
          <p className={styles.vazio}>{erro}</p>
        ) : lista.length ? (
          <ul className={styles.pessoas}>
            {lista.map((pessoa) => (
              <li key={pessoa.id} className={styles.item}>
                <Link href={`/admin/conversas/${pessoa.id}`} className={styles.pessoa}>
                  <span className={styles.avatar}>{pessoa.iniciais}</span>

                  <span className={styles.texto}>
                    <strong className={styles.nome}>{pessoa.nome}</strong>

                    <span className={styles.origem}>{TIPOS_PERFIL[pessoa.tipo] || 'Usuário'}</span>
                  </span>

                  <span className={styles.marcas}>
                    {/* gap: cidade e situação da conta não vêm no mapper de
                        parte da conversa (`conversa.mapper.js`) — só nome,
                        tipo, foto e verificação; ficha completa é outra rota */}
                    {pessoa.denunciadas ? (
                      <AdminEtiqueta tom="perigo">{pessoa.denunciadas} com denúncia</AdminEtiqueta>
                    ) : null}
                  </span>

                  <span className={styles.total}>
                    <strong>{pessoa.total}</strong>
                    conversa(s)
                  </span>

                  <Icon name="chevron-right" size={16} className={styles.seta} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.vazio}>Nenhuma conta com esses filtros.</p>
        )}
      </div>
    </>
  );
}
