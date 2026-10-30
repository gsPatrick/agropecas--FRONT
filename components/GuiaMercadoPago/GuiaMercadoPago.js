'use client';

/**
 * Guia passo a passo: como pegar as credenciais do Mercado Pago.
 *
 * Feito para quem nunca abriu o painel de desenvolvedores. Três cuidados:
 *
 *  · **Segue o caminho da pessoa.** "Já tenho conta" e "Vou usar uma conta
 *    nova (CNPJ)" têm passos diferentes no começo; trocar de aba troca a
 *    lista, e o progresso de cada caminho é guardado separado.
 *  · **Dá o que copiar.** URL do webhook e nome da aplicação têm botão de
 *    copiar — é onde mais se erra digitando.
 *  · **Diz onde cada valor cai.** O último passo mostra, lado a lado, o campo
 *    do Mercado Pago e o campo deste painel.
 *
 * O Mercado Pago muda nome de menu de tempos em tempos; o guia descreve o
 * caminho pelo que a pessoa procura na tela, e avisa disso no rodapé.
 */

import { useEffect, useState } from 'react';
import Icon from '@/components/Icon/Icon';
import Button from '@/components/Button/Button';
import PainelSegmentos from '@/components/PainelSegmentos/PainelSegmentos';
import styles from './GuiaMercadoPago.module.css';

const CAMINHOS = [
  { id: 'existente', rotulo: 'Já tenho a conta' },
  { id: 'nova', rotulo: 'Vou usar uma conta nova (CNPJ)' },
];

const CHAVE_PROGRESSO = 'agropecas:guia-mp';

/** passos que só existem para quem ainda vai criar a conta (CNPJ) */
const PASSOS_CONTA_NOVA = [
  {
    id: 'abrir-conta',
    titulo: 'Abra a conta Mercado Pago da empresa',
    texto: (
      <>
        Entre em <strong>mercadopago.com.br</strong>, clique em <strong>Criar conta</strong> e escolha{' '}
        <strong>Empresa / CNPJ</strong>. Use um e-mail que a empresa controle — ele será o login da conta que recebe o
        dinheiro das vendas.
      </>
    ),
    dica: 'Não dá para trocar o CPF por um CNPJ dentro da mesma conta: o caminho é criar uma conta nova para a empresa e cadastrá-la aqui.',
  },
  {
    id: 'validar-conta',
    titulo: 'Conclua a validação da conta',
    texto: (
      <>
        O Mercado Pago pede dados da empresa, do responsável e uma conta bancária para receber os saques. Enquanto a
        validação não terminar, a conta pode não liberar as <strong>credenciais de produção</strong>.
      </>
    ),
  },
];

const PASSOS_COMUNS = [
  {
    id: 'abrir-painel',
    titulo: 'Abra o painel de desenvolvedores',
    texto: (
      <>
        Acesse <strong>mercadopago.com.br/developers/panel/app</strong> logado na conta que vai receber os pagamentos.
        Confira o e-mail no canto da tela: as credenciais pertencem à conta em que você está logado.
      </>
    ),
    link: { href: 'https://www.mercadopago.com.br/developers/panel/app', rotulo: 'Abrir o painel do Mercado Pago' },
  },
  {
    id: 'criar-aplicacao',
    titulo: 'Crie uma aplicação',
    texto: (
      <>
        Clique em <strong>Criar aplicação</strong>. Dê um nome, escolha <strong>Pagamentos online</strong> e, no modelo
        de integração, <strong>Checkout Pro</strong>. Se a conta já tiver uma aplicação para este site, abra-a em vez de
        criar outra.
      </>
    ),
    copiar: { rotulo: 'Nome sugerido', valor: 'AgroPeças MT' },
  },
  {
    id: 'credenciais',
    titulo: 'Pegue a Public Key e o Access Token',
    texto: (
      <>
        Dentro da aplicação, abra <strong>Credenciais de produção</strong> (no menu lateral). Ative-as se o Mercado Pago
        pedir. Copie a <strong>Public Key</strong> e o <strong>Access Token</strong> — o Access Token começa com{' '}
        <code>APP_USR-</code>.
      </>
    ),
    dica: 'O Access Token é a chave da sua conta: quem tem acesso a ele cria cobranças em seu nome. Cole-o só aqui, nunca em conversa ou e-mail.',
  },
  {
    id: 'webhook',
    titulo: 'Configure o aviso de pagamento (webhook)',
    texto: (
      <>
        Na aplicação, abra <strong>Webhooks → Configurar notificações</strong>. No modo <strong>Produção</strong>, cole a
        URL abaixo, marque o evento <strong>Pagamentos</strong> e salve. Depois do salvamento o Mercado Pago mostra a{' '}
        <strong>assinatura secreta</strong>: copie-a.
      </>
    ),
    copiarWebhook: true,
    dica: 'Sem o webhook o sistema não fica sabendo que o comprador pagou — o pedido só se atualiza quando o comprador volta ao site.',
  },
  {
    id: 'cadastrar',
    titulo: 'Cadastre a conta aqui e ative',
    texto: (
      <>
        Clique em <strong>Adicionar conta</strong> nesta página e cole os valores nos campos correspondentes (tabela
        abaixo). O sistema confere o Access Token com o Mercado Pago antes de salvar. Depois, use{' '}
        <strong>Ativar</strong> para que as próximas compras caiam nesta conta.
      </>
    ),
    tabela: true,
  },
];

