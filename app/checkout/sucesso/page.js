import RetornoCheckout from '@/components/RetornoCheckout/RetornoCheckout';

export const metadata = { title: 'Pagamento aprovado — AgroPeças MT' };

/** volta do Mercado Pago — a lógica toda está em `RetornoCheckout` */
export default function CheckoutSucessoPage() {
  return <RetornoCheckout rota="sucesso" />;
}
