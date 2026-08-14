'use client';

/**
 * Assistente de primeiro acesso — um fluxo por tipo de perfil, para que ao
 * chegar em `/painel/perfil` (ou `/conta`, para quem só compra) o perfil já
 * esteja preenchido.
 *
 * NÃO é uma tela nova de edição: cada passo escreve nos MESMOS campos que as
 * telas completas já escrevem (`/painel/perfil`, `/painel/propriedade`,
 * `/painel/atendimento`, `/painel/servicos`, `/conta`), pelas MESMAS funções
 * de `lib/dados/*`. O assistente é só uma outra forma de chegar até eles —
 * sequencial em vez de um formulário só, com progresso salvo passo a passo.
 *
 * Cada "Continuar" SALVA de verdade (chama o `salvar*` de verdade), não
 * acumula em memória para gravar tudo no fim: se a pessoa fechar a aba no
 * meio, o que já preencheu não se perde — é o mesmo comportamento de
 * qualquer uma das telas completas.
 *
 * Os passos por tipo:
 *  · produtor  → básico · propriedade · culturas · maquinário (pulável)
 *  · loja      → básico · atendimento · horário · entrega
 *  · prestador → básico · serviços (mín. 3) · como atende
 *  · cliente   → só o básico — não tem seção exclusiva
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PainelCartao from '@/components/PainelCartao/PainelCartao';
import Field from '@/components/Field/Field';
import Input from '@/components/Input/Input';
import Button from '@/components/Button/Button';
import Icon from '@/components/Icon/Icon';
import PainelChave from '@/components/PainelChave/PainelChave';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import {
  carregarPerfilPublico,
  salvarPerfilPublico,
  enviarFotoPerfil,
  LIMITE_SOBRE,
} from '@/lib/dados/perfil-publico';
import { carregarDadosPessoais, salvarDadosPessoais } from '@/lib/dados/conta';
import {
  carregarPropriedade,
  salvarPropriedade,
  carregarCulturasDisponiveis,
  carregarAtendimento,
  salvarAtendimento,
  carregarServicos,
  salvarServicos,
  carregarCatalogoServicos,
} from '@/lib/dados/exclusivas';
import { TIPOS_MAQUINA, DIAS, FORMAS_ENTREGA, FORMAS_ATENDIMENTO, RAIOS } from '@/lib/exclusivas-mock';
import { marcarOnboardingDispensado } from '@/lib/onboarding';
import styles from './Onboarding.module.css';

/** um passo por tipo de perfil — a ordem AQUI é a ordem na tela */
const PASSOS_POR_TIPO = {
  produtor: ['basico', 'propriedade', 'culturas', 'maquinas'],
  loja: ['basico', 'atendimento', 'horarios', 'entregas'],
  prestador: ['basico', 'servicos', 'comoAtende'],
  cliente: ['basico'],
};

const TITULO_PASSO = {
  basico: 'Dados básicos',
  propriedade: 'Sua propriedade',
  culturas: 'O que você produz',
  maquinas: 'Seu maquinário',
  atendimento: 'Atendimento',
  horarios: 'Horário de funcionamento',
  entregas: 'Formas de entrega',
  servicos: 'Serviços que você presta',
  comoAtende: 'Como você atende',
};

const HORARIOS_VAZIOS = Object.fromEntries(
  DIAS.map((dia) => [dia.id, { aberto: false, de: '', ate: '' }])
);

const VAZIO_BASICO = { fotoUrl: '', sobre: '', telefone: '', whatsapp: '', cidade: '' };
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

