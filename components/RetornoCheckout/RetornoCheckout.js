'use client';

/**
 * Volta do Checkout Pro — `/checkout/sucesso`, `/erro` e `/pendente`.
 *
 * A URL diz o que o Mercado Pago ACHA que aconteceu; quem diz o que vale é a
 * API. Por isso a página não confia no caminho em que caiu: chama
 * `/pedidos/:id/sincronizar` com o `payment_id` da URL (a API reconsulta o
 * pagamento no MP) e desenha a partir do status devolvido. Um Pix que caiu em
 * "pendente" e foi pago enquanto a pessoa voltava aparece como aprovado.
 *
 * Também é a rede de segurança do webhook: se a notificação atrasar ou não
 * chegar (ambiente sem URL pública), a volta do comprador já fecha o pedido.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader/AppHeader';
import AppFooter from '@/components/AppFooter/AppFooter';
import Button from '@/components/Button/Button';
import Icon from '@/components/Icon/Icon';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { useSessao, rotaDaConta } from '@/lib/sessao';
import { sincronizarPedido, reais, dataCurta } from '@/lib/dados/pedidos';
import styles from './RetornoCheckout.module.css';

const ESPERA_MS = 3000;
const TENTATIVAS = 5;

/** o que mostrar: decidido pelo status do pedido, com a rota só de reserva */
function situacaoDe(pedido, rota) {
  if (!pedido) return rota;
  if (['pago', 'entregue', 'concluido', 'em_disputa'].includes(pedido.status)) return 'sucesso';
  if (pedido.status === 'aguardando_pagamento') {
    if (['pending', 'in_process', 'authorized'].includes(pedido.pagamento?.status)) return 'pendente';
    return rota === 'sucesso' ? 'pendente' : rota;
  }
  return 'erro';
}

const TEXTOS = {
  sucesso: {
    icone: 'check',
    titulo: 'Pagamento aprovado!',
    texto:
      'O valor fica guardado pela AgroPeças até você receber a peça. Combine a entrega ou retirada com o vendedor pelo chat e, quando a peça chegar, confirme o recebimento em "Minhas compras".',
  },
  pendente: {
    icone: 'clock',
    titulo: 'Pagamento em processamento',
    texto:
      'Se você pagou com Pix, a confirmação costuma levar poucos minutos. A peça está reservada para você enquanto isso — avisamos assim que o pagamento for aprovado.',
  },
  erro: {
    icone: 'close',
    titulo: 'O pagamento não foi concluído',
    texto: 'Nenhum valor foi cobrado. Você pode tentar de novo com outro meio de pagamento.',
  },
};

export default function RetornoCheckout({ rota }) {
  const { autenticado, carregando: carregandoSessao, tipoPerfil } = useSessao();
  const [pedido, setPedido] = useState(null);
  const [falha, setFalha] = useState('');
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    if (carregandoSessao) return undefined;

    const parametros = new URLSearchParams(window.location.search);
    const pedidoId = parametros.get('pedido') || parametros.get('external_reference');
    /* `payment_id` no formato atual; `collection_id` no antigo */
    const pagamentoId = parametros.get('payment_id') || parametros.get('collection_id');

    if (!pedidoId || !autenticado) {
      setPronto(true);
      return undefined;
    }

    let ativo = true;
    let tentativa = 0;
    let temporizador;

    const consultar = async () => {
      try {
        const atual = await sincronizarPedido(pedidoId, pagamentoId && /^\d+$/.test(pagamentoId) ? pagamentoId : undefined);
        if (!ativo) return;
        setPedido(atual);
        setPronto(true);

        /* aprovado na URL, ainda aguardando no banco: o MP às vezes devolve o
           comprador antes de o pagamento ficar consultável. Tenta mais um pouco */
        tentativa += 1;
        if (atual.status === 'aguardando_pagamento' && rota !== 'erro' && tentativa < TENTATIVAS) {
          temporizador = setTimeout(consultar, ESPERA_MS);
        }
      } catch (erro) {
        if (!ativo) return;
        setFalha(erro.message);
        setPronto(true);
      }
    };

    consultar();
    return () => {
      ativo = false;
      clearTimeout(temporizador);
    };
  }, [autenticado, carregandoSessao, rota]);

  const situacao = situacaoDe(pedido, rota);
  const conteudo = TEXTOS[situacao];
  const compras = rotaDaConta(tipoPerfil) === '/conta' ? '/conta?aba=compras' : '/painel/compras';

  return (
    <>
      <AppHeader />
      <main className={styles.main}>
        <section className={`${styles.cartao} ${styles[situacao]}`}>
          {!pronto ? (
            <div className={styles.carregando}>
              <Esqueleto altura={56} largura={56} raio={28} />
              <Esqueleto altura={28} />
              <Esqueleto altura={64} />
            </div>
          ) : (
            <>
              <span className={styles.selo} aria-hidden="true">
                <Icon name={conteudo.icone} size={26} />
              </span>
              <h1 className={styles.titulo}>{conteudo.titulo}</h1>
              <p className={styles.texto}>{conteudo.texto}</p>

              {pedido ? (
                <dl className={styles.resumo}>
                  <div>
                    <dt>Pedido</dt>
                    <dd>{pedido.codigo}</dd>
                  </div>
                  <div>
                    <dt>Peça</dt>
                    <dd>{pedido.titulo}</dd>
                  </div>
                  <div>
                    <dt>Valor</dt>
                    <dd>{reais(pedido.valorTotalCentavos)}</dd>
                  </div>
                  <div>
                    <dt>Vendedor</dt>
                    <dd>{pedido.vendedor?.nome || '—'}</dd>
                  </div>
                  {situacao === 'pendente' && pedido.reservadoAte ? (
                    <div>
                      <dt>Reservada até</dt>
                      <dd>
                        {dataCurta(pedido.reservadoAte)},{' '}
                        {new Date(pedido.reservadoAte).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}

              {falha ? <p className={styles.falha}>{falha}</p> : null}

              {!autenticado ? (
                <p className={styles.texto}>Entre na sua conta para ver o andamento do pedido.</p>
              ) : null}

              <div className={styles.acoes}>
                {situacao === 'erro' ? (
                  pedido?.status === 'aguardando_pagamento' && pedido.checkoutUrl ? (
                    <Button as="a" href={pedido.checkoutUrl} iconLeft="check">
                      Tentar novamente
                    </Button>
                  ) : pedido?.anuncio?.id ? (
                    <Button as={Link} href={`/anuncios/${pedido.anuncio.id}`}>
                      Tentar novamente
                    </Button>
                  ) : (
                    <Button as={Link} href="/busca">
                      Voltar às peças
                    </Button>
                  )
                ) : null}

                {autenticado ? (
                  <Button as={Link} href={compras} variant={situacao === 'erro' ? 'outline' : 'primary'}>
                    Minhas compras
                  </Button>
                ) : (
                  <Button as={Link} href="/entrar">
                    Entrar
                  </Button>
                )}

                {situacao === 'sucesso' ? (
                  <Button as={Link} href="/mensagens" variant="outline" iconLeft="mail">
                    Falar com o vendedor
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </section>
      </main>
      <AppFooter />
    </>
  );
}
