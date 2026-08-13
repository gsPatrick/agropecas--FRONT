'use client';

/**
 * Configurações → Privacidade.
 *
 * A escolha que mais importa aqui é **quem vê seu telefone**. O padrão é "só
 * pelo chat", como no documento da cliente (Maturacao/05 §9): número aberto
 * vira lista de disparo em poucas semanas.
 *
 * ⚠️ Reformulado em cima do que a API realmente modela — dois booleanos em
 * `perfis` (`exibirWhatsapp`, `aceitaChat`), não três níveis de "quem vê".
 * O mapper público (`perfil.mapper.js: whatsappVisivel`) não distingue
 * visitante de usuário logado — `exibirWhatsapp` é a mesma resposta para os
 * dois, então a opção "só para quem está logado" do mock não existe de
 * verdade; as três opções agora mapeiam para as combinações reais dos dois
 * campos. `perfilIndexado`, `mostrarCidade` e `mostrarUltimoAcesso` saíram —
 * sem coluna.
 */

import { useEffect, useState } from 'react';
import PainelCartao from '@/components/PainelCartao/PainelCartao';
import PainelChave from '@/components/PainelChave/PainelChave';
import Icon from '@/components/Icon/Icon';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import { carregarPrivacidade, salvarPrivacidade } from '@/lib/dados/configuracoes';
import styles from './ConfigPrivacidade.module.css';

const OPCOES_CONTATO = [
  {
    id: 'visivel',
    rotulo: 'Mostrar meu WhatsApp',
    descricao: 'Aparece para quem entra na conta e abre seu anúncio',
    valores: { exibirWhatsapp: true, aceitaChat: true },
  },
  {
    id: 'chat',
    rotulo: 'Só pelo chat da plataforma',
    descricao: 'Seu número não aparece em lugar nenhum',
    valores: { exibirWhatsapp: false, aceitaChat: true },
  },
  {
    id: 'oculto',
    rotulo: 'Nenhum contato direto',
    descricao: 'Ninguém consegue chamar você — não recomendado',
    valores: { exibirWhatsapp: false, aceitaChat: false },
  },
];

const opcaoDe = (dados) =>
  OPCOES_CONTATO.find(
    (opcao) =>
      opcao.valores.exibirWhatsapp === dados.exibirWhatsapp &&
      opcao.valores.aceitaChat === dados.aceitaChat
  )?.id || 'chat';

export default function ConfigPrivacidade() {
  const aviso = useAviso();

  const [dados, setDados] = useState(null);

  useEffect(() => {
    const controle = new AbortController();

    carregarPrivacidade({ sinal: controle.signal })
      .then(setDados)
      .catch((erro) => {
        if (erro.name !== 'AbortError') aviso.erro('Não foi possível carregar a privacidade.');
      });

    return () => controle.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function escolherContato(opcao) {
    const anterior = dados;
    setDados((atual) => ({ ...atual, ...opcao.valores }));

    try {
      /* dois campos, duas chamadas — a API grava um por vez (`PATCH
         /perfis/meu` aceita os dois juntos, mas simplifica o retorno tratar
         cada chave como a mesma função de `alternarChave`) */
      await Promise.all([
        salvarPrivacidade('exibirWhatsapp', opcao.valores.exibirWhatsapp),
        salvarPrivacidade('aceitaChat', opcao.valores.aceitaChat),
      ]);
    } catch (erro) {
      setDados(anterior);
      aviso.erro(erro.message);
    }
  }

  async function alternarChave(chave, valor) {
    const anterior = dados;
    setDados((atual) => ({ ...atual, [chave]: valor }));

    try {
      await salvarPrivacidade(chave, valor);
    } catch (erro) {
      setDados(anterior);
      aviso.erro(erro.message);
    }
  }

  if (!dados) {
    return (
      <PainelCartao titulo="Quem vê seu contato" icone="eye-off">
        <div className={styles.carregando}>
          <Esqueleto altura={64} raio={10} />
          <Esqueleto altura={64} raio={10} />
        </div>
      </PainelCartao>
    );
  }

  const atual = opcaoDe(dados);

  return (
    <>
      <PainelCartao
        titulo="Quem vê seu contato"
        descricao="Vale para telefone e WhatsApp, no perfil e nos anúncios."
        icone="eye-off"
      >
        <div className={styles.opcoes}>
          {OPCOES_CONTATO.map((opcao) => {
            const marcada = atual === opcao.id;

            return (
              <button
                key={opcao.id}
                type="button"
                className={`${styles.opcao} ${marcada ? styles.opcaoAtiva : ''}`}
                onClick={() => escolherContato(opcao)}
                aria-pressed={marcada}
              >
                <span className={styles.radio}>{marcada ? <span /> : null}</span>

                <span className={styles.opcaoTexto}>
                  <strong>{opcao.rotulo}</strong>
                  <span>{opcao.descricao}</span>
                </span>
              </button>
            );
          })}
        </div>

        {atual === 'oculto' ? (
          <p className={styles.alerta}>
            <Icon name="bell" size={14} />
            Sem WhatsApp nem chat, ninguém consegue combinar nada com você — seus
            anúncios ficam sem contato possível.
          </p>
        ) : null}
      </PainelCartao>

      <PainelCartao titulo="Localização" icone="pin" semPadding>
        <ul className={styles.chaves}>
          <li className={styles.chave}>
            <div className={styles.chaveTexto}>
              <strong>Mostrar endereço exato</strong>
              <span>Desligado, o anúncio mostra só o município e a região aproximada</span>
            </div>

            <PainelChave
              ligada={Boolean(dados.exibirEnderecoExato)}
              onMudar={(valor) => alternarChave('exibirEnderecoExato', valor)}
              rotulo="Mostrar endereço exato"
            />
          </li>
        </ul>
      </PainelCartao>
    </>
  );
}