export default function Onboarding({ tipoPerfil, perfil, usuario, rotaFinal }) {
  const router = useRouter();
  const aviso = useAviso();

  const passos = PASSOS_POR_TIPO[tipoPerfil] || PASSOS_POR_TIPO.cliente;
  const [indice, setIndice] = useState(0);
  const [pronto, setPronto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [basico, setBasico] = useState(VAZIO_BASICO);
  const [basicoSalvo, setBasicoSalvo] = useState(VAZIO_BASICO);
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  const [propriedade, setPropriedade] = useState(VAZIO_PROPRIEDADE);
  const [culturasDisponiveis, setCulturasDisponiveis] = useState([]);

  const [atendimento, setAtendimento] = useState(VAZIO_ATENDIMENTO);

  const [servicos, setServicos] = useState(VAZIO_SERVICOS);
  const [catalogoServicos, setCatalogoServicos] = useState([]);

  const ehCliente = tipoPerfil === 'cliente';

  /* carga inicial — o básico sempre, mais a seção exclusiva do tipo. Em
     paralelo: são rotas independentes, encadear dobraria a espera */
  useEffect(() => {
    if (!usuario) return undefined;
    let cancelado = false;

    const cargaBasico = ehCliente
      ? carregarDadosPessoais().then((dados) => ({
          fotoUrl: '',
          sobre: '',
          telefone: dados.telefone,
          whatsapp: dados.whatsapp,
          cidade: dados.cidade,
        }))
      : carregarPerfilPublico();

    const cargaExtra =
      tipoPerfil === 'produtor'
        ? Promise.all([carregarPropriedade(), carregarCulturasDisponiveis()])
        : tipoPerfil === 'loja'
        ? carregarAtendimento()
        : tipoPerfil === 'prestador'
        ? Promise.all([carregarServicos(), carregarCatalogoServicos()])
        : Promise.resolve(null);

    Promise.all([cargaBasico, cargaExtra])
      .then(([dadosBasico, extra]) => {
        if (cancelado) return;

        setBasico(dadosBasico);
        setBasicoSalvo(dadosBasico);

        if (tipoPerfil === 'produtor') {
          const [dadosPropriedade, culturas] = extra;
          setPropriedade(dadosPropriedade);
          setCulturasDisponiveis(culturas);
        } else if (tipoPerfil === 'loja') {
          setAtendimento({ ...VAZIO_ATENDIMENTO, ...extra, horarios: { ...HORARIOS_VAZIOS, ...extra.horarios } });
        } else if (tipoPerfil === 'prestador') {
          const [dadosServicos, catalogo] = extra;
          setServicos(dadosServicos);
          setCatalogoServicos(catalogo);
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

  if (!usuario || !pronto) {
    return (
      <div className={styles.carregando}>
        <Esqueleto altura={28} largura={220} raio={8} />
        <Esqueleto altura={220} raio={16} />
      </div>
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
    router.push(rotaFinal);
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

  function pular() {
    if (ultimo) concluir();
    else irPara(indice + 1);
  }

  async function salvarPassoAtual() {
    if (passoId === 'basico') {
      if (ehCliente) {
        const atual = await salvarDadosPessoais(
          { nome: usuario.nome, telefone: basico.telefone, whatsapp: basico.whatsapp, cidade: basico.cidade },
          { cidadeOriginal: basicoSalvo.cidade }
        );
        const proximo = { ...basico, telefone: atual.telefone, whatsapp: atual.whatsapp, cidade: atual.cidade };
        setBasico(proximo);
        setBasicoSalvo(proximo);
      } else {
        const atual = await salvarPerfilPublico(basico, tipoPerfil, { cidadeOriginal: basicoSalvo.cidade });
        setBasico(atual);
        setBasicoSalvo(atual);
      }
      return;
    }

    if (passoId === 'propriedade' || passoId === 'culturas' || passoId === 'maquinas') {
      const atual = await salvarPropriedade(propriedade, { cidadeOriginal: propriedade.cidade });
      setPropriedade(atual);
      return;
    }

    if (passoId === 'atendimento' || passoId === 'horarios' || passoId === 'entregas') {
      const atual = await salvarAtendimento(atendimento, { cidadeOriginal: atendimento.cidade });
      setAtendimento(atual);
      return;
    }

    if (passoId === 'servicos' || passoId === 'comoAtende') {
      const atual = await salvarServicos(servicos, { baseOriginal: servicos.base });
      setServicos(atual);
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
      setBasico(atual);
      setBasicoSalvo(atual);
    } catch (erro) {
      aviso.erro(erro.message || 'Não foi possível enviar a foto.');
    } finally {
      setEnviandoFoto(false);
    }
  }

  const skippable = passoId === 'maquinas';

  const podeAvancar = validarPasso(passoId, { basico, propriedade, servicos });

  function fazerDepois() {
    marcarOnboardingDispensado(usuario?.id);
    router.push(rotaFinal);
  }

  return (
    <div className={styles.root}>
      <header className={styles.topo}>
        <div className={styles.topoLinha}>
          <span className={styles.selo}>
            <Icon name={perfil.icone} size={13} />
            {perfil.rotulo}
          </span>

          <button type="button" className={styles.fazerDepois} onClick={fazerDepois}>
            Fazer isso depois
          </button>
        </div>

        <h1 className={styles.titulo}>Vamos deixar seu perfil pronto</h1>
        <p className={styles.subtitulo}>
          Poucos passos, e o que você já preencher fica salvo mesmo se sair no meio.
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
        {passoId === 'basico' ? (
          <PassoBasico
            dados={basico}
            setDados={setBasico}
            ehCliente={ehCliente}
            enviandoFoto={enviandoFoto}
            onEnviarFoto={enviarFoto}
          />
        ) : null}

        {passoId === 'propriedade' ? (
          <PassoPropriedade dados={propriedade} setDados={setPropriedade} />
        ) : null}

        {passoId === 'culturas' ? (
          <PassoCulturas
            dados={propriedade}
            setDados={setPropriedade}
            culturasDisponiveis={culturasDisponiveis}
          />
        ) : null}

        {passoId === 'maquinas' ? (
          <PassoMaquinas dados={propriedade} setDados={setPropriedade} aviso={aviso} />
        ) : null}

        {passoId === 'atendimento' ? (
          <PassoAtendimento dados={atendimento} setDados={setAtendimento} />
        ) : null}

        {passoId === 'horarios' ? (
          <PassoHorarios dados={atendimento} setDados={setAtendimento} />
        ) : null}

        {passoId === 'entregas' ? (
          <PassoEntregas dados={atendimento} setDados={setAtendimento} />
        ) : null}

        {passoId === 'servicos' ? (
          <PassoServicos dados={servicos} setDados={setServicos} catalogo={catalogoServicos} />
        ) : null}

        {passoId === 'comoAtende' ? (
          <PassoComoAtende dados={servicos} setDados={setServicos} />
        ) : null}
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
            <button type="button" className={styles.pular} onClick={pular}>
              Adicionar depois
            </button>
          ) : null}

          <Button
            type="button"
            iconRight={ultimo ? 'check' : 'chevron-right'}
            onClick={avancar}
            disabled={salvando || !podeAvancar}
          >
            {salvando ? 'Salvando…' : ultimo ? 'Concluir' : 'Continuar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── validação mínima por passo — só o que impede um "Continuar" vazio de
   sentido; o resto fica a critério de quem preenche */
function validarPasso(passoId, { basico, servicos }) {
  if (passoId === 'basico') return Boolean(basico.cidade?.trim());
  if (passoId === 'servicos') return servicos.servicos.length >= 3;
  return true;
}

/* ═══════════════════════════════════════════════════════════════════════
   PASSOS
   ═══════════════════════════════════════════════════════════════════════ */

function PassoBasico({ dados, setDados, ehCliente, enviandoFoto, onEnviarFoto }) {
  const mudar = (chave) => (evento) => setDados((atual) => ({ ...atual, [chave]: evento.target.value }));

  return (
    <div className={styles.campos}>
      {!ehCliente ? (
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
      ) : null}

      {!ehCliente ? (
        <Field
          label="Sobre o seu negócio"
          htmlFor="sobre"
          hint={`${dados.sobre.length}/${LIMITE_SOBRE} — conte o que você faz e como atende`}
        >
          <Input as="textarea" id="sobre" rows={4} maxLength={LIMITE_SOBRE} value={dados.sobre} onChange={mudar('sobre')} />
        </Field>
      ) : null}

      <div className={styles.duplo}>
        <Field label="Telefone" htmlFor="telefone">
          <Input id="telefone" value={dados.telefone} onChange={mudar('telefone')} placeholder="(65) 90000-0000" />
        </Field>

        <Field label="WhatsApp" htmlFor="whatsapp" hint="Onde a maioria vai te chamar">
          <Input id="whatsapp" value={dados.whatsapp} onChange={mudar('whatsapp')} placeholder="(65) 90000-0000" />
        </Field>
      </div>

      <Field label="Cidade e estado" htmlFor="cidade" required hint="Define em quais buscas você aparece primeiro">
        <Input id="cidade" value={dados.cidade} onChange={mudar('cidade')} placeholder="Sorriso · MT" iconLeft="pin" />
      </Field>
    </div>
  );
}

function PassoPropriedade({ dados, setDados }) {
  const mudar = (chave) => (evento) => setDados((atual) => ({ ...atual, [chave]: evento.target.value }));

  return (
    <div className={styles.campos}>
      <div className={styles.duplo}>
        <Field label="Nome da propriedade" htmlFor="nome">
          <Input id="nome" value={dados.nome} onChange={mudar('nome')} />
        </Field>

        <Field label="Área total" htmlFor="area" hint="Em hectares — opcional">
          <Input id="area" value={dados.area} onChange={mudar('area')} placeholder="1.400" />
        </Field>
      </div>

      <div className={styles.duplo}>
        <Field label="Cidade e estado" htmlFor="cidadeSede">
          <Input id="cidadeSede" value={dados.cidade} onChange={mudar('cidade')} iconLeft="pin" />
        </Field>

        <Field label="Telefone da sede" htmlFor="contatoSede" hint="Quem atende no portão nem sempre é quem anuncia">
          <Input id="contatoSede" value={dados.contatoSede} onChange={mudar('contatoSede')} placeholder="(65) 3000-0000" />
        </Field>
      </div>

      <Field label="Ponto de referência" htmlFor="referencia" hint="Ajuda quem vai entregar peça ou prestar serviço a chegar">
        <Input as="textarea" id="referencia" rows={2} value={dados.referencia} onChange={mudar('referencia')} />
      </Field>
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

function PassoAtendimento({ dados, setDados }) {
  const mudar = (chave) => (evento) => setDados((atual) => ({ ...atual, [chave]: evento.target.value }));

  return (
    <div className={styles.campos}>
      <Field label="Endereço da loja" htmlFor="endereco">
        <Input id="endereco" value={dados.endereco} onChange={mudar('endereco')} iconLeft="pin" />
      </Field>

      <div className={styles.duplo}>
        <Field label="Cidade e estado" htmlFor="cidadeLoja">
          <Input id="cidadeLoja" value={dados.cidade} onChange={mudar('cidade')} />
        </Field>

        <Field label="Telefone fixo" htmlFor="telefoneLoja">
          <Input id="telefoneLoja" value={dados.telefone} onChange={mudar('telefone')} />
        </Field>
      </div>

      <Field label="WhatsApp do balcão" htmlFor="whatsappLoja" hint="É por onde a maioria dos pedidos chega">
        <Input id="whatsappLoja" value={dados.whatsapp} onChange={mudar('whatsapp')} placeholder="(65) 90000-0000" />
      </Field>
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

const semAcento = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function PassoServicos({ dados, setDados, catalogo }) {
  const [busca, setBusca] = useState('');
  const termo = semAcento(busca.trim());

  const grupos = catalogo
    .map((grupo) => ({ ...grupo, itens: termo ? grupo.itens.filter((item) => semAcento(item).includes(termo)) : grupo.itens }))
    .filter((grupo) => grupo.itens.length);

  function alternar(servico) {
    setDados((atual) => ({
      ...atual,
      servicos: atual.servicos.includes(servico)
        ? atual.servicos.filter((item) => item !== servico)
        : [...atual.servicos, servico],
    }));
  }

  return (
    <div>
      <p className={styles.dica}>{dados.servicos.length}/3 selecionados no mínimo — são eles que colocam você na busca.</p>

      <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar serviço" iconLeft="search" className={styles.busca} />

      {dados.servicos.length ? (
        <div className={styles.selecionados}>
          {dados.servicos.map((servico) => (
            <button key={servico} type="button" className={styles.selecionado} onClick={() => alternar(servico)}>
              {servico}
              <Icon name="close" size={12} />
            </button>
          ))}
        </div>
      ) : null}

      <div className={styles.grupos}>
        {grupos.map((grupo) => (
          <div key={grupo.grupo} className={styles.grupo}>
            <h3 className={styles.grupoNome}>{grupo.grupo}</h3>
            <div className={styles.fichas}>
              {grupo.itens.map((item) => {
                const marcado = dados.servicos.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    className={`${styles.ficha} ${marcado ? styles.fichaAtiva : ''}`}
                    onClick={() => alternar(item)}
                    aria-pressed={marcado}
                  >
                    {marcado ? <Icon name="check" size={12} /> : null}
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
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
