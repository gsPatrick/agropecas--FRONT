'use client';

/**
 * /admin/pagamentos — contas do Mercado Pago que recebem as vendas.
 *
 * A cliente começa numa conta de pessoa física e migra para CNPJ. Aqui ela
 * guarda quantas contas quiser e escolhe UMA ativa; a troca vale só para as
 * compras novas (cada pedido lembra a conta em que foi pago).
 *
 * O Access Token nunca volta da API em claro: ao editar, o campo vem vazio e
 * só é enviado se a pessoa digitar um novo.
 */

import { useCallback, useEffect, useState } from 'react';
import AdminEtiqueta from '@/components/AdminEtiqueta/AdminEtiqueta';
import GuiaMercadoPago from '@/components/GuiaMercadoPago/GuiaMercadoPago';
import PainelSegmentos from '@/components/PainelSegmentos/PainelSegmentos';
import Modal from '@/components/Modal/Modal';
import Button from '@/components/Button/Button';
import Field from '@/components/Field/Field';
import Input from '@/components/Input/Input';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import {
  listarContasMp,
  criarContaMp,
  editarContaMp,
  testarContaMp,
  ativarContaMp,
  removerContaMp,
  TIPOS_PESSOA,
  MODOS,
} from '@/lib/dados/admin-pagamentos';
import { dataCurta } from '@/lib/dados/pedidos';
import styles from './page.module.css';

const FORMULARIO_VAZIO = {
  apelido: '',
  tipoPessoa: 'fisica',
  modo: 'producao',
  accessToken: '',
  publicKey: '',
  webhookSecret: '',
};

const rotuloDe = (lista, id) => lista.find((item) => item.id === id)?.rotulo.split(' (')[0] || id;

