'use client';

/**
 * /conta — a conta de quem só compra.
 *
 * O quarto perfil (Maturacao/05 previa só produtor, loja e prestador — todos
 * vendedores) não tem painel de anúncio, propriedade ou atendimento: não há
 * o que gerir. O que sobra é o que qualquer conta de e-commerce oferece —
 * dados, favoritos, mensagens — por isso uma página só, com abas, em vez do
 * `PainelShell` inteiro que os vendedores usam.
 *
 * Três seções, três origens de dado — todas API real agora:
 *  · Dados pessoais → `/perfis/meu`
 *  · Favoritos       → `/favoritos`
 *  · Mensagens       → resumo do `ChatProvider` (`/conversas`), o mesmo
 *    estado que alimenta `/mensagens` e o balão
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader/AppHeader';
import AppFooter from '@/components/AppFooter/AppFooter';
import PainelCartao from '@/components/PainelCartao/PainelCartao';
import PainelSegmentos from '@/components/PainelSegmentos/PainelSegmentos';
import PainelBarraSalvar from '@/components/PainelBarraSalvar/PainelBarraSalvar';
import Field from '@/components/Field/Field';
import Input from '@/components/Input/Input';
import Icon from '@/components/Icon/Icon';
import Dica from '@/components/Dica/Dica';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import { useSessao } from '@/lib/sessao';
import { useChat } from '@/components/ChatProvider/ChatProvider';
import {
  carregarDadosPessoais,
  salvarDadosPessoais,
  listarFavoritos,
  removerFavorito,
} from '@/lib/dados/conta';
import { carregarPerfilPublico, completudeDoPerfil } from '@/lib/dados/perfil-publico';
import { onboardingFoiDispensado, precisaDeOnboarding } from '@/lib/onboarding';
import styles from './page.module.css';

const ABAS = [
  { id: 'dados', rotulo: 'Meus dados' },
  { id: 'favoritos', rotulo: 'Favoritos' },
  { id: 'mensagens', rotulo: 'Mensagens' },
];

export default function ContaPage() {
  const router = useRouter();
  const { usuario, tipoPerfil, autenticado, carregando } = useSessao();
  const aviso = useAviso();

  /* a mesma guarda de `PainelShell`, ao contrário: quem vende tem painel
     próprio, e essa página fica reservada para quem só compra */
  useEffect(() => {
    if (carregando) return;
    if (!autenticado) router.replace('/entrar?retorno=/conta');
    else if (tipoPerfil !== 'cliente') router.replace('/painel');
  }, [carregando, autenticado, tipoPerfil, router]);

  /* checkpoint de primeiro acesso do cliente — equivalente ao de
     `PainelShell` para quem vende, mas mora aqui porque `/conta` não usa
     aquele layout (ver `lib/onboarding.js` para o porquê da completude como
     sinal em vez de "primeiro login") */
  useEffect(() => {
    if (carregando || !autenticado || tipoPerfil !== 'cliente') return;
    if (onboardingFoiDispensado(usuario?.id)) return;

    let cancelado = false;

    carregarPerfilPublico()
      .then((dados) => {
        if (cancelado) return;
        const { porcentagem } = completudeDoPerfil(dados, 'cliente');
        if (precisaDeOnboarding(porcentagem)) router.replace('/conta/boas-vindas');
      })
      .catch(() => {});

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregando, autenticado, tipoPerfil, usuario?.id]);

  const [aba, setAba] = useState('dados');

  if (!autenticado || tipoPerfil !== 'cliente') return null;

  return (
    <>
      <AppHeader showSearch={false} />

      <main className={styles.main}>
        <div className={styles.inner}>
          <header className={styles.topo}>
            <span className={styles.avatar}>{usuario.iniciais}</span>

            <div>
              <h1 className={styles.titulo}>Olá, {usuario.nome.split(' ')[0]}</h1>
              <p className={styles.subtitulo}>{usuario.email}</p>
            </div>
          </header>

          <div className={styles.abas}>
            <PainelSegmentos opcoes={ABAS} valor={aba} onMudar={setAba} rotulo="Seção da conta" />
          </div>

          {aba === 'dados' ? <AbaDados usuario={usuario} aviso={aviso} /> : null}
          {aba === 'favoritos' ? <AbaFavoritos aviso={aviso} /> : null}
          {aba === 'mensagens' ? <AbaMensagens /> : null}
        </div>
      </main>

      <AppFooter />
    </>
  );
}

