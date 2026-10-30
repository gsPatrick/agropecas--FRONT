'use client';

/**
 * /admin/vendas — o financeiro da custódia (Maturacao/06).
 *
 * Duas abas, dois trabalhos diferentes:
 *
 *  · **Vendas** — o que entrou: valor bruto, a comissão (receita da
 *    plataforma) e o líquido devido ao vendedor, com o status de pagamento e
 *    entrega. Aqui a Admin libera o repasse sem esperar o comprador, ou
 *    estorna quando a disputa dá razão a ele.
 *  · **Repasses** — o que sai: a fila de PIX a fazer, com a chave do vendedor
 *    ao lado. "Registrar PIX" só vale para o que está disponível; o que ainda
 *    está em custódia aparece, mas sem botão.
 *
 * Liberar e estornar passam pelo `AdminAcaoModal`: os dois mexem em dinheiro
 * de terceiro e não têm desfazer, e o motivo vai para o histórico do pedido.
 */

import { useCallback, useEffect, useState } from 'react';
import AdminEtiqueta from '@/components/AdminEtiqueta/AdminEtiqueta';
import AdminAcaoModal from '@/components/AdminAcaoModal/AdminAcaoModal';
import PainelSegmentos from '@/components/PainelSegmentos/PainelSegmentos';
import PainelMetrica from '@/components/PainelMetrica/PainelMetrica';
import Modal from '@/components/Modal/Modal';
import Button from '@/components/Button/Button';
import Field from '@/components/Field/Field';
import Input from '@/components/Input/Input';
import Icon from '@/components/Icon/Icon';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import {
  listarVendasAdmin,
  listarRepassesAdmin,
  liberarRepasse,
  reembolsarVenda,
  pagarRepasse,
  reais,
  dataCurta,
  STATUS_PEDIDO,
  STATUS_REPASSE,
} from '@/lib/dados/pedidos';
import styles from './page.module.css';

const ABAS = [
  { id: 'vendas', rotulo: 'Vendas' },
  { id: 'repasses', rotulo: 'Repasses' },
];

const FILTROS_VENDA = [
  { id: '', rotulo: 'Todas' },
  { id: 'pago', rotulo: 'Em custódia' },
  { id: 'em_disputa', rotulo: 'Em disputa' },
  { id: 'entregue', rotulo: 'A repassar' },
  { id: 'concluido', rotulo: 'Concluídas' },
  { id: 'reembolsado', rotulo: 'Estornadas' },
];

const FILTROS_REPASSE = [
  { id: 'disponivel', rotulo: 'A pagar' },
  { id: 'retido', rotulo: 'Em custódia' },
  { id: 'pago', rotulo: 'Pagos' },
  { id: '', rotulo: 'Todos' },
];

/* o vocabulário de tom do `Badge` → o do `AdminEtiqueta` */
const TOM = { warning: 'alerta', info: 'info', danger: 'perigo', success: 'ok', neutral: 'neutro' };