const CAMPOS = [
  ['Public Key', 'Public Key', 'Começa com APP_USR-'],
  ['Access Token', 'Access Token', 'Começa com APP_USR-; é longo, copie inteiro'],
  ['Assinatura secreta (Webhooks)', 'Assinatura secreta do webhook', '64 letras e números'],
];

const PERGUNTAS = [
  {
    p: 'E os pedidos que já estão em andamento quando eu troco de conta?',
    r: 'Continuam na conta em que foram pagos. O sistema lembra de qual conta veio cada pagamento e usa a mesma para conferir e estornar. Só as compras novas passam a cair na conta ativa. Por isso, não apague a conta antiga enquanto houver pedido em andamento nela — o sistema nem deixa.',
  },
  {
    p: 'Qual a diferença entre credencial de teste e de produção?',
    r: 'Teste não cobra de verdade: serve para ver o fluxo funcionando com cartões de mentira. Produção movimenta dinheiro real. Cadastre a conta de teste com o modo "Teste" para não confundir, e deixe ativa a de produção quando o site estiver no ar.',
  },
  {
    p: 'Posso ter as duas contas cadastradas?',
    r: 'Pode ter quantas quiser, mas só uma fica ativa. Dá para manter a conta antiga cadastrada enquanto os últimos pedidos dela se resolvem, e ativar a do CNPJ já para as vendas novas.',
  },
  {
    p: 'O sistema disse que o Access Token foi recusado.',
    r: 'Quase sempre é cópia incompleta (faltou um pedaço no fim) ou espaço no começo. Copie de novo pelo botão de copiar do Mercado Pago. Se for conta nova, confira se as credenciais de produção já foram ativadas.',
  },
  {
    p: 'Onde o dinheiro cai?',
    r: 'Na conta Mercado Pago que estiver ativa na hora da compra. O repasse aos vendedores continua sendo feito por PIX a partir do saldo dessa conta.',
  },
];

function ler() {
  try {
    return JSON.parse(window.localStorage.getItem(CHAVE_PROGRESSO) || '{}');
  } catch {
    return {};
  }
}

function guardar(valor) {
  try {
    window.localStorage.setItem(CHAVE_PROGRESSO, JSON.stringify(valor));
  } catch {
    /* modo anônimo ou armazenamento bloqueado: o guia funciona sem lembrar */
  }
}

