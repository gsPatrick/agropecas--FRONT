'use client';

/**
 * Favoritos — os contatos que a pessoa quis guardar.
 *
 * É uma agenda, não uma caixa de entrada: a unidade aqui é a PESSOA, com o
 * resumo do que já foi tratado com ela. Quem marcou a mecânica quer achar a
 * mecânica; a conversa específica é o passo seguinte, na página do contato.
 *
 * Por isso a linha mostra quantas negociações estão de pé e quantas já viraram
 * histórico — é o que decide se vale abrir agora.
 *
 * ⚠️ "Favoritar" aqui é favoritar uma PESSOA (contato), não um anúncio — a
 * API não tem essa tabela ainda (só `favoritos` de anúncio existe,
 * `GET/POST/DELETE /favoritos/:anuncioId`). Por isso `useFavoritos` continua
 * no `sessionStorage` (ver `lib/favoritos.js`); o que mudou é que agora ele
 * guarda um `pessoaId` de verdade, vindo da conversa real.
 */

import { useState } from 'react';
import Link from 'next/link';
import PainelTopo from '@/components/PainelTopo/PainelTopo';
import PainelCartao from '@/components/PainelCartao/PainelCartao';
import Field from '@/components/Field/Field';
import Input from '@/components/Input/Input';
import Icon from '@/components/Icon/Icon';
import Dica from '@/components/Dica/Dica';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import { useSessao, PERFIS } from '@/lib/sessao';
import { useFavoritos } from '@/lib/favoritos';
import { useChat } from '@/components/ChatProvider/ChatProvider';
import styles from './page.module.css';

/** "Carlos Menezes" → "CM" */
function iniciais(nome = '') {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/** agrupa conversas por pessoa — uma pessoa pode ter conversado sobre
    vários anúncios, e a tela de favoritos fala de PESSOA, não de conversa */
function agruparPorPessoa(conversas) {
  const mapa = new Map();

  conversas.forEach((conversa) => {
    if (!conversa.pessoaId) return;

    if (!mapa.has(conversa.pessoaId)) {
      mapa.set(conversa.pessoaId, {
        pessoaId: conversa.pessoaId,
        pessoa: conversa.pessoa,
        pessoaTipo: conversa.pessoaTipo,
        naoLidas: 0,
        ativas: [],
        encerradas: [],
      });
    }

    const grupo = mapa.get(conversa.pessoaId);
    grupo.naoLidas += conversa.naoLidas || 0;
    (conversa.anuncio?.status === 'publicado' ? grupo.ativas : grupo.encerradas).push(conversa);
  });

  return [...mapa.values()];
}

export default function FavoritosPage() {
  const { perfil, usuario } = useSessao();
  const { favoritos, alternar } = useFavoritos();
  const { conversas } = useChat();
  const aviso = useAviso();

  const [busca, setBusca] = useState('');

  if (!usuario) return null;

  const contatos = agruparPorPessoa(conversas).filter((contato) =>
    favoritos.includes(contato.pessoaId)
  );

  const termo = busca.trim().toLowerCase();

  const lista = contatos.filter((contato) =>
    termo
      ? contato.pessoa.toLowerCase().includes(termo) ||
        [...contato.ativas, ...contato.encerradas].some((conversa) =>
          conversa.anuncio.titulo.toLowerCase().includes(termo)
        )
      : true
  );

  function remover(contato) {
    alternar(contato.pessoaId);
    aviso.sucesso(`${contato.pessoa} saiu dos favoritos.`, {
      /* desfazer aqui não é luxo: o coração é um alvo pequeno e o item some da
         lista no mesmo instante — sem volta, o toque errado custa o contato */
      acao: { rotulo: 'Desfazer', executar: () => alternar(contato.pessoaId) },
    });
  }

  return (
    <>
      <PainelTopo
        perfil={perfil}
        titulo="Favoritos"
        descricao={
          contatos.length
            ? `${contatos.length} contato(s) guardado(s)`
            : 'Contatos que você marcou nas mensagens'
        }
      />

      {contatos.length ? (
        <div className={styles.busca}>
          <Field label="Buscar" htmlFor="busca-favorito">
            <Input
              id="busca-favorito"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Nome do contato ou anúncio"
            />
          </Field>
        </div>
      ) : null}

      <PainelCartao semPadding permiteEstouro>
        {lista.length ? (
          <ul className={styles.lista}>
            {lista.map((contato) => (
              <li key={contato.pessoaId} className={styles.item}>
                <Link href={`/painel/favoritos/${contato.pessoaId}`} className={styles.contato}>
                  <span className={styles.avatar}>{iniciais(contato.pessoa)}</span>

                  <span className={styles.texto}>
                    <span className={styles.linhaTopo}>
                      <strong className={styles.nome}>{contato.pessoa}</strong>
                      {contato.naoLidas > 0 ? (
                        <span className={styles.contador}>{contato.naoLidas}</span>
                      ) : null}
                    </span>

                    {contato.pessoaTipo ? (
                      <span className={styles.origem}>{PERFIS[contato.pessoaTipo]?.rotulo}</span>
                    ) : null}

                    <span className={styles.resumo}>
                      {contato.ativas.length ? (
                        <span className={styles.marcaAtiva}>
                          <Icon name="check" size={11} />
                          {contato.ativas.length} em negociação
                        </span>
                      ) : null}

                      {contato.encerradas.length ? (
                        <span className={styles.marcaHistorico}>
                          <Icon name="clock" size={11} />
                          {contato.encerradas.length} no histórico
                        </span>
                      ) : null}
                    </span>
                  </span>

                  <Icon name="chevron-right" size={16} className={styles.seta} />
                </Link>

                <Dica texto="Tirar dos favoritos" alinhamento="fim" className={styles.dicaTirar}>
                  <button
                    type="button"
                    className={styles.tirar}
                    onClick={() => remover(contato)}
                    aria-label={`Tirar ${contato.pessoa} dos favoritos`}
                  >
                    <Icon name="heart" size={17} />
                  </button>
                </Dica>
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.vazio}>
            <span className={styles.vazioIcone}>
              <Icon name="heart" size={22} />
            </span>

            <p className={styles.vazioTitulo}>
              {contatos.length ? 'Nenhum contato com esse nome' : 'Nenhum favorito ainda'}
            </p>

            <p className={styles.vazioTexto}>
              {contatos.length
                ? 'Tente outro termo — a busca olha o nome do contato e o título do anúncio.'
                : 'Nas mensagens, toque no coração de quem você quer achar rápido depois. Fica tudo aqui.'}
            </p>

            {!contatos.length ? (
              <Link href="/painel/mensagens" className={styles.vazioAcao}>
                <Icon name="mail" size={15} />
                Ir para mensagens
              </Link>
            ) : null}
          </div>
        )}
      </PainelCartao>
    </>
  );
}