export default function AdminVendasPage() {
  const aviso = useAviso();
  const [aba, setAba] = useState('vendas');
  const [filtroVenda, setFiltroVenda] = useState('');
  const [filtroRepasse, setFiltroRepasse] = useState('disponivel');
  const [busca, setBusca] = useState('');

  const [vendas, setVendas] = useState(null);
  const [resumo, setResumo] = useState(null);
  const [repasses, setRepasses] = useState(null);
  const [resumoRepasses, setResumoRepasses] = useState(null);

  const [acao, setAcao] = useState(null);
  const [pagando, setPagando] = useState(null);
  const [comprovante, setComprovante] = useState('');

  const carregarVendas = useCallback(
    (sinal) =>
      listarVendasAdmin({ status: filtroVenda || undefined, busca: busca.trim() || undefined, porPagina: 50 }, { sinal })
        .then(({ dados, meta }) => {
          setVendas(dados);
          setResumo(meta.resumo || null);
        })
        .catch((erro) => {
          if (erro.name === 'AbortError') return;
          setVendas([]);
          aviso.erro(erro.message);
        }),
    [filtroVenda, busca, aviso]
  );

  const carregarRepasses = useCallback(
    (sinal) =>
      listarRepassesAdmin({ status: filtroRepasse || undefined, porPagina: 50 }, { sinal })
        .then(({ dados, meta }) => {
          setRepasses(dados);
          setResumoRepasses(meta.resumo || null);
        })
        .catch((erro) => {
          if (erro.name === 'AbortError') return;
          setRepasses([]);
          aviso.erro(erro.message);
        }),
    [filtroRepasse, aviso]
  );

  useEffect(() => {
    const controle = new AbortController();
    /* a busca espera a pessoa parar de digitar — uma consulta por tecla
       somaria o financeiro inteiro a cada letra */
    const temporizador = setTimeout(() => carregarVendas(controle.signal), 300);
    return () => {
      clearTimeout(temporizador);
      controle.abort();
    };
  }, [carregarVendas]);

  useEffect(() => {
    const controle = new AbortController();
    carregarRepasses(controle.signal);
    return () => controle.abort();
  }, [carregarRepasses]);

  async function aplicar({ motivo }) {
    const { venda, tipo } = acao;
    setAcao(null);

    try {
      if (tipo === 'liberar') {
        await liberarRepasse(venda.id, motivo);
        aviso.sucesso(`Repasse de ${venda.codigo} liberado.`);
      } else {
        await reembolsarVenda(venda.id, motivo);
        aviso.sucesso(`Estorno de ${venda.codigo} solicitado ao Mercado Pago.`);
      }
      await Promise.all([carregarVendas(), carregarRepasses()]);
    } catch (erro) {
      aviso.erro(erro.message);
    }
  }

  async function registrarPix() {
    const repasse = pagando;
    setPagando(null);

    try {
      await pagarRepasse(repasse.id, comprovante.trim() || undefined);
      setComprovante('');
      aviso.sucesso(`PIX de ${reais(repasse.valorCentavos)} registrado.`);
      await Promise.all([carregarVendas(), carregarRepasses()]);
    } catch (erro) {
      aviso.erro(erro.message);
    }
  }

  function pedirLiberacao(venda) {
    setAcao({
      id: `liberar-${venda.id}`,
      venda,
      tipo: 'liberar',
      titulo: `Liberar repasse — ${venda.codigo}`,
      descricao: `${reais(venda.valorVendedorCentavos)} passam a estar disponíveis para o PIX ao vendedor.`,
      confirmar: 'Liberar repasse',
      consequencias: [
        'O pedido é marcado como entregue, assinado pela administração',
        venda.status === 'em_disputa' ? 'A disputa do comprador é encerrada a favor do vendedor' : 'O comprador não poderá mais abrir disputa',
        'O vendedor é avisado de que o valor foi liberado',
      ],
    });
  }

  function pedirEstorno(venda) {
    setAcao({
      id: `estornar-${venda.id}`,
      venda,
      tipo: 'estornar',
      titulo: `Estornar — ${venda.codigo}`,
      descricao: `${reais(venda.valorTotalCentavos)} voltam ao comprador pelo Mercado Pago.`,
      confirmar: 'Estornar pagamento',
      destrutiva: true,
      palavra: 'ESTORNAR',
      consequencias: [
        'O valor integral é devolvido ao meio de pagamento do comprador',
        'O repasse do vendedor é cancelado e a peça volta ao estoque',
        'A taxa do Mercado Pago da transação não é devolvida à plataforma',
      ],
    });
  }

  return (
    <>
      <header className={styles.topo}>
        <div>
          <h1 className={styles.titulo}>Vendas e repasses</h1>
          <p className={styles.descricao}>
            Compras pagas pelo Mercado Pago ficam em custódia na conta da plataforma até a entrega ser confirmada.
          </p>
        </div>
      </header>

      <div className={styles.metricas}>
        <PainelMetrica icone="chart" rotulo="Vendido (bruto)" valor={resumo ? reais(resumo.brutoCentavos) : '…'} />
        <PainelMetrica icone="store" rotulo="Comissão da plataforma" valor={resumo ? reais(resumo.comissaoCentavos) : '…'} />
        <PainelMetrica icone="user" rotulo="Líquido dos vendedores" valor={resumo ? reais(resumo.liquidoVendedoresCentavos) : '…'} />
        <PainelMetrica icone="clock" rotulo="Em custódia agora" valor={resumo ? reais(resumo.emCustodiaCentavos) : '…'} />
      </div>

      <div className={styles.filtros}>
        <PainelSegmentos
          opcoes={ABAS}
          valor={aba}
          onMudar={setAba}
          rotulo="Seção"
          contagens={{
            vendas: resumo?.emDisputa || undefined,
            repasses: resumoRepasses?.quantidades?.disponivel || undefined,
          }}
        />
      </div>

      {aba === 'vendas' ? (
        <>
          <div className={styles.filtros}>
            <PainelSegmentos opcoes={FILTROS_VENDA} valor={filtroVenda} onMudar={setFiltroVenda} rotulo="Situação da venda" />
            <div className={styles.campoBusca}>
              <Input
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Código do pedido ou peça"
                iconLeft="search"
                aria-label="Buscar venda"
              />
            </div>
          </div>

          <div className={styles.quadro}>
            {vendas === null ? (
              <Carregando />
            ) : vendas.length ? (
              <div className={styles.rolagem}>
                <table className={styles.tabela}>
                  <thead>
                    <tr>
                      <th>Pedido</th>
                      <th>Comprador → Vendedor</th>
                      <th className={styles.num}>Valor bruto</th>
                      <th className={styles.num}>Comissão</th>
                      <th className={styles.num}>Líquido vendedor</th>
                      <th>Pagamento / entrega</th>
                      <th aria-label="Ações" />
                    </tr>
                  </thead>
                  <tbody>
                    {vendas.map((venda) => {
                      const status = STATUS_PEDIDO[venda.status] || { rotulo: venda.status, tom: 'neutral' };
                      const podeLiberar = ['pago', 'em_disputa'].includes(venda.status);
                      const podeEstornar =
                        ['pago', 'em_disputa', 'entregue'].includes(venda.status) && venda.repasse?.status !== 'pago';

                      return (
                        <tr key={venda.id}>
                          <td>
                            <strong className={styles.codigo}>{venda.codigo}</strong>
                            <span className={styles.sub}>{venda.titulo}</span>
                            <span className={styles.sub}>{dataCurta(venda.pagoEm || venda.criadoEm)}</span>
                          </td>
                          <td>
                            <span>{venda.comprador?.nome || '—'}</span>
                            <span className={styles.sub}>→ {venda.vendedor?.nome || '—'}</span>
                          </td>
                          <td className={styles.num}>{reais(venda.valorTotalCentavos)}</td>
                          <td className={`${styles.num} ${styles.lucro}`}>
                            {reais(venda.comissaoCentavos)}
                            <span className={styles.sub}>{venda.comissaoPercentual}%</span>
                          </td>
                          <td className={styles.num}>{reais(venda.valorVendedorCentavos)}</td>
                          <td>
                            <AdminEtiqueta tom={TOM[status.tom]} ponto>
                              {status.rotulo}
                            </AdminEtiqueta>
                            {venda.repasse ? (
                              <span className={styles.sub}>
                                Repasse: {STATUS_REPASSE[venda.repasse.status]?.rotulo || venda.repasse.status}
                              </span>
                            ) : null}
                            {venda.disputa ? <span className={styles.subAlerta}>“{venda.disputa.motivo}”</span> : null}
                          </td>
                          <td className={styles.acoes}>
                            {podeLiberar ? (
                              <Button size="sm" variant="forest" onClick={() => pedirLiberacao(venda)}>
                                Liberar repasse
                              </Button>
                            ) : null}
                            {podeEstornar ? (
                              <Button size="sm" variant="ghost" onClick={() => pedirEstorno(venda)}>
                                Estornar
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.vazio}>Nenhuma venda neste filtro.</p>
            )}
          </div>
        </>
      ) : (
        <>
          <div className={styles.filtros}>
            <PainelSegmentos
              opcoes={FILTROS_REPASSE}
              valor={filtroRepasse}
              onMudar={setFiltroRepasse}
              rotulo="Situação do repasse"
              contagens={resumoRepasses?.quantidades}
            />
            {resumoRepasses ? (
              <p className={styles.totalRepasse}>
                A pagar: <strong>{reais(resumoRepasses.totais.disponivel)}</strong> · Em custódia:{' '}
                <strong>{reais(resumoRepasses.totais.retido)}</strong>
              </p>
            ) : null}
          </div>

          <div className={styles.quadro}>
            {repasses === null ? (
              <Carregando />
            ) : repasses.length ? (
              <ul className={styles.lista}>
                {repasses.map((repasse) => {
                  const status = STATUS_REPASSE[repasse.status] || { rotulo: repasse.status, tom: 'neutral' };
                  const chave = repasse.status === 'pago' ? repasse.chavePix : repasse.vendedor?.chavePix;

                  return (
                    <li key={repasse.id} className={styles.repasse}>
                      <div className={styles.repasseTexto}>
                        <strong>{repasse.vendedor?.nome || '—'}</strong>
                        <span className={styles.sub}>
                          {repasse.pedido?.codigo} · {repasse.pedido?.titulo}
                        </span>
                        <span className={chave ? styles.pix : styles.subAlerta}>
                          <Icon name="store" size={12} />
                          {chave
                            ? `PIX (${repasse.status === 'pago' ? repasse.chavePixTipo : repasse.vendedor?.chavePixTipo}): ${chave}`
                            : 'Vendedor ainda não cadastrou chave PIX'}
                        </span>
                      </div>

                      <strong className={styles.repasseValor}>{reais(repasse.valorCentavos)}</strong>

                      <span className={styles.repasseStatus}>
                        <AdminEtiqueta tom={TOM[status.tom]} ponto>
                          {status.rotulo}
                        </AdminEtiqueta>
                        <span className={styles.sub}>
                          {repasse.status === 'pago'
                            ? `pago em ${dataCurta(repasse.pagoEm)}${repasse.comprovante ? ` · ${repasse.comprovante}` : ''}`
                            : repasse.disponivelEm
                              ? `liberado em ${dataCurta(repasse.disponivelEm)}`
                              : 'aguardando entrega'}
                        </span>
                      </span>

                      <span className={styles.acoes}>
                        {repasse.status === 'disponivel' ? (
                          <Button size="sm" variant="forest" onClick={() => setPagando(repasse)} disabled={!chave}>
                            Registrar PIX
                          </Button>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.vazio}>Nenhum repasse neste filtro.</p>
            )}
          </div>
        </>
      )}

      <AdminAcaoModal acao={acao} onFechar={() => setAcao(null)} onConfirmar={aplicar} />

      <Modal
        open={Boolean(pagando)}
        onClose={() => setPagando(null)}
        title="Registrar PIX feito"
        description={
          pagando
            ? `Confirme que você transferiu ${reais(pagando.valorCentavos)} para ${pagando.vendedor?.nome} na chave ${pagando.vendedor?.chavePix}.`
            : ''
        }
        footer={
          <div className={styles.rodape}>
            <Button variant="ghost" onClick={() => setPagando(null)}>
              Cancelar
            </Button>
            <Button variant="forest" iconLeft="check" onClick={registrarPix}>
              Registrar pagamento
            </Button>
          </div>
        }
      >
        <Field label="Identificador do PIX (opcional)" htmlFor="comprovante-pix" hint="O código E2E do comprovante ajuda a conferir depois.">
          <Input
            id="comprovante-pix"
            value={comprovante}
            onChange={(evento) => setComprovante(evento.target.value)}
            placeholder="E00000000202610191200..."
            data-autofocus
          />
        </Field>
      </Modal>
    </>
  );
}

function Carregando() {
  return (
    <div className={styles.carregando}>
      <Esqueleto altura={54} raio={10} />
      <Esqueleto altura={54} raio={10} />
      <Esqueleto altura={54} raio={10} />
    </div>
  );
}
