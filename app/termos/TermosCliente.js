'use client';

/**
 * Corpo de uma página de documento legal — Termos, Privacidade ou Cookies.
 *
 * Existe separado de `page.js` porque o texto vem do banco — precisa de
 * estado e de efeito, o que exige componente de cliente — enquanto o
 * `metadata` da rota só pode ser exportado de um componente de servidor. Um
 * arquivo só não atende as duas coisas.
 *
 * Um componente para os três documentos, e não três arquivos quase iguais:
 * a estrutura (índice lateral, esqueleto, fallback estático, parser) é
 * idêntica nos três; só o `tipo` da API e o texto de plano B mudam. Três
 * cópias divergiriam na primeira correção de layout feita em uma só.
 *
 * A origem dos dados é `GET /lgpd/documentos/:tipo`, que devolve a versão
 * vigente com texto integral. O motivo de não deixar o texto cravado aqui:
 * documento legal tem versão e hash no banco, e é a essa linha que o
 * consentimento do usuário aponta. Texto em JSX muda no deploy e leva junto a
 * prova do que foi aceito.
 *
 * `fallbackSections` continua existindo por página, injetado por quem chama:
 * é o **plano B**. Se a API cair, o documento precisa continuar legível — é
 * o tipo de texto que a pessoa pode ter aberto justamente para conferir um
 * direito seu.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BrandMark from '@/components/BrandMark/BrandMark';
import Icon from '@/components/Icon/Icon';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import api from '@/lib/api';
/* o parser saiu daqui para `lib/documento-legal.js` quando o admin ganhou um
   editor com prévia: a prévia precisa interpretar o texto pelo MESMO código,
   senão ela deixa de ser prévia e vira uma segunda opinião sobre o formato */
import { converterConteudo } from '@/lib/documento-legal';
import styles from './page.module.css';

