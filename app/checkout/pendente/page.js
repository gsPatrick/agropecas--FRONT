import RetornoCheckout from '@/components/RetornoCheckout/RetornoCheckout';

export const metadata = { title: 'Pagamento em processamento — AgroPeças MT' };

/** volta do Mercado Pago — a lógica toda está em `RetornoCheckout` */
export default function CheckoutPendentePage() {
  return <RetornoCheckout rota="pendente" />;
}
