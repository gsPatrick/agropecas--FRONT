'use client';

/**
 * Um pedido numa lista — de compras ou de vendas.
 *
 * O mesmo cartão serve aos dois lados porque a venda É o mesmo objeto: o que
 * muda é o que cada um faz com ela. O comprador confirma o recebimento ou
 * abre disputa; o vendedor só acompanha — ele não decide sobre o próprio
 * saldo (Maturacao/06).
 *
 * As ações vêm prontas de quem usa (`onConfirmar`, `onDisputar`…): o cartão
 * não chama a API, só desenha. Assim a lista decide como atualizar a si mesma.
 */

import Link from 'next/link';
import Badge from '@/components/Badge/Badge';
import Button from '@/components/Button/Button';
import Icon from '@/components/Icon/Icon';
import { reais, dataCurta, STATUS_PEDIDO, STATUS_REPASSE } from '@/lib/dados/pedidos';
import styles from './PedidoItem.module.css';

export default function PedidoItem({ pedido, lado = 'comprador', ocupado = false, onConfirmar, onDisputar, onCancelar }) {
  const status = STATUS_PEDIDO[pedido.status] || { rotulo: pedido.status, tom: 'neutral' };
  const outraParte = lado === 'comprador' ? pedido.vendedor : pedido.comprador;
  const capa = pedido.anuncio?.capa?.miniatura;

  return (
    <article className={styles.root}>
      <Link href={`/anuncios/${pedido.anuncio?.id}`} className={styles.capa} aria-label={pedido.titulo}>
        {capa ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={capa} alt="" />
        ) : (
          <Icon name="gear" size={20} />
        )}
      </Link>

      <div className={styles.corpo}>
        <div className={styles.linhaTopo}>
          <span className={styles.codigo}>{pedido.codigo}</span>
          <Badge tone={status.tom} dot>
            {status.rotulo}
          </Badge>
        </div>

        <h3 className={styles.titulo}>{pedido.titulo}</h3>

        <p className={styles.meta}>
          {pedido.quantidade > 1 ? `${pedido.quantidade} un. · ` : ''}
          {lado === 'comprador' ? 'Vendido por ' : 'Comprado por '}
          {outraParte?.perfilSlug ? (
            <Link href={`/perfil/${outraParte.perfilSlug}`}>{outraParte.nome}</Link>
          ) : (
            outraParte?.nome || '—'
          )}
          {' · '}
          {dataCurta(pedido.pagoEm || pedido.criadoEm)}
        </p>

        {lado === 'vendedor' ? (
          <dl className={styles.valores}>
            <div>
              <dt>Venda</dt>
              <dd>{reais(pedido.valorTotalCentavos)}</dd>
            </div>
            <div>
              <dt>Comissão ({pedido.comissaoPercentual}%)</dt>
              <dd>− {reais(pedido.comissaoCentavos)}</dd>
            </div>
            <div className={styles.liquido}>
              <dt>Você recebe</dt>
              <dd>{reais(pedido.valorVendedorCentavos)}</dd>
            </div>
            {pedido.repasse ? (
              <div>
                <dt>Repasse</dt>
                <dd>{STATUS_REPASSE[pedido.repasse.status]?.rotulo || pedido.repasse.status}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className={styles.total}>{reais(pedido.valorTotalCentavos)}</p>
        )}

        {lado === 'comprador' && pedido.status === 'pago' ? (
          <p className={styles.dica}>
            <Icon name="clock" size={13} />
            Combine a entrega pelo chat. Se não confirmar nem abrir disputa, o valor é liberado ao
            vendedor em {dataCurta(pedido.liberacaoAutomaticaEm)}.
          </p>
        ) : null}

        {lado === 'vendedor' && pedido.status === 'pago' ? (
          <p className={styles.dica}>
            <Icon name="clock" size={13} />
            Valor em custódia até o comprador confirmar o recebimento (ou até{' '}
            {dataCurta(pedido.liberacaoAutomaticaEm)}).
          </p>
        ) : null}

        {pedido.status === 'em_disputa' ? (
          <p className={`${styles.dica} ${styles.dicaAlerta}`}>
            <Icon name="bell" size={13} />
            Em análise pela equipe AgroPeças. O valor fica retido até a decisão.
          </p>
        ) : null}

        {lado === 'comprador' ? (
          <div className={styles.acoes}>
            {pedido.status === 'aguardando_pagamento' && pedido.checkoutUrl ? (
              <>
                <Button as="a" href={pedido.checkoutUrl} size="sm">
                  Pagar agora
                </Button>
                {onCancelar ? (
                  <Button variant="ghost" size="sm" onClick={() => onCancelar(pedido)} disabled={ocupado}>
                    Cancelar
                  </Button>
                ) : null}
              </>
            ) : null}

            {pedido.status === 'pago' ? (
              <>
                {onConfirmar ? (
                  <Button size="sm" iconLeft="check" onClick={() => onConfirmar(pedido)} disabled={ocupado}>
                    Confirmar recebimento
                  </Button>
                ) : null}
                {onDisputar ? (
                  <Button variant="outline" size="sm" onClick={() => onDisputar(pedido)} disabled={ocupado}>
                    Tive um problema
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
