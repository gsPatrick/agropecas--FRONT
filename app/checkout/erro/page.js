import RetornoCheckout from '@/components/RetornoCheckout/RetornoCheckout';

export const metadata = { title: 'Pagamento não concluído — AgroPeças MT' };

/** volta do Mercado Pago — a lógica toda está em `RetornoCheckout` */
export default function CheckoutErroPage() {
  return <RetornoCheckout rota="erro" />;
}
