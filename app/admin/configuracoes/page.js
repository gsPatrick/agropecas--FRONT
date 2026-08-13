'use client';

/**
 * Administração → Configurações gerais.
 *
 * ⚠️ Reduzida ao que a API realmente valida contra alguma decisão de código —
 * ver o comentário no topo de `lib/dados/admin-configuracoes.js` para a lista
 * completa do que o mock desta tela imaginava e não existe: seis "portões" de
 * aprovação prévia por tipo de conteúdo (aqui existe UM só, geral), grupo de
 * contato, grupo de cadastro, modo manutenção e histórico agregado de
 * mudanças. Nada disso tem hoje uma chave gravada e um lugar no código que a
 * leia — só as quatro chaves abaixo têm os dois lados.
 */

import { useEffect, useMemo, useState } from 'react';
import PainelCartao from '@/components/PainelCartao/PainelCartao';
import PainelBarraSalvar from '@/components/PainelBarraSalvar/PainelBarraSalvar';
import PainelChave from '@/components/PainelChave/PainelChave';
import Modal from '@/components/Modal/Modal';
import Button from '@/components/Button/Button';
import Input from '@/components/Input/Input';
import Icon from '@/components/Icon/Icon';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import {
  CHAVES_CONFIG,
  listarConfiguracoes,
  atualizarConfiguracao,
} from '@/lib/dados/admin-configuracoes';
import styles from './page.module.css';

const MODERACAO = CHAVES_CONFIG.MODERACAO_PREVIA;
const NUMERICOS = [
  CHAVES_CONFIG.DIAS_VALIDADE,
  CHAVES_CONFIG.MAX_FOTOS,
  CHAVES_CONFIG.MAX_ATIVOS_POR_USUARIO,
];

export default function AdminConfiguracoesPage() {
  const aviso = useAviso();

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [dados, setDados] = useState({});
  const [salvo, setSalvo] = useState({});
  const [confirmarLigar, setConfirmarLigar] = useState(false);

  useEffect(() => {
    const controle = new AbortController();

    listarConfiguracoes({ sinal: controle.signal })
      .then((itens) => {
        const mapa = {};
        itens.forEach((item) => {
          mapa[item.chave] = item.tipo === 'numero' ? (item.valor ?? '') : Boolean(item.valor);
        });
        setDados(mapa);
        setSalvo(mapa);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setErro('Não foi possível carregar as configurações.');
      })
      .finally(() => setCarregando(false));

    return () => controle.abort();
  }, []);

  const alterado = JSON.stringify(dados) !== JSON.stringify(salvo);
  const moderacaoLigada = Boolean(dados[MODERACAO.chave]);

  function mudarCampo(chave, valor) {
    setDados((atual) => ({ ...atual, [chave]: valor }));
  }

  function alternarModeracao(ligar) {
    if (ligar) {
      setConfirmarLigar(true);
      return;
    }
    mudarCampo(MODERACAO.chave, false);
    aviso.info('Moderação prévia: volta ao fluxo automático assim que você salvar.');
  }

  async function salvar(evento) {
    evento.preventDefault();
    setSalvando(true);

    try {
      const alteradas = Object.keys(dados).filter((chave) => dados[chave] !== salvo[chave]);
      await Promise.all(alteradas.map((chave) => atualizarConfiguracao(chave, dados[chave])));
      setSalvo(dados);
      aviso.sucesso('Configurações da plataforma salvas.');
    } catch {
      aviso.erro('Não deu para salvar agora. Tenta de novo.');
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className={styles.pagina}>
        <p className={styles.descricao}>Carregando configurações…</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className={styles.pagina}>
        <p className={styles.descricao}>{erro}</p>
      </div>
    );
  }

  return (
    <form onSubmit={salvar} className={styles.pagina}>
      <header className={styles.topo}>
        <div>
          <h1 className={styles.titulo}>Configurações gerais</h1>
          <p className={styles.descricao}>
            Como a plataforma funciona para todo mundo.
          </p>
        </div>
      </header>

      {/* ── moderação prévia ───────────────────────────── */}
      <section className={styles.destaque} aria-label="Moderação prévia">
        <div className={styles.destaqueTopo}>
          <span className={styles.destaqueIcone}>
            <Icon name="check" size={20} />
          </span>

          <div className={styles.destaqueTexto}>
            <h2 className={styles.destaqueTitulo}>{MODERACAO.rotulo}</h2>
            <p className={styles.destaqueDescricao}>{MODERACAO.descricao}</p>
          </div>
        </div>

        <ul className={styles.portoes}>
          <li className={`${styles.portao} ${moderacaoLigada ? styles.portaoLigado : ''}`}>
            <span className={styles.portaoIcone}>
              <Icon name="gear" size={18} />
            </span>

            <div className={styles.portaoTexto}>
              <div className={styles.portaoLinha}>
                <strong>Anúncios (peças, serviços e máquinas)</strong>
              </div>
              <span className={styles.portaoDescricao}>
                Uma chave só vale para todo tipo de anúncio — a publicação não
                distingue peça, serviço ou máquina para decidir moderação.
              </span>
            </div>

            <PainelChave
              ligada={moderacaoLigada}
              onMudar={alternarModeracao}
              rotulo={MODERACAO.rotulo}
            />
          </li>
        </ul>
      </section>

      {/* ── limites numéricos ──────────────────────────── */}
      <PainelCartao titulo="Anúncios" icone="grid" semPadding className={styles.cartao}>
        <ul className={styles.campos}>
          {NUMERICOS.map((campo) => (
            <li key={campo.chave} className={styles.campo}>
              <div className={styles.campoTexto}>
                <strong>{campo.rotulo}</strong>
                <span>{campo.descricao}</span>
              </div>

              <div className={styles.campoNumero}>
                <Input
                  value={dados[campo.chave] ?? ''}
                  onChange={(evento) => mudarCampo(campo.chave, evento.target.value)}
                  inputMode="numeric"
                  aria-label={campo.rotulo}
                />
              </div>
            </li>
          ))}
        </ul>
      </PainelCartao>

      <PainelBarraSalvar
        alterado={alterado}
        onDescartar={() => {
          setDados(salvo);
          aviso.info('Alterações descartadas.');
        }}
        textoSalvo="Configurações em dia"
      />

      {/* ── confirmação de ligar ───────────────────────── */}
      {confirmarLigar ? (
        <Modal
          open
          onClose={() => setConfirmarLigar(false)}
          title="Exigir aprovação: anúncios"
          description="Isso muda o funcionamento da plataforma para todo mundo."
          footer={
            <div className={styles.rodapeModal}>
              <Button variant="ghost" onClick={() => setConfirmarLigar(false)}>
                Cancelar
              </Button>

              <Button
                variant="forest"
                onClick={() => {
                  mudarCampo(MODERACAO.chave, true);
                  setConfirmarLigar(false);
                  aviso.sucesso('Moderação prévia: passa a exigir sua aprovação assim que você salvar.');
                }}
              >
                Ligar aprovação prévia
              </Button>
            </div>
          }
        >
          <ul className={styles.consequencias}>
            <li>
              <Icon name="chevron-right" size={13} />
              A partir de salvar, todo anúncio novo entra como "em análise" até
              a sua revisão.
            </li>
            <li>
              <Icon name="chevron-right" size={13} />
              O que já está publicado continua no ar — a regra não vale para
              trás.
            </li>
          </ul>
        </Modal>
      ) : null}
    </form>
  );
}
