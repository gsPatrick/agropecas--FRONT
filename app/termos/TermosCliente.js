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
    id: 'objeto',
    title: '1. O que é a AgroPeças MT',
    blocks: [
      'A AgroPeças MT é uma plataforma de conexão e divulgação. Ela aproxima produtores rurais, lojas de peças e prestadores de serviços do agronegócio, permitindo que publiquem anúncios e encontrem quem procuram.',
      'A plataforma não vende, não intermedeia e não participa das negociações. Não há pagamento processado pelo site, carrinho de compras, frete, garantia de produto ou custódia de valores. Encontrado o anúncio, o contato e toda a negociação acontecem diretamente entre as partes, preferencialmente por WhatsApp.',
    ],
  },
  {
    id: 'cadastro',
    title: '2. Cadastro e conta',
    blocks: [
      'Para publicar anúncios é necessário criar uma conta informando dados verdadeiros, completos e atualizados. Cada usuário escolhe seu perfil no cadastro: Produtor Rural, Loja de Peças ou Prestador de Serviços.',
      'O usuário é o único responsável por sua senha e por tudo o que for feito na sua conta. Ao identificar uso indevido, deve comunicar a plataforma imediatamente.',
      'É proibido criar contas com dados de terceiros, usar identidade falsa ou manter mais de uma conta com a intenção de burlar restrições.',
    ],
  },
  {
    id: 'anuncios',
    title: '3. Anúncios e conteúdo do usuário',
    blocks: [
      'O conteúdo de cada anúncio — textos, fotos, preços, condições e dados de contato — é de responsabilidade exclusiva de quem o publica. A AgroPeças MT não confere, não valida e não garante a veracidade, a procedência, a qualidade ou a legalidade do que é anunciado.',
      'Ao publicar, o usuário declara que tem direito sobre o item ou serviço anunciado e sobre as imagens enviadas, e autoriza a exibição desse conteúdo na plataforma.',
    ],
    list: {
      intro: 'É proibido anunciar:',
      items: [
        'itens de origem ilícita, furtados, receptados ou com numeração adulterada;',
        'produtos falsificados ou que violem marca, patente ou direito autoral;',
        'armas, munições, agrotóxicos de uso restrito e demais itens de comércio proibido ou controlado sem a devida autorização;',
        'conteúdo falso, enganoso, ofensivo, discriminatório ou que exponha terceiros;',
        'anúncios repetidos em massa, propaganda de terceiros ou qualquer forma de spam.',
      ],
    },
  },
  {
    id: 'contato',
    title: '4. Contato entre usuários',
    blocks: [
      'Ao publicar um anúncio, o usuário autoriza a exibição do seu número de WhatsApp e demais contatos informados, para que interessados possam procurá-lo. Essa exibição é a finalidade central da plataforma.',
      'O contato deve ser respeitoso e restrito ao assunto do anúncio. É vedado usar os contatos obtidos para envio de propaganda não solicitada, cobrança indevida, assédio ou qualquer forma de abuso.',
    ],
  },
  {
    id: 'moderacao',
    title: '5. Moderação',
    blocks: [
      'A administração da plataforma pode, a qualquer momento e a seu critério, editar, ocultar ou excluir anúncios, bem como advertir, bloquear ou excluir contas que violem estes termos, prejudiquem outros usuários ou comprometam a segurança do serviço.',
      'A administração também pode intervir em cadastros e anúncios para correção de dados, organização de categorias e manutenção da plataforma. Toda intervenção fica registrada.',
    ],
  },
  {
    id: 'responsabilidade',
    title: '6. Limitação de responsabilidade',
    blocks: [
      'A AgroPeças MT não é parte nos negócios celebrados entre usuários e não responde por eles. Não respondemos por prejuízo decorrente de negociação frustrada, produto com defeito, peça incompatível, serviço mal executado, atraso, inadimplemento ou informação incorreta prestada por qualquer usuário.',
      'A plataforma é oferecida no estado em que se encontra. Não garantimos disponibilidade ininterrupta e podemos suspender o serviço para manutenção ou por motivo técnico.',
      'Recomendamos conferir a procedência do item, a compatibilidade da peça e a idoneidade da outra parte antes de fechar qualquer negócio, preferindo negociações presenciais e documentadas.',
    ],
  },
  {
    id: 'dados',
    title: '7. Dados pessoais',
    blocks: [
      'Os dados informados no cadastro são usados para identificar o usuário, viabilizar a publicação dos anúncios e permitir o contato entre as partes, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).',
      'Dados de contato marcados para exibição ficam visíveis publicamente nos anúncios — é isso que permite que alguém entre em contato. O usuário pode, a qualquer momento, editar seus dados, ocultar seus anúncios ou solicitar a exclusão da conta.',
      'Não vendemos dados pessoais a terceiros.',
    ],
  },
  {
    id: 'gratuidade',
    title: '8. Uso gratuito',
    blocks: [
      'Nesta fase, o cadastro e a publicação de anúncios são gratuitos. Não há mensalidade nem comissão sobre negócios fechados.',
      'Eventuais planos ou serviços pagos que venham a existir serão comunicados com antecedência e não afetarão retroativamente o que já foi publicado.',
    ],
  },
  {
    id: 'alteracoes',
    title: '9. Alterações destes termos',
    blocks: [
      'Estes termos podem ser atualizados a qualquer momento. A versão vigente é sempre a publicada nesta página, com a data de atualização indicada. O uso da plataforma após a alteração significa concordância com a nova versão.',
    ],
  },
  {
    id: 'foro',
    title: '10. Foro',
    blocks: [
      'Aplica-se a legislação brasileira. Fica eleito o foro da comarca de Tangará da Serra, Mato Grosso, para dirimir questões decorrentes destes termos, ressalvado o direito do consumidor de acionar o foro de seu domicílio.',
    ],
  },
];

const ATUALIZACAO_PADRAO = '10 de agosto de 2026';

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
