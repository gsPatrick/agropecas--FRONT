'use client';

/**
 * Assistente de primeiro acesso — um MODAL de tela cheia, obrigatório, que
 * cobre o painel/conta até a pessoa terminar. Não é mais uma rota
 * (`/painel/boas-vindas` e `/conta/boas-vindas` foram removidas): quem
 * dispara é `PainelShell.js` (produtor/loja/prestador) e `app/conta/page.js`
 * (cliente — mas na prática não dispara mais, ver abaixo), renderizando este
 * componente por cima da tela atual em vez de navegar para outro lugar.
 *
 * ─── por que "modal", e não "página" ───────────────────────────────────────
 * O dono do produto pediu que não desse para sair no meio: sem navegação para
 * fechar, sobra reaproveitar o padrão de overlay que `components/Modal/Modal.js`
 * já usa no painel (fundo desfocado, portal no body, trava de rolagem) — mas
 * SEM o botão de fechar, SEM fechar no Esc e SEM fechar clicando fora, porque
 * `Modal.js` foi desenhado para ser fechável e aqui é o oposto. Em vez de
 * complicar `Modal.js` com um prop que desliga metade do que ele faz, o
 * overlay é montado aqui do zero, do mesmo jeito visual (mesmo z-index, mesmo
 * fundo, mesmo portal em `document.body`).
 *
 * ─── por que os passos encolheram ──────────────────────────────────────────
 * O cadastro (`SignupWizard.js`) já pergunta nome, documento, WhatsApp,
 * telefone adicional, endereço completo (CEP → cidade/UF) e "sobre" para
 * TODOS os perfis — e para produtor também pergunta o nome da propriedade.
 * Perguntar de novo aqui seria repetir o cadastro. O que sobra, por tipo,
 * depois de tirar tudo que o cadastro já resolve:
 *  · comum a todos → só a foto (o único campo comum que o cadastro não pede)
 *  · produtor  → área em hectares, culturas, máquinas
 *    (nome da propriedade veio do cadastro; "cidade da sede" e "telefone da
 *    sede" escrevem nos MESMOS campos que o endereço/telefone do cadastro já
 *    preencheu — `perfil.municipio` e `perfil.telefoneSecundario`, ver
 *    `lib/dados/exclusivas.js:paraPropriedade` — reperguntar seria mostrar
 *    campo "vazio" que na verdade já tem valor salvo em outro lugar)
 *  · loja      → razão social, nome fantasia, horário de funcionamento,
 *    formas de entrega (endereço/telefone/WhatsApp do balcão são os MESMOS
 *    campos do cadastro — `telefoneSecundario`, `whatsapp`, `municipio`, ver
 *    `lib/dados/exclusivas.js:paraAtendimento`)
 *  · prestador → formas de atendimento, base, raio de atendimento (serviços
 *    já foram escolhidos no cadastro; a re-pergunta "mínimo 3" saiu)
 *  · cliente   → nada sobrou de relevante depois do corte — o cadastro já
 *    cobre 100% do que o assistente perguntava. Por isso `app/conta/page.js`
 *    não dispara mais este componente.
 *
 * "Área em hectares" (produtor) e "razão social/nome fantasia" (loja) são os
 * mesmos campos extras de `/painel/perfil` (`lib/dados/perfil-publico.js`),
 * então usam `salvarPerfilPublico` — não `salvarPropriedade`/`salvarAtendimento`.
 * Isso importa: mandar o objeto INTEIRO teria zerado campos como
 * `propriedadeNome`/`contatoSede`/endereço que o cadastro já preencheu e que
 * este assistente não edita mais — por isso os passos que usam
 * `salvarPropriedade`/`salvarAtendimento`/`salvarServicos` sempre carregam o
 * registro completo primeiro e só TROCAM os campos que o passo realmente
 * mostra, preservando o resto como veio da API.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import PainelCartao from '@/components/PainelCartao/PainelCartao';
import Field from '@/components/Field/Field';
import Input from '@/components/Input/Input';
import Button from '@/components/Button/Button';
import Icon from '@/components/Icon/Icon';
import PainelChave from '@/components/PainelChave/PainelChave';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import { carregarPerfilPublico, salvarPerfilPublico, enviarFotoPerfil } from '@/lib/dados/perfil-publico';
import {
  carregarPropriedade,
  salvarPropriedade,
  carregarCulturasDisponiveis,
  carregarAtendimento,
  salvarAtendimento,
  carregarServicos,
  salvarServicos,
} from '@/lib/dados/exclusivas';
import { TIPOS_MAQUINA, DIAS, FORMAS_ENTREGA, FORMAS_ATENDIMENTO, RAIOS } from '@/lib/vocabulario-exclusivas';
import { marcarOnboardingDispensado } from '@/lib/onboarding';
import styles from './Onboarding.module.css';

/** um passo por tipo de perfil — a ordem AQUI é a ordem na tela. `foto` é o
    único passo comum: tudo o mais que o assistente pedia já vem do cadastro
    (ver o comentário do topo do arquivo) */