/* ── dados pessoais ────────────────────────────────────────────── */

const VAZIO_DADOS = {
  nome: '',
  email: '',
  emailVerificado: false,
  telefone: '',
  whatsapp: '',
  exibirWhatsapp: true,
  cidade: '',
};

function AbaDados({ usuario, aviso }) {
  const [dados, setDados] = useState(VAZIO_DADOS);
  const [salvo, setSalvo] = useState(VAZIO_DADOS);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    let cancelado = false;

    carregarDadosPessoais()
      .then((atual) => {
        if (cancelado) return;
        setDados(atual);
        setSalvo(atual);
        setPronto(true);
      })
      .catch((erro) => {
        if (!cancelado) aviso.erro(erro.message);
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alterado = JSON.stringify(dados) !== JSON.stringify(salvo);

  const mudar = (campo) => (evento) =>
    setDados((atual) => ({ ...atual, [campo]: evento.target.value }));

  async function salvar(evento) {
    evento.preventDefault();

    try {
      const atual = await salvarDadosPessoais(dados, { cidadeOriginal: salvo.cidade });
      /* o e-mail não vem de volta do PATCH — o campo não é editável aqui, e
         reescrever o que já estava certo evitaria um "email: undefined" */
      const proximo = { ...atual, email: dados.email, emailVerificado: dados.emailVerificado };
      setDados(proximo);
      setSalvo(proximo);
      aviso.sucesso('Dados atualizados.');
    } catch (erro) {
      aviso.erro(erro.message);
    }
  }

  if (!pronto) {
    return (
      <PainelCartao titulo="Meus dados" icone="user">
        <div className={styles.esqueletoCampos}>
          <Esqueleto altura={54} raio={10} />
          <Esqueleto altura={54} raio={10} />
          <Esqueleto altura={54} raio={10} />
        </div>
      </PainelCartao>
    );
  }

  return (
    <form onSubmit={salvar}>
      <Link href="/conta/boas-vindas" className={styles.completarLink}>
        <Icon name="chevron-right" size={14} />
        Completar meu perfil pelo assistente guiado
      </Link>

      <PainelCartao titulo="Meus dados" icone="user">
        <div className={styles.campos}>
          <Field label="Nome" htmlFor="nome">
            <Input id="nome" value={dados.nome} onChange={mudar('nome')} />
          </Field>

          <Field
            label="E-mail"
            htmlFor="email"
            hint={dados.emailVerificado ? 'Confirmado' : 'Ainda não confirmado'}
          >
            <Input id="email" value={dados.email} readOnly />
          </Field>

          <div className={styles.duplo}>
            <Field label="Telefone" htmlFor="telefone">
              <Input
                id="telefone"
                value={dados.telefone}
                onChange={mudar('telefone')}
                placeholder="(65) 90000-0000"
              />
            </Field>

            <Field label="WhatsApp" htmlFor="whatsapp" hint="Usado quando você chama um vendedor">
              <Input
                id="whatsapp"
                value={dados.whatsapp}
                onChange={mudar('whatsapp')}
                placeholder="(65) 90000-0000"
              />
            </Field>
          </div>

          <Field
            label="Cidade e estado"
            htmlFor="cidade"
            hint="Ajuda a mostrar anúncios perto de você"
          >
            <Input
              id="cidade"
              value={dados.cidade}
              onChange={mudar('cidade')}
              placeholder="Sorriso · MT"
              iconLeft="pin"
            />
          </Field>
        </div>
      </PainelCartao>

      <PainelBarraSalvar
        alterado={alterado}
        onDescartar={() => setDados(salvo)}
        textoSalvo="Tudo salvo"
      />
    </form>
  );
}

/* ── favoritos ─────────────────────────────────────────────────── */

function AbaFavoritos({ aviso }) {
  const [itens, setItens] = useState(null);

  useEffect(() => {
    const controle = new AbortController();

    listarFavoritos({ sinal: controle.signal })
      .then(({ itens: lista }) => setItens(lista))
      .catch((erro) => {
        if (erro.name !== 'AbortError') {
          setItens([]);
          aviso.erro(erro.message);
        }
      });

    return () => controle.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function remover(item) {
    /* sai da lista antes da resposta: o coração é um alvo pequeno e esperar a
       rede faria parecer que o toque não fez nada */
    setItens((atual) => atual.filter((favorito) => favorito.id !== item.id));

    try {
      await removerFavorito(item.id);
      aviso.sucesso(`${item.titulo} saiu dos favoritos.`);
    } catch (erro) {
      /* a chamada falhou: devolve o item, senão a lista mente sobre o que
         está salvo até a próxima visita */
      setItens((atual) => [item, ...atual]);
      aviso.erro(erro.message);
    }
  }

  if (itens === null) {
    return (
      <PainelCartao titulo="Favoritos" icone="heart" semPadding>
        <div className={styles.listaEsqueleto}>
          {Array.from({ length: 3 }, (_, indice) => (
            <div className={styles.linhaEsqueleto} key={indice}>
              <Esqueleto largura={56} altura={56} raio={10} />
              <div className={styles.linhaEsqueletoTexto}>
                <Esqueleto largura="70%" altura={14} />
                <Esqueleto largura="35%" altura={12} />
              </div>
            </div>
          ))}
        </div>
      </PainelCartao>
    );
  }

  return (
    <PainelCartao
      titulo="Favoritos"
      descricao={itens.length ? `${itens.length} anúncio(s) salvo(s)` : undefined}
      icone="heart"
      semPadding
      permiteEstouro
    >
      {itens.length ? (
        <ul className={styles.lista}>
          {itens.map((item) => (
            <li key={item.favoritoId} className={styles.item}>
              <Link
                href={`/anuncios/${item.id}`}
                className={`${styles.itemLink} ${item.disponivel ? '' : styles.itemIndisponivel}`}
              >
                <span className={styles.itemFoto}>
                  {item.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.foto} alt="" />
                  ) : (
                    <Icon name="image" size={18} />
                  )}
                </span>

                <span className={styles.itemTexto}>
                  <strong>{item.titulo}</strong>
                  <span>
                    {item.disponivel ? item.preco || 'Consultar valor' : 'Não está mais no ar'}
                  </span>
                </span>
              </Link>

              <Dica texto="Tirar dos favoritos" alinhamento="fim">
                <button
                  type="button"
                  className={styles.itemRemover}
                  onClick={() => remover(item)}
                  aria-label={`Tirar ${item.titulo} dos favoritos`}
                >
                  <Icon name="heart" size={16} />
                </button>
              </Dica>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.vazio}>
          <p className={styles.vazioTitulo}>Nenhum favorito ainda</p>
          <p className={styles.vazioTexto}>
            Toque no coração de um anúncio para guardá-lo aqui.
          </p>
          <Link href="/anuncios" className={styles.vazioAcao}>
            <Icon name="grid" size={15} />
            Ver anúncios
          </Link>
        </div>
      )}
    </PainelCartao>
  );
}

/* ── mensagens ─────────────────────────────────────────────────── */

function AbaMensagens() {
  const { conversas, naoLidas } = useChat();
  const recentes = conversas.slice(0, 5);

  return (
    <PainelCartao
      titulo="Mensagens"
      descricao={naoLidas > 0 ? `${naoLidas} não lida(s)` : 'Tudo em dia'}
      icone="mail"
      acao={{ href: '/mensagens', rotulo: 'Abrir caixa de entrada' }}
      semPadding
    >
      {recentes.length ? (
        <ul className={styles.lista}>
          {recentes.map((conversa) => (
            <li key={conversa.id} className={styles.item}>
              <Link href="/mensagens" className={styles.itemLink}>
                <span className={styles.itemFoto}>
                  <Icon name="user" size={18} />
                </span>

                <span className={styles.itemTexto}>
                  <strong>{conversa.pessoa}</strong>
                  <span>{conversa.anuncio?.titulo}</span>
                </span>

                {conversa.naoLidas > 0 ? (
                  <span className={styles.itemContador}>{conversa.naoLidas}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.vazio}>
          <p className={styles.vazioTitulo}>Nenhuma conversa ainda</p>
          <p className={styles.vazioTexto}>
            Quando você chamar um vendedor, a conversa aparece aqui.
          </p>
        </div>
      )}
    </PainelCartao>
  );
}