export default function AdminPagamentosPage() {
  const aviso = useAviso();
  const [contas, setContas] = useState(null);
  const [meta, setMeta] = useState({});
  const [formulario, setFormulario] = useState(null); /* { id?, ...campos } */
  const [salvando, setSalvando] = useState(false);
  const [ocupada, setOcupada] = useState('');
  const [confirmando, setConfirmando] = useState(null); /* { tipo, conta } */

  const carregar = useCallback(
    (sinal) =>
      listarContasMp({ sinal })
        .then(({ dados, meta: m }) => {
          setContas(dados);
          setMeta(m);
        })
        .catch((erro) => {
          if (erro.name === 'AbortError') return;
          setContas([]);
          aviso.erro(erro.message);
        }),
    [aviso]
  );

  useEffect(() => {
    const controle = new AbortController();
    carregar(controle.signal);
    return () => controle.abort();
  }, [carregar]);

  const ativa = contas?.find((conta) => conta.ativa);
  const editando = Boolean(formulario?.id);

  function abrirNova() {
    setFormulario({ ...FORMULARIO_VAZIO });
  }

  function abrirEdicao(conta) {
    setFormulario({
      id: conta.id,
      apelido: conta.apelido,
      tipoPessoa: conta.tipoPessoa,
      modo: conta.modo,
      accessToken: '',
      publicKey: conta.publicKey || '',
      webhookSecret: '',
    });
  }

  const mudar = (campo) => (evento) => setFormulario((atual) => ({ ...atual, [campo]: evento.target.value }));

  async function salvar(evento) {
    evento.preventDefault();
    setSalvando(true);
    try {
      const { id, ...campos } = formulario;
      /* na edição, token e segredo vazios significam "manter o que está" */
      const corpo = Object.fromEntries(
        Object.entries(campos).filter(([chave, valor]) => (id ? valor !== '' || chave === 'publicKey' : valor !== ''))
      );
      if (id) {
        await editarContaMp(id, corpo);
        aviso.sucesso('Conta atualizada.');
      } else {
        await criarContaMp(corpo);
        aviso.sucesso('Conta cadastrada e conferida com o Mercado Pago.');
      }
      setFormulario(null);
      await carregar();
    } catch (erro) {
      aviso.erro(erro.message);
    } finally {
      setSalvando(false);
    }
  }

  async function executar(tipo, conta) {
    setConfirmando(null);
    setOcupada(`${tipo}-${conta.id}`);
    try {
      if (tipo === 'testar') {
        await testarContaMp(conta.id);
        aviso.sucesso(`Conexão ok — conta ${conta.apelido} respondeu ao Mercado Pago.`);
      } else if (tipo === 'ativar') {
        await ativarContaMp(conta.id);
        aviso.sucesso(`“${conta.apelido}” agora recebe os pagamentos novos.`);
      } else {
        await removerContaMp(conta.id);
        aviso.sucesso('Conta removida.');
      }
      await carregar();
    } catch (erro) {
      aviso.erro(erro.message);
    } finally {
      setOcupada('');
    }
  }

  return (
    <>
      <header className={styles.topo}>
        <div>
          <h1 className={styles.titulo}>Contas do Mercado Pago</h1>
          <p className={styles.descricao}>
            Cadastre as contas que podem receber os pagamentos e escolha qual está ativa. Trocar a conta ativa vale só
            para as compras novas.
          </p>
        </div>
        <Button iconLeft="plus" onClick={abrirNova}>
          Adicionar conta
        </Button>
      </header>

      <div className={`${styles.situacao} ${ativa || meta.usandoReserva ? styles.ok : styles.alerta}`} role="status">
        {ativa ? (
          <>
            <strong>Recebendo em:</strong> {ativa.apelido} ({rotuloDe(TIPOS_PESSOA, ativa.tipoPessoa)} ·{' '}
            {rotuloDe(MODOS, ativa.modo)}
            {ativa.mpEmail ? ` · ${ativa.mpEmail}` : ''})
          </>
        ) : meta.usandoReserva ? (
          <>
            <strong>Recebendo em:</strong> credenciais configuradas no servidor (.env). Cadastre uma conta abaixo para
            passar a gerenciá-la por aqui.
          </>
        ) : contas ? (
          <>
            <strong>Nenhuma conta ativa.</strong> O botão de compra fica indisponível no site até você ativar uma conta.
          </>
        ) : (
          'Carregando…'
        )}
      </div>

      <div className={styles.quadro}>
        {contas === null ? (
          <div className={styles.carregando}>
            <Esqueleto altura={54} raio={10} />
          </div>
        ) : contas.length ? (
          <ul className={styles.lista}>
            {contas.map((conta) => (
              <li key={conta.id} className={`${styles.conta} ${conta.ativa ? styles.contaAtiva : ''}`}>
                <div className={styles.contaTexto}>
                  <strong>
                    {conta.apelido}{' '}
                    {conta.ativa ? (
                      <AdminEtiqueta tom="ok" ponto>
                        Ativa
                      </AdminEtiqueta>
                    ) : null}
                  </strong>
                  <span className={styles.sub}>
                    {rotuloDe(TIPOS_PESSOA, conta.tipoPessoa)} · {rotuloDe(MODOS, conta.modo)}
                    {conta.mpEmail ? ` · ${conta.mpEmail}` : ''}
                  </span>
                  <span className={styles.sub}>
                    Token <code>{conta.accessTokenMascarado}</code> ·{' '}
                    {conta.temWebhookSecret ? 'webhook assinado' : <em className={styles.semSegredo}>sem assinatura do webhook</em>}
                  </span>
                  <span className={styles.sub}>
                    Conferida em {dataCurta(conta.verificadaEm)}
                    {conta.ativadaEm ? ` · ativada em ${dataCurta(conta.ativadaEm)}` : ''}
                  </span>
                </div>

                <div className={styles.acoes}>
                  {!conta.ativa ? (
                    <Button
                      size="sm"
                      variant="forest"
                      disabled={Boolean(ocupada)}
                      onClick={() => setConfirmando({ tipo: 'ativar', conta })}
                    >
                      {ocupada === `ativar-${conta.id}` ? 'Ativando…' : 'Ativar'}
                    </Button>
                  ) : null}
                  <Button size="sm" variant="outline" disabled={Boolean(ocupada)} onClick={() => executar('testar', conta)}>
                    {ocupada === `testar-${conta.id}` ? 'Testando…' : 'Testar conexão'}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={Boolean(ocupada)} onClick={() => abrirEdicao(conta)}>
                    Editar
                  </Button>
                  {!conta.ativa ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={Boolean(ocupada)}
                      onClick={() => setConfirmando({ tipo: 'remover', conta })}
                    >
                      Remover
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.vazio}>
            Nenhuma conta cadastrada ainda. Use o guia abaixo para pegar as credenciais e clique em “Adicionar conta”.
          </p>
        )}
      </div>

      <GuiaMercadoPago webhookUrl={meta.webhookUrl} onAdicionar={abrirNova} />

      <Modal
        open={Boolean(formulario)}
        onClose={() => (salvando ? null : setFormulario(null))}
        title={editando ? 'Editar conta' : 'Adicionar conta do Mercado Pago'}
        description={
          editando
            ? 'Deixe o Access Token e a assinatura em branco para manter os atuais.'
            : 'O Access Token é conferido com o Mercado Pago antes de salvar.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormulario(null)} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando || !formulario?.apelido.trim() || (!editando && !formulario?.accessToken.trim())}>
              {salvando ? 'Conferindo…' : editando ? 'Salvar' : 'Cadastrar'}
            </Button>
          </>
        }
      >
        {formulario ? (
          <form className={styles.formulario} onSubmit={salvar} autoComplete="off">
            <Field label="Apelido" htmlFor="mp-apelido" hint="Só para você reconhecer, ex.: “Conta da empresa (CNPJ)”" required>
              <Input id="mp-apelido" value={formulario.apelido} onChange={mudar('apelido')} maxLength={80} />
            </Field>

            <Field label="Tipo da conta">
              <PainelSegmentos
                opcoes={TIPOS_PESSOA}
                valor={formulario.tipoPessoa}
                onMudar={(valor) => setFormulario((atual) => ({ ...atual, tipoPessoa: valor }))}
                rotulo="Tipo da conta"
              />
            </Field>

            <Field label="Modo" hint="Teste não cobra de verdade; use Produção para vender">
              <PainelSegmentos
                opcoes={MODOS}
                valor={formulario.modo}
                onMudar={(valor) => setFormulario((atual) => ({ ...atual, modo: valor }))}
                rotulo="Modo"
              />
            </Field>

            <Field label="Access Token" htmlFor="mp-token" required={!editando} hint="Começa com APP_USR-">
              <Input
                id="mp-token"
                type="password"
                value={formulario.accessToken}
                onChange={mudar('accessToken')}
                placeholder={editando ? '•••••••• (manter o atual)' : 'APP_USR-…'}
                autoComplete="new-password"
              />
            </Field>

            <Field label="Public Key" htmlFor="mp-public" hint="Opcional no Checkout Pro">
              <Input id="mp-public" value={formulario.publicKey} onChange={mudar('publicKey')} placeholder="APP_USR-…" />
            </Field>

            <Field
              label="Assinatura secreta do webhook"
              htmlFor="mp-segredo"
              hint="Em Webhooks → Configurar notificações. Sem ela o sistema recusa os avisos de pagamento em produção."
            >
              <Input
                id="mp-segredo"
                type="password"
                value={formulario.webhookSecret}
                onChange={mudar('webhookSecret')}
                placeholder={editando ? '•••••••• (manter a atual)' : ''}
                autoComplete="new-password"
              />
            </Field>
          </form>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(confirmando)}
        onClose={() => setConfirmando(null)}
        title={confirmando?.tipo === 'ativar' ? `Ativar “${confirmando?.conta.apelido}”?` : `Remover “${confirmando?.conta.apelido}”?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmando(null)}>
              Cancelar
            </Button>
            <Button variant="forest" onClick={() => executar(confirmando.tipo, confirmando.conta)}>
              {confirmando?.tipo === 'ativar' ? 'Ativar conta' : 'Remover conta'}
            </Button>
          </>
        }
      >
        {confirmando?.tipo === 'ativar' ? (
          <ul className={styles.consequencias}>
            <li>As compras novas passam a cair nesta conta.</li>
            {ativa ? <li>“{ativa.apelido}” deixa de receber compras novas.</li> : null}
            <li>Pedidos já feitos continuam sendo conferidos e estornados na conta em que foram pagos.</li>
            <li>Confira se o webhook desta conta está configurado, ou o pedido só atualiza quando o comprador voltar ao site.</li>
          </ul>
        ) : (
          <ul className={styles.consequencias}>
            <li>A conta e as credenciais guardadas aqui são apagadas. Isso não apaga a conta no Mercado Pago.</li>
            <li>Só é possível se nenhum pedido em andamento depender dela.</li>
          </ul>
        )}
      </Modal>
    </>
  );
}