export const SECTIONS_TERMOS = [
  {
    id: 'definicoes',
    title: '1. Definições',
    blocks: [
      'AgroPeças: plataforma digital que facilita a conexão entre usuários interessados em peças, produtos e serviços relacionados ao setor agropecuário.',
      'Usuário: qualquer pessoa física ou jurídica que acesse, cadastre-se ou utilize a plataforma.',
      'Produtor Rural: usuário que produz, explora ou desenvolve atividade agropecuária e utiliza a plataforma para localizar peças, produtos ou serviços.',
      'Loja de Peças: pessoa física ou jurídica que utiliza a plataforma para divulgar peças, componentes, produtos ou itens relacionados a máquinas, veículos e equipamentos.',
      'Prestador de Serviços: pessoa física ou jurídica que divulga serviços relacionados ao setor agropecuário, máquinas, equipamentos, manutenção, transporte ou atividades semelhantes.',
      'Anúncio/Cadastro: informação disponibilizada pelo usuário na plataforma sobre uma peça, produto, serviço ou oportunidade de negociação.',
    ],
  },
  {
    id: 'objetivo',
    title: '2. Objetivo da plataforma',
    blocks: [
      'O AgroPeças tem como objetivo facilitar o contato entre pessoas e empresas do setor agropecuário, especialmente em situações nas quais exista necessidade de localizar peças, componentes, produtos ou serviços com maior rapidez.',
      'A plataforma funciona como um ambiente de conexão e divulgação. O AgroPeças não realiza, necessariamente, a venda dos produtos anunciados, não adquire as peças para revenda e não atua como proprietário dos produtos cadastrados por terceiros.',
      'As negociações realizadas entre os usuários são de responsabilidade exclusiva das partes envolvidas.',
    ],
  },
  {
    id: 'cadastro-usuario',
    title: '3. Cadastro do usuário',
    blocks: [
      'Para utilizar determinadas funcionalidades da plataforma, poderá ser necessário realizar cadastro. O usuário compromete-se a fornecer informações verdadeiras, completas e atualizadas, e é responsável pela segurança de suas credenciais de acesso e por todas as atividades realizadas em sua conta.',
      'O usuário não poderá utilizar dados falsos, identidade de terceiros ou informações destinadas a induzir outros usuários a erro. Caso o AgroPeças identifique informações aparentemente falsas, fraudulentas ou incompatíveis com a finalidade da plataforma, poderá solicitar comprovação, restringir funcionalidades ou suspender o cadastro.',
    ],
  },
  {
    id: 'cadastro-anuncio',
    title: '4. Cadastro e divulgação de peças e serviços',
    blocks: [
      'O usuário que cadastrar uma peça, produto ou serviço é responsável pela veracidade das informações fornecidas e deve mantê-las atualizadas. Sempre que possível, o cadastro deverá conter informações suficientes para identificação do item, incluindo, quando aplicável:',
    ],
    list: {
      intro: '',
      items: [
        'descrição da peça ou produto;',
        'marca, modelo, código ou referência;',
        'condição de uso e compatibilidade;',
        'quantidade disponível e localização;',
        'preço ou condição de negociação;',
        'fotografias e informações relevantes sobre conservação ou funcionamento.',
      ],
    },
  },
  {
    id: 'negociacoes',
    title: '5. Negociações entre usuários',
    blocks: [
      'O AgroPeças facilita o contato entre os usuários, mas não participa necessariamente da negociação realizada entre eles, e não garante que uma negociação será concluída. Cabe exclusivamente aos usuários verificar, antes da conclusão de qualquer negócio:',
    ],
    list: {
      intro: '',
      items: [
        'identidade e legitimidade da outra parte;',
        'existência, disponibilidade e procedência da peça;',
        'estado de conservação e compatibilidade;',
        'preço, condições de pagamento, prazo e forma de entrega;',
        'garantias eventualmente oferecidas e documentação necessária.',
      ],
    },
  },
  {
    id: 'responsabilidade-usuarios',
    title: '6. Responsabilidade dos usuários',
    blocks: [
      'Cada usuário é integralmente responsável pelos conteúdos, informações, fotografias, preços, descrições e demais dados que inserir na plataforma. É proibido utilizar a plataforma para:',
    ],
    list: {
      intro: '',
      items: [
        'aplicar golpes ou fraudes, ou divulgar informações falsas ou enganosas;',
        'anunciar produto inexistente ou utilizar identidade falsa;',
        'comercializar produtos de origem ilícita ou divulgar conteúdo ilegal;',
        'violar direitos de terceiros ou praticar discriminação, ameaça, assédio ou qualquer forma de abuso;',
        'tentar obter acesso indevido a contas, sistemas ou informações de outros usuários;',
        'inserir códigos maliciosos ou prejudicar o funcionamento da plataforma.',
      ],
    },
  },
  {
    id: 'pecas-usadas',
    title: '7. Peças usadas e produtos de terceiros',
    blocks: [
      'O AgroPeças poderá permitir a divulgação de peças novas, usadas, recondicionadas ou de outras condições, desde que legalmente permitidas, cabendo ao responsável pelo cadastro informar a condição do produto. O usuário interessado deve avaliar as condições do produto antes da negociação — o AgroPeças não realiza, salvo quando expressamente informado, inspeção física, perícia, certificação ou avaliação técnica dos produtos anunciados.',
    ],
  },
  {
    id: 'pagamentos',
    title: '8. Pagamentos',
    blocks: [
      'O AgroPeças não se responsabiliza pelos pagamentos realizados diretamente entre usuários. Quando a negociação ocorrer fora da plataforma, o pagamento deve ser feito diretamente entre comprador e vendedor, nas condições acordadas entre as partes.',
      'O AgroPeças não solicita pagamento em nome de terceiros, salvo quando alguma funcionalidade expressamente indicar o contrário. Desconfie de solicitações de pagamento feitas por quem se apresente como representante do AgroPeças sem confirmação pelos canais oficiais.',
    ],
  },
  {
    id: 'responsabilidade-plataforma',
    title: '9. Responsabilidade do AgroPeças',
    blocks: [
      'O AgroPeças empregará esforços razoáveis para manter a plataforma disponível e funcional, mas pode apresentar indisponibilidades temporárias por manutenção, atualizações, falhas técnicas ou fatores fora do seu controle razoável.',
      'O AgroPeças não garante que produtos procurados estejam disponíveis, que usuários respondam aos contatos, que uma negociação seja concluída, que as informações fornecidas por terceiros sejam verdadeiras ou que os produtos anunciados sejam originais, adequados ou compatíveis.',
      'O AgroPeças não será responsável por prejuízos decorrentes exclusivamente de negociações realizadas entre usuários, ressalvadas as hipóteses em que a legislação aplicável determine responsabilidade diferente.',
    ],
  },
  {
    id: 'conteudo-usuario',
    title: '10. Conteúdo inserido pelos usuários',
    blocks: [
      'O usuário mantém a responsabilidade pelo conteúdo que publicar e declara possuir os direitos necessários sobre fotografias, descrições, logotipos ou outros materiais inseridos na plataforma.',
      'O usuário autoriza o AgroPeças, de forma não exclusiva e durante o período de disponibilização do conteúdo, a utilizar o material exclusivamente para funcionamento, divulgação e apresentação da plataforma e dos respectivos cadastros. O AgroPeças poderá retirar conteúdo que viole estes Termos, a legislação aplicável ou direitos de terceiros.',
    ],
  },
  {
    id: 'propriedade-intelectual',
    title: '11. Propriedade intelectual',
    blocks: [
      'A marca AgroPeças, seu nome, identidade visual, logotipo, layout, elementos gráficos, textos institucionais, funcionalidades e demais elementos próprios da plataforma são protegidos pela legislação aplicável. É proibida a reprodução, cópia, modificação, distribuição ou exploração comercial não autorizada desses elementos. O uso da plataforma não concede ao usuário qualquer direito de propriedade sobre a marca ou os elementos pertencentes ao AgroPeças.',
    ],
  },
  {
    id: 'privacidade',
    title: '12. Privacidade e proteção de dados',
    blocks: [
      'O tratamento de dados pessoais realizado pelo AgroPeças observa a legislação brasileira aplicável, especialmente a Lei nº 13.709/2018 (LGPD). Os dados poderão ser tratados para finalidades relacionadas ao cadastro, funcionamento da plataforma, comunicação entre usuários, segurança, prevenção de fraudes, atendimento e cumprimento de obrigações legais.',
      'Consulte a Política de Privacidade do AgroPeças, que complementa estes Termos de Uso e apresenta informações específicas sobre coleta, utilização, armazenamento e compartilhamento de dados pessoais.',
    ],
  },
  {
    id: 'comunicacoes',
    title: '13. Comunicações entre usuários',
    blocks: [
      'O AgroPeças poderá disponibilizar ferramentas para facilitar o contato entre usuários. As comunicações realizadas entre usuários são de responsabilidade das partes. É proibido utilizar os canais da plataforma para spam, ameaças, golpes, assédio, conteúdo ilegal ou qualquer finalidade incompatível com estes Termos. O AgroPeças poderá adotar medidas de segurança e moderação quando houver indícios de abuso ou violação destes Termos.',
    ],
  },
  {
    id: 'suspensao',
    title: '14. Suspensão e encerramento de contas',
    blocks: [
      'O AgroPeças poderá suspender, restringir ou encerrar contas quando houver indícios de fraude, utilização de identidade falsa, publicação de informações falsas, violação destes Termos, prática de atividade ilegal, tentativa de prejudicar a plataforma ou outros usuários, ou utilização abusiva da plataforma.',
      'Sempre que possível e adequado, o usuário será comunicado sobre a medida adotada. O encerramento da conta não elimina obrigações que, por sua natureza, devam permanecer após o encerramento.',
    ],
  },
  {
    id: 'denuncias',
    title: '15. Denúncias',
    blocks: [
      'Usuários poderão comunicar ao AgroPeças anúncios, perfis ou comportamentos que aparentem violar estes Termos ou a legislação. O AgroPeças poderá analisar a denúncia e adotar as medidas que considerar adequadas, incluindo solicitação de informações, retirada de conteúdo ou suspensão de conta. A realização de uma denúncia não garante a remoção imediata de determinado conteúdo, cabendo ao AgroPeças avaliar cada situação de acordo com as informações disponíveis e a legislação aplicável.',
    ],
  },
  {
    id: 'links-terceiros',
    title: '16. Links e serviços de terceiros',
    blocks: [
      'A plataforma poderá apresentar links ou direcionamentos para sites, aplicativos ou serviços de terceiros. O AgroPeças não controla necessariamente esses serviços e não se responsabiliza por seus conteúdos, políticas, funcionamento ou práticas.',
    ],
  },
  {
    id: 'alteracoes',
    title: '17. Alterações dos termos',
    blocks: [
      'O AgroPeças poderá atualizar estes Termos de Uso sempre que necessário para adequá-los à evolução da plataforma, alterações legais ou novas funcionalidades. A versão vigente é sempre a disponibilizada na plataforma. A continuidade de utilização da plataforma após a publicação de alterações poderá representar a concordância do usuário com os novos Termos, respeitados os direitos previstos na legislação aplicável.',
    ],
  },
  {
    id: 'disposicoes-gerais',
    title: '18. Disposições gerais',
    blocks: [
      'Caso alguma disposição destes Termos seja considerada inválida ou inexigível, as demais disposições permanecerão válidas na medida permitida pela legislação. A eventual tolerância do AgroPeças quanto ao descumprimento de qualquer disposição não constituirá renúncia ao direito de exigir seu cumprimento posteriormente. Estes Termos devem ser interpretados em conjunto com a Política de Privacidade e demais regras específicas eventualmente disponibilizadas na plataforma.',
    ],
  },
  {
    id: 'foro',
    title: '19. Legislação aplicável',
    blocks: [
      'Estes Termos serão regidos pelas leis da República Federativa do Brasil. As relações estabelecidas por meio da plataforma observarão a legislação brasileira aplicável, inclusive as normas de proteção de dados e, quando aplicável, as normas de defesa do consumidor. Eventuais conflitos deverão ser solucionados preferencialmente por meio de negociação entre as partes e, quando necessário, perante o foro competente nos termos da legislação aplicável.',
    ],
  },
  {
    id: 'aceite',
    title: '20. Aceite',
    blocks: [
      'Ao criar uma conta, acessar ou utilizar funcionalidades que dependam de concordância com estes Termos, o usuário declara que leu estes Termos de Uso, compreendeu suas disposições, concorda com as regras aqui estabelecidas e compromete-se a utilizar a plataforma de forma lícita e responsável.',
    ],
  },
];

