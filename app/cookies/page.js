/**
 * Rota da Política de Cookies.
 *
 * Mesmo desenho de `/termos` e `/privacidade`: casca de servidor só para
 * `metadata`, corpo em `DocumentoLegalCliente`, texto vindo de
 * `GET /lgpd/documentos/politica_cookies`, com este fallback como plano B.
 */

import DocumentoLegalCliente from '../termos/TermosCliente';

export const metadata = {
  title: 'Política de Cookies — AgroPeças MT',
  description: 'Quais cookies a AgroPeças MT usa e para quê.',
};

/* resumo do que está publicado no banco (documentos_legais, tipo
   politica_cookies, v1.0) */
const SECTIONS_COOKIES = [
  {
    id: 'o-que-sao',
    title: '1. O que são cookies',
    blocks: [
      'Cookies são pequenos arquivos que o navegador guarda para lembrar informações entre uma visita e outra — como manter a sessão aberta ou lembrar uma preferência de exibição.',
    ],
  },
  {
    id: 'essenciais',
    title: '2. Cookies essenciais',
    blocks: [
      'Usados para manter você conectado, lembrar itens da sessão (como uma busca em andamento) e proteger a plataforma contra uso indevido. Sem eles, partes básicas do site — como entrar na conta — não funcionam. Não podem ser desativados.',
    ],
  },
  {
    id: 'preferencia',
    title: '3. Cookies de preferência',
    blocks: [
      'Guardam escolhas como o perfil selecionado no painel ou a barra lateral recolhida, para você não precisar repetir a escolha a cada visita.',
    ],
  },
  {
    id: 'seguranca',
    title: '4. Cookies de segurança',
    blocks: [
      'Ajudam a identificar tentativas de login suspeitas e a prevenir fraude, sem os quais a plataforma ficaria mais vulnerável a ataques automatizados.',
    ],
  },
  {
    id: 'medicao',
    title: '5. Cookies de medição',
    blocks: [
      'Usados para entender quais páginas são mais visitadas e onde o site apresenta dificuldade, de forma agregada. Não usamos cookies de publicidade nem de rastreamento comportamental entre sites — não vendemos espaço publicitário e não temos motivo para perfilar quem visita.',
    ],
  },
  {
    id: 'gestao',
    title: '6. Como gerenciar',
    blocks: [
      'A maioria dos navegadores permite bloquear ou apagar cookies nas configurações de privacidade. Bloquear os essenciais impede o uso normal da plataforma, incluindo manter a sessão de login aberta.',
    ],
  },
];

export default function CookiesPage() {
  return (
    <DocumentoLegalCliente
      tipo="politica_cookies"
      tituloPadrao="Política de Cookies"
      lead="Quais cookies a AgroPeças MT usa, para quê, e como você pode gerenciá-los."
      fallbackSections={SECTIONS_COOKIES}
    />
  );
}