export default function GuiaMercadoPago({ webhookUrl, onAdicionar }) {
  const [caminho, setCaminho] = useState('existente');
  const [feitos, setFeitos] = useState({});
  const [aberto, setAberto] = useState(null);
  const [copiado, setCopiado] = useState('');
  const [pergunta, setPergunta] = useState(null);

  useEffect(() => {
    setFeitos(ler());
  }, []);

  const passos = caminho === 'nova' ? [...PASSOS_CONTA_NOVA, ...PASSOS_COMUNS] : PASSOS_COMUNS;
  const chave = (id) => `${caminho}:${id}`;
  const concluidos = passos.filter((passo) => feitos[chave(passo.id)]).length;
  const primeiroPendente = passos.find((passo) => !feitos[chave(passo.id)])?.id;
  /* sem passo escolhido à mão, o guia abre sozinho no próximo a fazer */
  const emFoco = aberto && passos.some((passo) => passo.id === aberto) ? aberto : primeiroPendente;

  function marcar(id) {
    const proximo = { ...feitos, [chave(id)]: !feitos[chave(id)] };
    setFeitos(proximo);
    guardar(proximo);
    setAberto(null);
  }

  function recomecar() {
    const proximo = Object.fromEntries(Object.entries(feitos).filter(([k]) => !k.startsWith(`${caminho}:`)));
    setFeitos(proximo);
    guardar(proximo);
    setAberto(null);
  }

  async function copiar(texto, id) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(id);
      setTimeout(() => setCopiado(''), 1800);
    } catch {
      /* sem permissão de área de transferência: o valor continua visível para copiar à mão */
    }
  }

  return (
    <section className={styles.root} aria-labelledby="guia-mp-titulo">
      <header className={styles.topo}>
        <div>
          <h2 id="guia-mp-titulo" className={styles.titulo}>
            Como conseguir as credenciais do Mercado Pago
          </h2>
          <p className={styles.sub}>Siga na ordem. Marque cada passo quando terminar — o guia lembra onde você parou.</p>
        </div>
        <PainelSegmentos opcoes={CAMINHOS} valor={caminho} onMudar={setCaminho} rotulo="Situação da conta" />
      </header>

      <div className={styles.progresso} role="progressbar" aria-valuemin={0} aria-valuemax={passos.length} aria-valuenow={concluidos}>
        <div className={styles.barra}>
          <span style={{ width: `${(concluidos / passos.length) * 100}%` }} />
        </div>
        <span className={styles.progressoTexto}>
          {concluidos === passos.length ? 'Tudo pronto' : `${concluidos} de ${passos.length} passos`}
        </span>
        {concluidos > 0 ? (
          <button type="button" className={styles.link} onClick={recomecar}>
            Recomeçar
          </button>
        ) : null}
      </div>

      <ol className={styles.passos}>
        {passos.map((passo, indice) => {
          const feito = Boolean(feitos[chave(passo.id)]);
          const aberta = emFoco === passo.id;

          return (
            <li key={passo.id} className={`${styles.passo} ${feito ? styles.feito : ''} ${aberta ? styles.aberto : ''}`}>
              <button
                type="button"
                className={styles.cabecalho}
                aria-expanded={aberta}
                onClick={() => setAberto(aberta ? '__nenhum__' : passo.id)}
              >
                <span className={styles.numero} aria-hidden="true">
                  {feito ? <Icon name="check" size={14} /> : indice + 1}
                </span>
                <span className={styles.passoTitulo}>{passo.titulo}</span>
                {feito ? <span className={styles.selo}>Feito</span> : null}
              </button>

              {aberta ? (
                <div className={styles.corpo}>
                  <p>{passo.texto}</p>

                  {passo.link ? (
                    <a className={styles.externo} href={passo.link.href} target="_blank" rel="noopener noreferrer">
                      {passo.link.rotulo} ↗
                    </a>
                  ) : null}

                  {passo.copiar ? (
                    <div className={styles.copiar}>
                      <span>{passo.copiar.rotulo}</span>
                      <code>{passo.copiar.valor}</code>
                      <Button size="sm" variant="outline" onClick={() => copiar(passo.copiar.valor, passo.id)}>
                        {copiado === passo.id ? 'Copiado' : 'Copiar'}
                      </Button>
                    </div>
                  ) : null}

                  {passo.copiarWebhook && webhookUrl ? (
                    <div className={styles.copiar}>
                      <span>URL do webhook</span>
                      <code>{webhookUrl}</code>
                      <Button size="sm" variant="outline" onClick={() => copiar(webhookUrl, passo.id)}>
                        {copiado === passo.id ? 'Copiado' : 'Copiar'}
                      </Button>
                    </div>
                  ) : null}

                  {passo.tabela ? (
                    <table className={styles.tabela}>
                      <thead>
                        <tr>
                          <th>No Mercado Pago</th>
                          <th>Neste painel</th>
                          <th>Como reconhecer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {CAMPOS.map(([origem, destino, dica]) => (
                          <tr key={origem}>
                            <td>{origem}</td>
                            <td>{destino}</td>
                            <td>{dica}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}

                  {passo.dica ? (
                    <p className={styles.dica}>
                      <Icon name="eye" size={14} /> {passo.dica}
                    </p>
                  ) : null}

                  <div className={styles.acoesPasso}>
                    <Button size="sm" variant="forest" onClick={() => marcar(passo.id)}>
                      {feito ? 'Desmarcar' : 'Marcar como feito'}
                    </Button>
                    {passo.tabela && onAdicionar ? (
                      <Button size="sm" variant="outline" iconLeft="plus" onClick={onAdicionar}>
                        Adicionar conta agora
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className={styles.faq}>
        <h3 className={styles.faqTitulo}>Dúvidas comuns</h3>
        {PERGUNTAS.map((item, indice) => (
          <div key={item.p} className={styles.pergunta}>
            <button
              type="button"
              className={styles.perguntaBotao}
              aria-expanded={pergunta === indice}
              onClick={() => setPergunta(pergunta === indice ? null : indice)}
            >
              {item.p}
              <span aria-hidden="true">{pergunta === indice ? '−' : '+'}</span>
            </button>
            {pergunta === indice ? <p className={styles.resposta}>{item.r}</p> : null}
          </div>
        ))}
      </div>

      <p className={styles.rodape}>
        O Mercado Pago muda nomes de menu de vez em quando. Se algo não estiver exatamente onde o guia diz, procure
        pelo nome do passo (“Credenciais”, “Webhooks”) dentro da sua aplicação.
      </p>
    </section>
  );
}