const PASSOS_POR_TIPO = {
  produtor: ['foto', 'area', 'culturas', 'maquinas'],
  loja: ['foto', 'identidade', 'horarios', 'entregas'],
  prestador: ['foto', 'comoAtende'],
  cliente: [],
};

const TITULO_PASSO = {
  foto: 'Foto de perfil',
  area: 'Sua propriedade',
  culturas: 'O que você produz',
  maquinas: 'Seu maquinário',
  identidade: 'Identidade da loja',
  horarios: 'Horário de funcionamento',
  entregas: 'Formas de entrega',
  comoAtende: 'Como você atende',
};

const HORARIOS_VAZIOS = Object.fromEntries(
  DIAS.map((dia) => [dia.id, { aberto: false, de: '', ate: '' }])
);

const VAZIO_BASICO = { fotoUrl: '', sobre: '', telefone: '', whatsapp: '', cidade: '', areaHectares: '', razaoSocial: '', nomeFantasia: '' };
const VAZIO_PROPRIEDADE = {
  nome: '',
  inscricao: '',
  cidade: '',
  referencia: '',
  area: '',
  culturas: [],
  contatoSede: '',
  maquinas: [],
};
const VAZIO_ATENDIMENTO = {
  endereco: '',
  cidade: '',
  telefone: '',
  whatsapp: '',
  horarios: HORARIOS_VAZIOS,
  entregas: [],
  raioEntrega: '',
  prazoResposta: 'Poucas horas',
  observacao: '',
};
const VAZIO_SERVICOS = {
  servicos: [],
  raio: '200 km',
  base: '',
  formas: [],
  cobraDeslocamento: 'Sim, acima do raio informado',
  prazo: 'Em até 48 h',
  equipe: '',
  observacao: '',
};

/**
 * @param onConcluir chamado quando a pessoa termina o último passo — quem
 *   chama fecha o overlay (não navega: o modal só cobre a tela atual)
 */