const ATUALIZACAO_PADRAO = '24 de agosto de 2026';

/* o fallback estático usa outro formato (blocks + list); normalizar aqui deixa
   um único renderizador para os dois caminhos — dois renderizadores acabariam
   divergindo no visual, que é justamente o que não pode mudar */
function converterEstatico(secoes) {
  return secoes.map((secao) => {
    const blocos = secao.blocks.map((texto) => ({ tipo: 'paragrafo', texto }));

    if (secao.list) {
      blocos.push({ tipo: 'paragrafo', texto: secao.list.intro });
      blocos.push({ tipo: 'lista', itens: secao.list.items });
    }

    return { id: secao.id, title: secao.title, blocos };
  });
}

function formatarData(valor) {
  if (!valor) return ATUALIZACAO_PADRAO;

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return ATUALIZACAO_PADRAO;

  return data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* o esqueleto imita a forma do texto real — título curto e três linhas de
   parágrafo, sendo a última mais curta, como acaba um parágrafo de verdade.
   Usa as mesmas classes do conteúdo para o espaçamento ser o mesmo e a página
   não pular quando o documento chegar */
/* uma linha do esqueleto de parágrafo. O respiro vai por fora, em `span`, e não
   em classe nova no CSS da página: o arquivo de estilo descreve o documento
   real e não deve ganhar regra que só serve para o carregamento */
function LinhaEsqueleto({ largura }) {
  return (
    <span style={{ display: 'block', padding: '0.35em 0' }}>
      <Esqueleto largura={largura} altura="1em" />
    </span>
  );
}

function ConteudoEsqueleto() {
  return (
    <div className={styles.content} aria-hidden="true">
      {Array.from({ length: 6 }, (_, indice) => (
        <section className={styles.section} key={indice}>
          <h2 className={styles.sectionTitle}>
            <Esqueleto largura="52%" altura="1em" />
          </h2>

          {Array.from({ length: 2 }, (_, paragrafo) => (
            <p className={styles.paragraph} key={paragrafo}>
              <LinhaEsqueleto largura="100%" />
              <LinhaEsqueleto largura="98%" />
              <LinhaEsqueleto largura="64%" />
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}

/**
 * @param {string} tipo         chave em `/lgpd/documentos/:tipo` ('termos_de_uso' | 'politica_privacidade' | 'politica_cookies')
 * @param {string} tituloPadrao título exibido antes da API responder, e se ela falhar
 * @param {string} lead         a frase de abertura, logo abaixo do título
 * @param {Array}  fallbackSections lista no formato `{id, title, blocks, list?}` — o plano B
 */
export default function DocumentoLegalCliente({ tipo, tituloPadrao, lead, fallbackSections }) {
  const [documento, setDocumento] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const controle = new AbortController();

    /* `documento` recomeça nulo a cada troca de tipo — sem isso, navegar de
       /termos para /privacidade pelo link do rodapé mostraria por um instante
       o texto de Termos de Uso sob o título de Política de Privacidade */
    setDocumento(null);
    setCarregando(true);

    api
      .get(`/lgpd/documentos/${tipo}`, null, { sinal: controle.signal })
      .then((dados) => setDocumento(dados))
      /* erro aqui não derruba a tela: `documento` fica nulo e o render cai no
         texto estático. Documento legal indisponível é pior que desatualizado */
      .catch((erro) => {
        if (erro.name !== 'AbortError') setDocumento(null);
      })
      .finally(() => {
        if (!controle.signal.aborted) setCarregando(false);
      });

    return () => controle.abort();
  }, [tipo]);

  const secoesDaApi = documento ? converterConteudo(documento.conteudo) : [];

  /* documento vazio ou mal formatado também cai no estático — publicar um
     texto quebrado não pode apagar o documento da tela */
  const secoes = secoesDaApi.length ? secoesDaApi : converterEstatico(fallbackSections);
  const atualizadoEm = formatarData(documento?.vigenteDe);

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Link href="/" className={styles.brand} aria-label="AgroPeças MT — início">
          <BrandMark size="sm" />
        </Link>

        <Link href="/" className={styles.back}>
          <Icon name="chevron-right" size={16} className={styles.backIcon} />
          Voltar ao site
        </Link>
      </header>

      <main className={styles.main}>
        <div className={styles.head}>
          <span className={styles.eyebrow}>Documento legal</span>
          <h1 className={styles.title}>{documento?.titulo || tituloPadrao}</h1>
          <p className={styles.lead}>{lead}</p>
          <p className={styles.updated}>
            {carregando ? (
              <Esqueleto largura={260} altura="1em" />
            ) : (
              `Última atualização: ${atualizadoEm}`
            )}
          </p>
        </div>

        <nav className={styles.index} aria-label="Índice">
          <ol className={styles.indexList}>
            {carregando
              ? Array.from({ length: 10 }, (_, indice) => (
                  <li key={indice}>
                    <span className={styles.indexLink}>
                      <Esqueleto largura={`${45 + ((indice * 7) % 35)}%`} altura="1em" />
                    </span>
                  </li>
                ))
              : secoes.map((secao) => (
                  <li key={secao.id}>
                    <a className={styles.indexLink} href={`#${secao.id}`}>
                      {secao.title}
                    </a>
                  </li>
                ))}
          </ol>
        </nav>

        {carregando ? (
          <ConteudoEsqueleto />
        ) : (
          <div className={styles.content}>
            {secoes.map((secao) => (
              <section className={styles.section} id={secao.id} key={secao.id}>
                {secao.title ? <h2 className={styles.sectionTitle}>{secao.title}</h2> : null}

                {secao.blocos.map((bloco, indice) =>
                  bloco.tipo === 'lista' ? (
                    <ul className={styles.list} key={`lista-${indice}`}>
                      {bloco.itens.map((item) => (
                        <li key={item.slice(0, 24)}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className={styles.paragraph} key={bloco.texto.slice(0, 32)}>
                      {bloco.texto}
                    </p>
                  )
                )}
              </section>
            ))}
          </div>
        )}

        <p className={styles.contact}>
          Dúvidas sobre este documento?{' '}
          <a href="mailto:contato@agropecasmt.com.br">contato@agropecasmt.com.br</a>
        </p>
      </main>
    </div>
  );
}
