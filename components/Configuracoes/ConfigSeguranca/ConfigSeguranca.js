'use client';

/**
 * Configurações → Segurança.
 *
 * Senha e **sessões abertas**. A lista de sessões é o que transforma "alguém
 * entrou na minha conta" de suspeita em ação: dá para ver de onde e encerrar.
 *
 * A sessão atual aparece primeiro e não pode ser encerrada por aqui —
 * derrubar a si mesmo pela lista tiraria a pessoa justamente da tela onde ela
 * está tentando se proteger. Para isso existe "sair", no menu do avatar.
 *
 * ⚠️ `local` (cidade) e `suspeito` (fora do padrão) saíram: a API não faz
 * geolocalização por IP — `GET /auth/sessoes` devolve dispositivo/plataforma/
 * quando, não de onde.
 */

import { useEffect, useState } from 'react';
import PainelCartao from '@/components/PainelCartao/PainelCartao';
import Field from '@/components/Field/Field';
import Input from '@/components/Input/Input';
import Button from '@/components/Button/Button';
import Icon from '@/components/Icon/Icon';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import {
  trocarSenha as trocarSenhaNaApi,
  carregarSessoes,
  encerrarSessao,
  encerrarOutrasSessoes,
} from '@/lib/dados/configuracoes';
import styles from './ConfigSeguranca.module.css';

const SENHA_VAZIA = { atual: '', nova: '', repetir: '' };

const MINUTO = 60000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

function haTempo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < MINUTO) return 'agora';
  if (diff < HORA) return `há ${Math.round(diff / MINUTO)} min`;
  if (diff < DIA) return `há ${Math.round(diff / HORA)} h`;
  return `há ${Math.round(diff / DIA)} dias`;
}

export default function ConfigSeguranca() {
  const aviso = useAviso();

  const [senha, setSenha] = useState(SENHA_VAZIA);
  const [enviandoSenha, setEnviandoSenha] = useState(false);
  const [sessoes, setSessoes] = useState(null);

  useEffect(() => {
    const controle = new AbortController();

    carregarSessoes({ sinal: controle.signal })
      .then(setSessoes)
      .catch((erro) => {
        if (erro.name !== 'AbortError') aviso.erro('Não foi possível carregar as sessões.');
      });

    return () => controle.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mudar = (chave) => (evento) =>
    setSenha((atual) => ({ ...atual, [chave]: evento.target.value }));

  async function trocarSenha(evento) {
    evento.preventDefault();

    if (senha.nova.length < 8) {
      aviso.erro('A nova senha precisa de pelo menos 8 caracteres.');
      return;
    }

    if (senha.nova !== senha.repetir) {
      aviso.erro('A confirmação não bate com a nova senha.');
      return;
    }

    setEnviandoSenha(true);
    try {
      await trocarSenhaNaApi(senha.atual, senha.nova);
      setSenha(SENHA_VAZIA);
      aviso.sucesso('Senha alterada.');
    } catch (erro) {
      aviso.erro(erro.message);
    } finally {
      setEnviandoSenha(false);
    }
  }

  async function encerrar(sessao) {
    try {
      await encerrarSessao(sessao.id);
      setSessoes((atual) => atual.filter((item) => item.id !== sessao.id));
      aviso.sucesso(`${sessao.dispositivo} foi desconectado.`);
    } catch (erro) {
      aviso.erro(erro.message);
    }
  }

  async function encerrarTodas() {
    try {
      await encerrarOutrasSessoes();
      setSessoes((atual) => atual.filter((sessao) => sessao.atual));
      aviso.sucesso('Todas as outras sessões foram encerradas.');
    } catch (erro) {
      aviso.erro(erro.message);
    }
  }

  const outras = (sessoes || []).filter((sessao) => !sessao.atual);

  return (
    <>
      <form onSubmit={trocarSenha}>
        <PainelCartao titulo="Senha" icone="check">
          <div className={styles.campos}>
            <Field label="Senha atual" htmlFor="atual">
              <Input id="atual" type="password" value={senha.atual} onChange={mudar('atual')} />
            </Field>

            <div className={styles.duplo}>
              <Field label="Nova senha" htmlFor="nova" hint="Ao menos 8 caracteres">
                <Input id="nova" type="password" value={senha.nova} onChange={mudar('nova')} />
              </Field>

              <Field label="Repetir a nova senha" htmlFor="repetir">
                <Input
                  id="repetir"
                  type="password"
                  value={senha.repetir}
                  onChange={mudar('repetir')}
                />
              </Field>
            </div>

            <div className={styles.acao}>
              <Button
                type="submit"
                iconLeft="check"
                disabled={!senha.atual || !senha.nova || enviandoSenha}
              >
                {enviandoSenha ? 'Alterando…' : 'Alterar senha'}
              </Button>
            </div>
          </div>
        </PainelCartao>
      </form>

      <PainelCartao
        titulo="Sessões abertas"
        descricao="Onde sua conta está conectada agora."
        icone="user"
        semPadding
      >
        {!sessoes ? (
          <div className={styles.carregando}>
            <Esqueleto altura={54} raio={10} />
            <Esqueleto altura={54} raio={10} />
          </div>
        ) : (
          <>
            <ul className={styles.sessoes}>
              {sessoes.map((sessao) => (
                <li key={sessao.id} className={styles.sessao}>
                  <span className={styles.icone}>
                    <Icon name={sessao.atual ? 'check' : 'user'} size={16} />
                  </span>

                  <div className={styles.sessaoTexto}>
                    <strong className={styles.dispositivo}>
                      {sessao.dispositivo}
                      {sessao.atual ? <span className={styles.aqui}>este aparelho</span> : null}
                    </strong>

                    <span className={styles.detalhe}>{haTempo(sessao.ultimaAtividadeEm)}</span>
                  </div>

                  {sessao.atual ? (
                    <span className={styles.atual}>Em uso</span>
                  ) : (
                    <button type="button" className={styles.encerrar} onClick={() => encerrar(sessao)}>
                      Encerrar
                    </button>
                  )}
                </li>
              ))}
            </ul>

            {outras.length ? (
              <div className={styles.rodape}>
                <Button type="button" variant="outline" iconLeft="logout" onClick={encerrarTodas}>
                  Encerrar todas as outras
                </Button>
              </div>
            ) : (
              <p className={styles.limpo}>
                Nenhuma outra sessão aberta. Só este aparelho está conectado.
              </p>
            )}
          </>
        )}
      </PainelCartao>
    </>
  );
}
