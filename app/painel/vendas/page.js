'use client';

/**
 * /painel/vendas — vendas pela plataforma e o dinheiro de cada uma.
 *
 * Três números respondem a pergunta do vendedor, "quando eu recebo?":
 *   · em custódia  — pago pelo comprador, aguardando a confirmação de entrega
 *   · disponível   — liberado; a AgroPeças faz o PIX
 *   · recebido     — PIX já feito
 *
 * A chave PIX mora aqui, e não em Configurações, porque é aqui que a falta
 * dela trava alguma coisa: sem chave, o repasse disponível não sai.
 */

import { useEffect, useState } from 'react';
import PainelTopo from '@/components/PainelTopo/PainelTopo';
import PainelCartao from '@/components/PainelCartao/PainelCartao';
import PainelMetrica from '@/components/PainelMetrica/PainelMetrica';
import PedidoItem from '@/components/PedidoItem/PedidoItem';
import Field from '@/components/Field/Field';
import Input from '@/components/Input/Input';
import Button from '@/components/Button/Button';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import { useSessao } from '@/lib/sessao';
import {
  listarVendas,
  buscarExtrato,
  buscarChavePix,
  salvarChavePix,
  reais,
  TIPOS_CHAVE_PIX,
} from '@/lib/dados/pedidos';
import styles from './page.module.css';

export default function VendasPage() {
  const { perfil } = useSessao();
  const aviso = useAviso();

  const [vendas, setVendas] = useState(null);
  const [resumo, setResumo] = useState(null);
  const [chave, setChave] = useState({ chavePixTipo: 'cpf', chavePix: '' });
  const [chaveSalva, setChaveSalva] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const controle = new AbortController();
    const opcoes = { sinal: controle.signal };

    Promise.all([
      listarVendas({ porPagina: 50 }, opcoes),
      buscarExtrato({ porPagina: 1 }, opcoes),
      buscarChavePix(opcoes),
    ])
      .then(([listaVendas, extrato, pix]) => {
        setVendas(listaVendas.dados);
        setResumo(extrato.meta?.resumo || null);
        if (pix?.chavePix) {
          setChave({ chavePixTipo: pix.chavePixTipo, chavePix: pix.chavePix });
          setChaveSalva(pix);
        }
      })
      .catch((erro) => {
        if (erro.name === 'AbortError') return;
        setVendas([]);
        aviso.erro(erro.message);
      });

    return () => controle.abort();
  }, [aviso]);

  async function salvar(evento) {
    evento.preventDefault();
    setSalvando(true);
    try {
      const pix = await salvarChavePix(chave.chavePixTipo, chave.chavePix);
      setChave(pix);
      setChaveSalva(pix);
      aviso.sucesso('Chave PIX salva.');
    } catch (erro) {
      aviso.erro(erro.message);
    } finally {
      setSalvando(false);
    }
  }

  const totais = resumo?.totais || {};
  const alterada = chave.chavePix !== (chaveSalva?.chavePix || '') || chave.chavePixTipo !== (chaveSalva?.chavePixTipo || 'cpf');

  return (
    <>
      <PainelTopo
        perfil={perfil}
        titulo="Vendas e repasses"
        descricao="O valor de cada venda fica em custódia até o comprador confirmar o recebimento; depois, a AgroPeças transfere por PIX."
      />

      <div className={styles.metricas}>
        <PainelMetrica icone="clock" rotulo="Em custódia" valor={resumo ? reais(totais.retido) : '…'} />
        <PainelMetrica icone="check" rotulo="Disponível para repasse" valor={resumo ? reais(totais.disponivel) : '…'} />
        <PainelMetrica icone="chart" rotulo="Já recebido" valor={resumo ? reais(totais.pago) : '…'} />
      </div>

      <div className={styles.pilha}>
      <PainelCartao
        titulo="Chave PIX de recebimento"
        icone="store"
        descricao={
          chaveSalva
            ? 'É para esta chave que fazemos o PIX dos seus repasses.'
            : 'Cadastre uma chave para receber os repasses. Sem ela, o valor liberado fica parado.'
        }
      >
        <form className={styles.pix} onSubmit={salvar}>
          <Field label="Tipo" htmlFor="pix-tipo">
            <Input
              as="select"
              id="pix-tipo"
              value={chave.chavePixTipo}
              onChange={(evento) => setChave((atual) => ({ ...atual, chavePixTipo: evento.target.value }))}
            >
              {TIPOS_CHAVE_PIX.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.rotulo}
                </option>
              ))}
            </Input>
          </Field>

          <Field label="Chave" htmlFor="pix-chave" className={styles.pixChave}>
            <Input
              id="pix-chave"
              value={chave.chavePix}
              onChange={(evento) => setChave((atual) => ({ ...atual, chavePix: evento.target.value }))}
              placeholder={chave.chavePixTipo === 'email' ? 'voce@exemplo.com' : chave.chavePixTipo === 'telefone' ? '(65) 99999-0000' : ''}
              autoComplete="off"
            />
          </Field>

          <Button type="submit" disabled={salvando || !chave.chavePix || !alterada}>
            {salvando ? 'Salvando…' : 'Salvar chave'}
          </Button>
        </form>
      </PainelCartao>

      <PainelCartao titulo="Vendas pela plataforma" semPadding>
        {vendas === null ? (
          <div className={styles.carregando}>
            <Esqueleto altura={110} raio={12} />
            <Esqueleto altura={110} raio={12} />
          </div>
        ) : vendas.length ? (
          vendas.map((pedido) => <PedidoItem key={pedido.id} pedido={pedido} lado="vendedor" />)
        ) : (
          <p className={styles.vazio}>
            Nenhuma venda pela plataforma ainda. Anúncios de peça com preço definido ganham o botão
            “Comprar agora”.
          </p>
        )}
      </PainelCartao>
      </div>
    </>
  );
}