export default function Onboarding({ tipoPerfil, perfil, usuario, onConcluir }) {
  const aviso = useAviso();

  const passos = PASSOS_POR_TIPO[tipoPerfil] || [];
  const [indice, setIndice] = useState(0);
  const [pronto, setPronto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [montado, setMontado] = useState(false);

  const [basico, setBasico] = useState(VAZIO_BASICO);
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  const [propriedade, setPropriedade] = useState(VAZIO_PROPRIEDADE);
  const [culturasDisponiveis, setCulturasDisponiveis] = useState([]);

  const [atendimento, setAtendimento] = useState(VAZIO_ATENDIMENTO);
  const [atendimentoCidadeOriginal, setAtendimentoCidadeOriginal] = useState('');

  const [servicos, setServicos] = useState(VAZIO_SERVICOS);
  const [servicosBaseOriginal, setServicosBaseOriginal] = useState('');

  /* portal no body, como Modal.js — sem isso o overlay herdaria o
     empilhamento do painel e ficaria por baixo do conteúdo */
  useEffect(() => setMontado(true), []);

  /* trava a rolagem da página por trás enquanto o modal está aberto — igual
     a Modal.js, mas SEM listener de Esc: este overlay não fecha por teclado */
  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = anterior;
    };
  }, []);

  /* carga inicial — o básico sempre (fotoUrl + o que o passo do tipo usa via
     `salvarPerfilPublico`: área/razão social/fantasia), mais a seção
     exclusiva do tipo quando existir passo para ela */
  useEffect(() => {
    if (!usuario) return undefined;
    let cancelado = false;

    const cargaExtra =
      tipoPerfil === 'produtor'
        ? Promise.all([carregarPropriedade(), carregarCulturasDisponiveis()])
        : tipoPerfil === 'loja'
        ? carregarAtendimento()
        : tipoPerfil === 'prestador'
        ? carregarServicos()
        : Promise.resolve(null);

    Promise.all([carregarPerfilPublico(), cargaExtra])
      .then(([dadosBasico, extra]) => {
        if (cancelado) return;

        setBasico(dadosBasico);

        if (tipoPerfil === 'produtor') {
          const [dadosPropriedade, culturas] = extra;
          setPropriedade(dadosPropriedade);
          setCulturasDisponiveis(culturas);
        } else if (tipoPerfil === 'loja') {
          setAtendimento({ ...VAZIO_ATENDIMENTO, ...extra, horarios: { ...HORARIOS_VAZIOS, ...extra.horarios } });
          setAtendimentoCidadeOriginal(extra.cidade);
        } else if (tipoPerfil === 'prestador') {
          setServicos(extra);
          setServicosBaseOriginal(extra.base);
        }

        setPronto(true);
      })
      .catch((erro) => {
        if (!cancelado) aviso.erro(erro.message);
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id, tipoPerfil]);

  if (!montado || !passos.length) return null;

  if (!usuario || !pronto) {
    return createPortal(
      <div className={styles.overlay}>
        <div className={styles.modalPanel}>
          <div className={styles.carregando}>
            <Esqueleto altura={28} largura={220} raio={8} />
            <Esqueleto altura={220} raio={16} />
          </div>
        </div>
      </div>,
      document.body
    );
  }

  const passoId = passos[indice];
  const ultimo = indice === passos.length - 1;

  function irPara(proximo) {
    setIndice(Math.max(0, Math.min(passos.length - 1, proximo)));
  }

  function concluir() {
    /* marca como visto MESMO que a completude ainda não passe do limite de
       `lib/onboarding.js` — quem concluiu o assistente já disse "terminei",
       insistir de novo no próximo login seria ignorar essa escolha */
    marcarOnboardingDispensado(usuario?.id);
    aviso.sucesso('Perfil pronto. Você já pode ajustar qualquer detalhe quando quiser.');
    onConcluir?.();
  }

  async function avancar() {
    setSalvando(true);
    try {
      await salvarPassoAtual();
      if (ultimo) concluir();
      else irPara(indice + 1);
    } catch (erro) {
      aviso.erro(erro.message || 'Não foi possível salvar. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  }

  /* pula só o passo ATUAL — usado apenas nos passos opcionais marcados
     `skippable` (hoje, só "maquinas"). O modal em si não tem "pular tudo":
     é obrigatório terminar a sequência */
  function pularPasso() {
    if (ultimo) concluir();
    else irPara(indice + 1);
  }

  async function salvarPassoAtual() {
    if (passoId === 'foto' || passoId === 'area' || passoId === 'identidade') {
      const atual = await salvarPerfilPublico(basico, tipoPerfil, { cidadeOriginal: basico.cidade });
      setBasico(atual);
      return;
    }

    if (passoId === 'culturas' || passoId === 'maquinas') {
      const atual = await salvarPropriedade(propriedade, { cidadeOriginal: propriedade.cidade });
      setPropriedade(atual);
      return;
    }

    if (passoId === 'horarios' || passoId === 'entregas') {
      const atual = await salvarAtendimento(atendimento, { cidadeOriginal: atendimentoCidadeOriginal });
      setAtendimento(atual);
      setAtendimentoCidadeOriginal(atual.cidade);
      return;
    }

    if (passoId === 'comoAtende') {
      const atual = await salvarServicos(servicos, { baseOriginal: servicosBaseOriginal });
      setServicos(atual);
      setServicosBaseOriginal(atual.base);
      return;
    }
  }

  async function enviarFoto(evento) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!arquivo) return;

    setEnviandoFoto(true);
    try {
      const atual = await enviarFotoPerfil(arquivo);
      setBasico((anterior) => ({ ...anterior, fotoUrl: atual.fotoUrl }));
    } catch (erro) {
      aviso.erro(erro.message || 'Não foi possível enviar a foto.');
    } finally {
      setEnviandoFoto(false);
    }
  }

  const skippable = passoId === 'maquinas';

  return createPortal(
    <div className={styles.overlay}>
      <div className={styles.modalPanel} role="dialog" aria-modal="true" aria-label="Assistente de primeiro acesso">
        <div className={styles.root}>
          <header className={styles.topo}>
            <span className={styles.selo}>
              <Icon name={perfil.icone} size={13} />
              {perfil.rotulo}
            </span>

            <h1 className={styles.titulo}>Vamos deixar seu perfil pronto</h1>
            <p className={styles.subtitulo}>
              Poucos passos — só o que o cadastro ainda não perguntou. O que você preencher fica salvo mesmo se sair
              no meio.
            </p>

            <div className={styles.progresso}>
              <span className={styles.progressoTexto}>
                Passo {indice + 1} de {passos.length} — {TITULO_PASSO[passoId]}
              </span>
              <span className={styles.trilho}>
                <span
                  className={styles.preenchimento}
                  style={{ '--largura': `${((indice + 1) / passos.length) * 100}%` }}
                />
              </span>
            </div>
          </header>

          <PainelCartao titulo={TITULO_PASSO[passoId]}>
            {passoId === 'foto' ? (
              <PassoFoto dados={basico} enviandoFoto={enviandoFoto} onEnviarFoto={enviarFoto} />
            ) : null}

            {passoId === 'area' ? <PassoArea dados={basico} setDados={setBasico} /> : null}

            {passoId === 'culturas' ? (
              <PassoCulturas dados={propriedade} setDados={setPropriedade} culturasDisponiveis={culturasDisponiveis} />
            ) : null}

            {passoId === 'maquinas' ? (
              <PassoMaquinas dados={propriedade} setDados={setPropriedade} aviso={aviso} />
            ) : null}

            {passoId === 'identidade' ? <PassoIdentidade dados={basico} setDados={setBasico} /> : null}

            {passoId === 'horarios' ? <PassoHorarios dados={atendimento} setDados={setAtendimento} /> : null}

            {passoId === 'entregas' ? <PassoEntregas dados={atendimento} setDados={setAtendimento} /> : null}

            {passoId === 'comoAtende' ? <PassoComoAtende dados={servicos} setDados={setServicos} /> : null}
          </PainelCartao>

          <div className={styles.acoes}>
            <div className={styles.acoesEsquerda}>
              {indice > 0 ? (
                <Button type="button" variant="ghost" iconLeft="chevron-left" onClick={() => irPara(indice - 1)}>
                  Voltar
                </Button>
              ) : (
                <span />
              )}
            </div>

            <div className={styles.acoesDireita}>
              {skippable ? (
                <button type="button" className={styles.pular} onClick={pularPasso}>
                  Adicionar depois
                </button>
              ) : null}

              <Button type="button" iconRight={ultimo ? 'check' : 'chevron-right'} onClick={avancar} disabled={salvando}>
                {salvando ? 'Salvando…' : ultimo ? 'Concluir' : 'Continuar'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   PASSOS
   ═══════════════════════════════════════════════════════════════════════ */

function PassoFoto({ dados, enviandoFoto, onEnviarFoto }) {
  return (
    <div className={styles.campos}>
      <div className={styles.foto}>
        <span className={styles.avatar}>
          {dados.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dados.fotoUrl} alt="" />
          ) : (
            <Icon name="user" size={20} />
          )}
        </span>

        <div>
          <Button as="label" type="button" variant="outline" size="sm" iconLeft="plus" disabled={enviandoFoto}>
            {enviandoFoto ? 'Enviando…' : dados.fotoUrl ? 'Trocar foto' : 'Enviar foto'}
            <input type="file" accept="image/*" className={styles.arquivoOculto} onChange={onEnviarFoto} />
          </Button>
          <p className={styles.dica}>Opcional, mas perfil com foto recebe mais contato.</p>
        </div>
      </div>
    </div>
  );
}

function PassoArea({ dados, setDados }) {
  const mudar = (chave) => (evento) => setDados((atual) => ({ ...atual, [chave]: evento.target.value }));

  return (
    <div className={styles.campos}>
      <Field label="Área total" htmlFor="areaHectares" hint="Em hectares — opcional">
        <Input id="areaHectares" value={dados.areaHectares} onChange={mudar('areaHectares')} placeholder="1.400" inputMode="numeric" />
      </Field>
    </div>
  );
}

function PassoIdentidade({ dados, setDados }) {
  const mudar = (chave) => (evento) => setDados((atual) => ({ ...atual, [chave]: evento.target.value }));

  return (
    <div className={styles.campos}>
      <div className={styles.duplo}>
        <Field label="Razão social" htmlFor="razaoSocial" hint="Opcional">
          <Input id="razaoSocial" value={dados.razaoSocial} onChange={mudar('razaoSocial')} />
        </Field>

        <Field label="Nome fantasia" htmlFor="nomeFantasia" hint="Opcional">
          <Input id="nomeFantasia" value={dados.nomeFantasia} onChange={mudar('nomeFantasia')} />
        </Field>
      </div>
    </div>
  );
}

function PassoCulturas({ dados, setDados, culturasDisponiveis }) {
  function alternar(cultura) {
    setDados((atual) => ({
      ...atual,
      culturas: atual.culturas.includes(cultura)
        ? atual.culturas.filter((item) => item !== cultura)
        : [...atual.culturas, cultura],
    }));
  }

  return (
    <div className={styles.fichas}>
      {culturasDisponiveis.map((cultura) => {
        const marcada = dados.culturas.includes(cultura);
        return (
          <button
            key={cultura}
            type="button"
            className={`${styles.ficha} ${marcada ? styles.fichaAtiva : ''}`}
            onClick={() => alternar(cultura)}
            aria-pressed={marcada}
          >
            {marcada ? <Icon name="check" size={12} /> : null}
            {cultura}
          </button>
        );
      })}
    </div>
  );
}

function PassoMaquinas({ dados, setDados, aviso }) {
  const [nova, setNova] = useState({ tipo: 'trator', marca: '', modelo: '', ano: '' });

  function adicionar() {
    if (!nova.marca.trim() || !nova.modelo.trim()) {
      aviso.erro('Informe marca e modelo — é o que permite achar a peça certa.');
      return;
    }

    setDados((atual) => ({
      ...atual,
      maquinas: [...atual.maquinas, { ...nova, id: `m${Date.now()}`, marca: nova.marca.trim(), modelo: nova.modelo.trim() }],
    }));
    setNova({ tipo: 'trator', marca: '', modelo: '', ano: '' });
  }

  function remover(maquina) {
    setDados((atual) => ({ ...atual, maquinas: atual.maquinas.filter((item) => item.id !== maquina.id) }));
  }

  return (
    <div>
      {dados.maquinas.length ? (
        <ul className={styles.maquinas}>
          {dados.maquinas.map((maquina) => {
            const tipo = TIPOS_MAQUINA.find((item) => item.id === maquina.tipo) || TIPOS_MAQUINA[0];
            return (
              <li key={maquina.id} className={styles.maquina}>
                <Icon name={tipo.icone} size={16} />
                <span className={styles.maquinaTexto}>
                  <strong>{maquina.marca} {maquina.modelo}</strong>
                  <span>{tipo.rotulo}{maquina.ano ? ` · ${maquina.ano}` : ''}</span>
                </span>
                <button type="button" className={styles.remover} onClick={() => remover(maquina)} aria-label="Remover">
                  <Icon name="trash" size={15} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.dica}>
          Nenhuma máquina ainda. Pode adicionar agora ou continuar sem — dá para cadastrar depois em
          &nbsp;“Minha propriedade”.
        </p>
      )}

      <div className={styles.novaLinha}>
        <Field label="Tipo" htmlFor="tipoMaquina">
          <Input as="select" id="tipoMaquina" value={nova.tipo} onChange={(e) => setNova({ ...nova, tipo: e.target.value })}>
            {TIPOS_MAQUINA.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>{tipo.rotulo}</option>
            ))}
          </Input>
        </Field>

        <Field label="Marca" htmlFor="marcaMaquina">
          <Input id="marcaMaquina" value={nova.marca} onChange={(e) => setNova({ ...nova, marca: e.target.value })} placeholder="John Deere" />
        </Field>

        <Field label="Modelo" htmlFor="modeloMaquina">
          <Input id="modeloMaquina" value={nova.modelo} onChange={(e) => setNova({ ...nova, modelo: e.target.value })} placeholder="6110J" />
        </Field>

        <Field label="Ano" htmlFor="anoMaquina">
          <Input id="anoMaquina" value={nova.ano} onChange={(e) => setNova({ ...nova, ano: e.target.value })} placeholder="2018" inputMode="numeric" />
        </Field>
      </div>

      <Button type="button" variant="outline" iconLeft="plus" onClick={adicionar} className={styles.botaoAdicionar}>
        Adicionar máquina
      </Button>
    </div>
  );
}

function PassoHorarios({ dados, setDados }) {
  function mudarHorario(diaId, campo, valor) {
    setDados((atual) => ({
      ...atual,
      horarios: { ...atual.horarios, [diaId]: { ...atual.horarios[diaId], [campo]: valor } },
    }));
  }

  function alternarDia(diaId) {
    const dia = dados.horarios[diaId];
    mudarHorario(diaId, 'aberto', !dia.aberto);
  }

  return (
    <ul className={styles.dias}>
      {DIAS.map((dia) => {
        const horario = dados.horarios[dia.id];
        return (
          <li key={dia.id} className={styles.dia}>
            <PainelChave ligada={horario.aberto} onMudar={() => alternarDia(dia.id)} rotulo={`${dia.rotulo}`} />
            <span className={styles.diaNome}>{dia.rotulo}</span>

            {horario.aberto ? (
              <div className={styles.horas}>
                <input type="time" className={styles.hora} value={horario.de} onChange={(e) => mudarHorario(dia.id, 'de', e.target.value)} />
                <span>às</span>
                <input type="time" className={styles.hora} value={horario.ate} onChange={(e) => mudarHorario(dia.id, 'ate', e.target.value)} />
              </div>
            ) : (
              <span className={styles.fechado}>Fechado</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function PassoEntregas({ dados, setDados }) {
  function alternar(formaId) {
    setDados((atual) => ({
      ...atual,
      entregas: atual.entregas.includes(formaId)
        ? atual.entregas.filter((item) => item !== formaId)
        : [...atual.entregas, formaId],
    }));
  }

  const mudar = (chave) => (evento) => setDados((atual) => ({ ...atual, [chave]: evento.target.value }));

  return (
    <div>
      <div className={styles.opcoes}>
        {FORMAS_ENTREGA.map((forma) => {
          const marcada = dados.entregas.includes(forma.id);
          return (
            <button
              key={forma.id}
              type="button"
              className={`${styles.opcao} ${marcada ? styles.opcaoAtiva : ''}`}
              onClick={() => alternar(forma.id)}
              aria-pressed={marcada}
            >
              {marcada ? <Icon name="check" size={12} /> : null}
              <span>
                <strong>{forma.rotulo}</strong>
                <span className={styles.opcaoDescricao}>{forma.descricao}</span>
              </span>
            </button>
          );
        })}
      </div>

      {dados.entregas.includes('regiao') ? (
        <div className={styles.extra}>
          <Field label="Raio de entrega" htmlFor="raioEntrega" hint="Em quilômetros, a partir da loja">
            <Input id="raioEntrega" value={dados.raioEntrega} onChange={mudar('raioEntrega')} inputMode="numeric" />
          </Field>
        </div>
      ) : null}
    </div>
  );
}

function PassoComoAtende({ dados, setDados }) {
  const mudar = (chave) => (evento) => setDados((atual) => ({ ...atual, [chave]: evento.target.value }));

  function alternarForma(formaId) {
    setDados((atual) => ({
      ...atual,
      formas: atual.formas.includes(formaId)
        ? atual.formas.filter((item) => item !== formaId)
        : [...atual.formas, formaId],
    }));
  }

  return (
    <div>
      <div className={styles.opcoes}>
        {FORMAS_ATENDIMENTO.map((forma) => {
          const marcada = dados.formas.includes(forma.id);
          return (
            <button
              key={forma.id}
              type="button"
              className={`${styles.opcao} ${marcada ? styles.opcaoAtiva : ''}`}
              onClick={() => alternarForma(forma.id)}
              aria-pressed={marcada}
            >
              {marcada ? <Icon name="check" size={12} /> : null}
              <span>
                <strong>{forma.rotulo}</strong>
                <span className={styles.opcaoDescricao}>{forma.descricao}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className={styles.duplo}>
        <Field label="Base de atendimento" htmlFor="base" hint="De onde você sai para os chamados">
          <Input id="base" value={dados.base} onChange={mudar('base')} iconLeft="pin" />
        </Field>

        <Field label="Raio de atendimento" htmlFor="raio">
          <Input as="select" id="raio" value={dados.raio} onChange={mudar('raio')}>
            {RAIOS.map((raio) => (
              <option key={raio} value={raio}>{raio}</option>
            ))}
          </Input>
        </Field>
      </div>
    </div>
  );
}
