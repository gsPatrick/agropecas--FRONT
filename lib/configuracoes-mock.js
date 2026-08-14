/**
 * Vocabulário de navegação de `/painel/configuracoes` — cada tópico aqui tem
 * uma tela real por trás (`components/Configuracoes/*`), cada uma com o
 * próprio adaptador em `lib/dados/configuracoes.js`. A lista fica fora da
 * tela porque a navegação lateral e o conteúdo precisam concordar sobre o que
 * existe: duas listas escritas à mão divergiriam no primeiro tópico novo, e a
 * pessoa clicaria num item que não abre nada.
 */

export const SECOES = [
  {
    id: 'conta',
    rotulo: 'Conta',
    icone: 'user',
    descricao: 'Dados de acesso e identificação',
  },
  {
    id: 'seguranca',
    rotulo: 'Segurança',
    icone: 'check',
    descricao: 'Senha e sessões abertas',
  },
  {
    id: 'notificacoes',
    rotulo: 'Notificações',
    icone: 'bell',
    descricao: 'O que você quer receber, e por onde',
  },
  {
    id: 'privacidade',
    rotulo: 'Privacidade',
    icone: 'eye-off',
    descricao: 'Quem vê seus dados de contato',
  },
  {
    id: 'dados',
    rotulo: 'Seus dados',
    icone: 'grid',
    descricao: 'Baixar ou apagar o que guardamos (LGPD)',
  },
  /* "Plano" fica de fora enquanto não houver cobrança — v2.0. A tela
     (`ConfigPlano`) e o adaptador continuam existindo, só não aparecem no
     menu: um item que abre uma tela sem decisão nenhuma pra tomar ensina a
     ignorar o menu (mesmo raciocínio do item equivalente em admin-menu.js) */
];

