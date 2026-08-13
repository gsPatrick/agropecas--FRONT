/**
 * Rota da Política de Privacidade.
 *
 * Mesmo desenho de `/termos`: casca de servidor só para `metadata`, corpo em
 * `DocumentoLegalCliente` (compartilhado com Termos e Cookies), texto vindo
 * de `GET /lgpd/documentos/politica_privacidade` com este fallback estático
 * como plano B se a API cair.
 */

import DocumentoLegalCliente from '../termos/TermosCliente';

export const metadata = {
  title: 'Política de Privacidade — AgroPeças MT',
  description: 'Como a AgroPeças MT trata os dados pessoais de quem usa a plataforma.',
};

/* resumo do que está publicado no banco (documentos_legais, tipo
   politica_privacidade, v1.0) — plano B enxuto, não cópia integral: se a API
   cair, quem abrir a página precisa ler o essencial, não uma versão velha
   arriscando divergir da vigente em algum detalhe */
const SECTIONS_PRIVACIDADE = [
  {
    id: 'controlador',
    title: '1. Quem trata seus dados',
    blocks: [
      'A AgroPeças MT é a controladora dos dados pessoais tratados na plataforma, nos termos da Lei Geral de Proteção de Dados (Lei 13.709/2018). Dúvidas, pedidos e reclamações podem ser enviados para contato@agropecasmt.com.br, canal que também atende o Encarregado pelo Tratamento de Dados (DPO).',
    ],
  },
  {
    id: 'dados-coletados',
    title: '2. Quais dados coletamos',
    blocks: ['Coletamos apenas o necessário para colocar no ar um classificado de peças e serviços agrícolas em Mato Grosso:'],
    list: {
      intro: '',
      items: [
        'dados de cadastro: nome ou razão social, CPF ou CNPJ quando aplicável, e-mail, telefone e senha (guardada apenas como hash);',
        'dados de perfil: tipo de conta, município e estado, descrição da atividade, foto ou logo;',
        'dados dos anúncios: título, descrição, categoria, marca, condição, preço, fotos e localização aproximada;',
        'dados de contato para exibição pública, na medida em que o próprio usuário escolhe publicá-los;',
        'conteúdo de conversas trocadas dentro da plataforma;',
        'dados técnicos de uso, para segurança e prevenção a fraude.',
      ],
    },
  },
  {
    id: 'finalidade',
    title: '3. Para que usamos',
    blocks: [
      'Cada dado tem uma finalidade declarada: criar e manter sua conta; publicar seus anúncios e permitir que sejam encontrados; exibir os contatos que você marcou como públicos — a finalidade central do serviço; permitir a troca de mensagens; moderar conteúdo e apurar denúncias; cumprir obrigações legais; e enviar comunicações operacionais sobre sua própria conta.',
    ],
  },
  {
    id: 'conversas',
    title: '4. Conversas e denúncias',
    blocks: [
      'As conversas entre usuários não são lidas por padrão. A administração só acessa o conteúdo de uma conversa quando ela é objeto de denúncia, para apurar o que foi relatado — e todo acesso desse tipo fica registrado, com data, motivo e autor.',
    ],
  },
  {
    id: 'compartilhamento',
    title: '5. Compartilhamento',
    blocks: [
      'Não vendemos dados pessoais a terceiros. Os dados de contato que você marca como públicos ficam visíveis nos seus anúncios — é o que permite que interessados falem com você. Podemos compartilhar dados com prestadores que operam a infraestrutura da plataforma (hospedagem, envio de e-mail) e com autoridades, quando exigido por lei.',
    ],
  },
  {
    id: 'retencao',
    title: '6. Por quanto tempo guardamos',
    blocks: [
      'Guardamos os dados enquanto a conta estiver ativa e pelo prazo adicional necessário para cumprir obrigação legal — registros de acesso, por exemplo, seguem o prazo do Marco Civil da Internet. Pedido de exclusão de conta anonimiza os dados pessoais; não apagamos o histórico de anúncios e conversas por completo, para preservar direitos de terceiros que negociaram com você.',
    ],
  },
  {
    id: 'direitos',
    title: '7. Seus direitos',
    blocks: [
      'Você pode pedir acesso, correção, portabilidade ou exclusão dos seus dados a qualquer momento, pelo e-mail de contato ou pela sua conta. Respondemos dentro do prazo legal de 15 dias.',
    ],
  },
];

export default function PrivacidadePage() {
  return (
    <DocumentoLegalCliente
      tipo="politica_privacidade"
      tituloPadrao="Política de Privacidade"
      lead="Como a AgroPeças MT coleta, usa e protege os dados de quem usa a plataforma, conforme a Lei Geral de Proteção de Dados."
      fallbackSections={SECTIONS_PRIVACIDADE}
    />
  );
}
