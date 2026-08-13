'use client';

/**
 * Configurações → Seus dados (LGPD).
 *
 * Dois direitos que a lei garante: **levar seus dados embora** e **encerrar a
 * conta**. Os dois viraram fluxos reais (`src/features/lgpd`), não só toast:
 *
 *  · Baixar dados é PEDIDO EM DUAS ETAPAS, do jeito que a API exige — confirma
 *    a senha, a API manda um código por e-mail, o código abre uma solicitação
 *    formal (prazo legal de resposta). Não é download na hora: é o mesmo rito
 *    do art. 18 da LGPD, "pedido registrado, entregue dentro do prazo" — o
 *    texto do mock já dizia isso ("fica pronto em algumas horas"), só que
 *    agora é um pedido de verdade, não um toast.
 *  · Encerrar é IRREVERSÍVEL de verdade agora: `POST /lgpd/anonimizacao`
 *    apaga o cadastro. A palavra de confirmação mudou de "ENCERRAR" (só do
 *    mock) para a frase que a API exige.
 */

import { useState } from 'react';
import PainelCartao from '@/components/PainelCartao/PainelCartao';
import Modal from '@/components/Modal/Modal';
import Input from '@/components/Input/Input';
import Field from '@/components/Field/Field';
import Button from '@/components/Button/Button';
import Icon from '@/components/Icon/Icon';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import { useSessao } from '@/lib/sessao';
import {
  solicitarExportacao,
  confirmarExportacao,
  encerrarConta,
  CONFIRMACAO_ANONIMIZACAO,
} from '@/lib/dados/configuracoes';
import styles from './ConfigDados.module.css';

export default function ConfigDados() {
  const aviso = useAviso();
  const { sair } = useSessao();

  /* exportação: 'inicio' → pede senha; 'codigo' → pede o que chegou por e-mail */
  const [etapaExportacao, setEtapaExportacao] = useState(null);
  const [senhaExportacao, setSenhaExportacao] = useState('');
  const [codigoExportacao, setCodigoExportacao] = useState('');
  const [enviandoExportacao, setEnviandoExportacao] = useState(false);

  const [aberto, setAberto] = useState(false);
  const [confirmacao, setConfirmacao] = useState('');
  const [encerrando, setEncerrando] = useState(false);

  async function pedirCodigo(evento) {
    evento.preventDefault();
    if (!senhaExportacao) return;

    setEnviandoExportacao(true);
    try {
      await solicitarExportacao(senhaExportacao);
      setEtapaExportacao('codigo');
    } catch (erro) {
      aviso.erro(erro.message);
    } finally {
      setEnviandoExportacao(false);
    }
  }

  async function confirmarCodigo(evento) {
    evento.preventDefault();
    if (!codigoExportacao) return;

    setEnviandoExportacao(true);
    try {
      await confirmarExportacao(codigoExportacao);
      fecharExportacao();
      aviso.sucesso('Pedido registrado. Você recebe a confirmação por e-mail.');
    } catch (erro) {
      aviso.erro(erro.message);
    } finally {
      setEnviandoExportacao(false);
    }
  }

  function fecharExportacao() {
    setEtapaExportacao(null);
    setSenhaExportacao('');
    setCodigoExportacao('');
  }

  async function encerrar() {
    setEncerrando(true);
    try {
      await encerrarConta(confirmacao.trim());
      aviso.info('Conta encerrada. Sentiremos sua falta.');
      await sair();
    } catch (erro) {
      aviso.erro(erro.message);
      setEncerrando(false);
    }
  }

  return (
    <>
      <PainelCartao titulo="Baixar seus dados" icone="grid">
        <p className={styles.texto}>
          Um arquivo com seu cadastro, seus anúncios e o histórico de conversas.
          Fica pronto em algumas horas e chega no seu e-mail.
        </p>

        <Button type="button" variant="outline" iconLeft="arrow-right" onClick={() => setEtapaExportacao('inicio')}>
          Pedir meus dados
        </Button>
      </PainelCartao>

      <PainelCartao titulo="Encerrar conta" icone="trash">
        <div className={styles.perigo}>
          <Icon name="bell" size={17} />

          <div className={styles.perigoTexto}>
            <strong>Isto não tem volta.</strong>
            <span>
              Seus anúncios saem do ar na hora. As conversas ficam guardadas
              para a outra pessoa, sem seus dados de contato — é o que a lei
              exige e o que evita ela achar que foi bloqueada.
            </span>
          </div>
        </div>

        <Button type="button" variant="ghost" onClick={() => setAberto(true)}>
          Quero encerrar minha conta
        </Button>
      </PainelCartao>

      {/* ── exportar dados: senha → código ─────────────── */}
      <Modal
        open={Boolean(etapaExportacao)}
        onClose={fecharExportacao}
        title="Baixar seus dados"
        footer={
          <div className={styles.rodape}>
            <Button variant="ghost" onClick={fecharExportacao}>
              Cancelar
            </Button>

            {etapaExportacao === 'inicio' ? (
              <Button
                variant="primary"
                disabled={!senhaExportacao || enviandoExportacao}
                onClick={pedirCodigo}
              >
                {enviandoExportacao ? 'Enviando…' : 'Continuar'}
              </Button>
            ) : (
              <Button
                variant="primary"
                disabled={!codigoExportacao || enviandoExportacao}
                onClick={confirmarCodigo}
              >
                {enviandoExportacao ? 'Confirmando…' : 'Confirmar pedido'}
              </Button>
            )}
          </div>
        }
      >
        {etapaExportacao === 'inicio' ? (
          <Field label="Confirme sua senha" htmlFor="senha-exportacao" hint="É o que garante que o pedido é seu">
            <Input
              id="senha-exportacao"
              type="password"
              value={senhaExportacao}
              onChange={(evento) => setSenhaExportacao(evento.target.value)}
            />
          </Field>
        ) : (
          <Field
            label="Código enviado ao seu e-mail"
            htmlFor="codigo-exportacao"
            hint="Confirma que o pedido chegou até você, não só até a senha"
          >
            <Input
              id="codigo-exportacao"
              value={codigoExportacao}
              onChange={(evento) => setCodigoExportacao(evento.target.value)}
              placeholder="000000"
            />
          </Field>
        )}
      </Modal>

      {/* ── encerrar conta ──────────────────────────────── */}
      <Modal
        open={aberto}
        onClose={() => {
          setAberto(false);
          setConfirmacao('');
        }}
        title="Encerrar a conta"
        footer={
          <div className={styles.rodape}>
            <Button variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>

            <Button
              variant="primary"
              disabled={confirmacao.trim() !== CONFIRMACAO_ANONIMIZACAO || encerrando}
              onClick={encerrar}
            >
              {encerrando ? 'Encerrando…' : 'Encerrar definitivamente'}
            </Button>
          </div>
        }
      >
        <p className={styles.modalTexto}>
          Antes de seguir: seus anúncios saem do ar, seu perfil deixa de
          aparecer nas buscas e o acesso é encerrado em todos os aparelhos.
        </p>

        <Field
          label={`Digite "${CONFIRMACAO_ANONIMIZACAO}" para confirmar`}
          htmlFor="confirmacao"
          hint="A frase existe para o clique não ser acidental"
        >
          <Input
            id="confirmacao"
            value={confirmacao}
            onChange={(evento) => setConfirmacao(evento.target.value)}
            placeholder={CONFIRMACAO_ANONIMIZACAO}
          />
        </Field>
      </Modal>
    </>
  );
}
