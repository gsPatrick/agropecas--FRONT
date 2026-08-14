'use client';

/**
 * Atendimento — a tela exclusiva da loja (Maturacao/05 §2).
 *
 * Horário e entrega são as duas perguntas que a loja mais responde no
 * WhatsApp. Publicadas no perfil, param de ser perguntadas — e o comprador
 * que chega às 19h sabe que a resposta sai amanhã, em vez de achar que foi
 * ignorado e procurar outro.
 *
 * Os horários vêm preenchidos com o padrão do setor (dias úteis 7h30–18h,
 * sábado meio período). Sete linhas em branco fariam a loja abandonar a tela
 * na terceira.
 */

import { useEffect, useState } from 'react';
import PainelTopo from '@/components/PainelTopo/PainelTopo';
import PainelCartao from '@/components/PainelCartao/PainelCartao';
import PainelBarraSalvar from '@/components/PainelBarraSalvar/PainelBarraSalvar';
import Field from '@/components/Field/Field';
import Input from '@/components/Input/Input';
import CampoCidadeCep from '@/components/CampoCidadeCep/CampoCidadeCep';
import Icon from '@/components/Icon/Icon';
import PainelChave from '@/components/PainelChave/PainelChave';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import { useSessao } from '@/lib/sessao';
import { DIAS, FORMAS_ENTREGA, pendenciasExclusivas } from '@/lib/exclusivas-mock';
import { carregarAtendimento, salvarAtendimento } from '@/lib/dados/exclusivas';
import styles from './page.module.css';

/* estado enquanto a API não respondeu — mesmo formato do que vem de lá, para
   a tela não checar `null` em campo nenhum */
const VAZIO = {
  endereco: '',
  cidade: '',
  telefone: '',
  whatsapp: '',
  horarios: Object.fromEntries(DIAS.map((dia) => [dia.id, { aberto: false, de: '', ate: '' }])),
  entregas: [],
  raioEntrega: '',
  prazoResposta: 'Poucas horas',
  observacao: '',
};

export default function AtendimentoPage() {
  const { perfil, usuario } = useSessao();
  const aviso = useAviso();

  const [dados, setDados] = useState(VAZIO);
  const [salvo, setSalvo] = useState(VAZIO);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    if (!usuario) return undefined;

    let cancelado = false;

    carregarAtendimento()
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
  }, [usuario?.id]);

  if (!usuario || !pronto) return null;

  const alterado = JSON.stringify(dados) !== JSON.stringify(salvo);
  const pendencias = pendenciasExclusivas('loja', dados);
  const abertos = DIAS.filter((dia) => dados.horarios[dia.id].aberto);

  const mudar = (chave) => (evento) =>
    setDados((atual) => ({ ...atual, [chave]: evento.target.value }));

  function mudarHorario(diaId, campo, valor) {
    setDados((atual) => ({
      ...atual,
      horarios: {
        ...atual.horarios,
        [diaId]: { ...atual.horarios[diaId], [campo]: valor },
      },
    }));
  }

  function alternarDia(diaId) {
    const dia = dados.horarios[diaId];

    mudarHorario(diaId, 'aberto', !dia.aberto);

    /* ao abrir um dia que estava fechado, herda o horário do dia anterior
       aberto: preencher de novo o mesmo 07:30–18:00 sete vezes é trabalho
       que o sistema pode poupar */
    if (!dia.aberto && !dia.de) {
      const modelo = abertos[0];

      if (modelo) {
        setDados((atual) => ({
          ...atual,
          horarios: {
            ...atual.horarios,
            [diaId]: {
              aberto: true,
              de: atual.horarios[modelo.id].de,
              ate: atual.horarios[modelo.id].ate,
            },
          },
        }));
      }
    }
  }

  function alternarEntrega(formaId) {
    setDados((atual) => ({
      ...atual,
      entregas: atual.entregas.includes(formaId)
        ? atual.entregas.filter((item) => item !== formaId)
        : [...atual.entregas, formaId],
    }));
  }

  async function salvar(evento) {
    evento.preventDefault();

    try {
      const atual = await salvarAtendimento(dados, { cidadeOriginal: salvo.cidade });

      setDados(atual);
      setSalvo(atual);
      aviso.sucesso('Atendimento atualizado. Já aparece no seu perfil público.');
    } catch (erro) {
      aviso.erro(erro.message);
    }
  }

  return (
    <>
      <PainelTopo
        perfil={perfil}
        titulo="Atendimento"
        descricao="Horários, entrega e como falar com a loja"
      />

      {pendencias.length ? (
        <div className={styles.pendencias}>
          <Icon name="bell" size={16} />
          <span>Falta preencher: {pendencias.join(' · ')}</span>
        </div>
      ) : null}

      <form className={styles.coluna} onSubmit={salvar}>
        <PainelCartao titulo="Onde e como falar com você" icone="store">
          <div className={styles.campos}>
            <Field label="Endereço da loja" htmlFor="endereco">
              <Input
                id="endereco"
                value={dados.endereco}
                onChange={mudar('endereco')}
                iconLeft="pin"
              />
            </Field>

            <div className={styles.duplo}>
              <CampoCidadeCep
                id="cidade"
                value={dados.cidade}
                onChange={(texto) => setDados((atual) => ({ ...atual, cidade: texto }))}
              />

              <Field label="Telefone fixo" htmlFor="telefone">
                <Input id="telefone" value={dados.telefone} onChange={mudar('telefone')} />
              </Field>
            </div>

            <div className={styles.duplo}>
              <Field
                label="WhatsApp do balcão"
                htmlFor="whatsapp"
                hint="É por onde a maioria dos pedidos chega"
              >
                <Input
                  id="whatsapp"
                  value={dados.whatsapp}
                  onChange={mudar('whatsapp')}
                  placeholder="(65) 90000-0000"
                />
              </Field>

              <Field
                label="Costuma responder em"
                htmlFor="prazoResposta"
                hint="Aparece no perfil — expectativa clara evita cobrança"
              >
                <Input
                  as="select"
                  id="prazoResposta"
                  value={dados.prazoResposta}
                  onChange={mudar('prazoResposta')}
                >
                  {['Poucos minutos', 'Poucas horas', 'Mesmo dia', 'Próximo dia útil'].map(
                    (opcao) => (
                      <option key={opcao} value={opcao}>
                        {opcao}
                      </option>
                    )
                  )}
                </Input>
              </Field>
            </div>
          </div>
        </PainelCartao>

        <PainelCartao
          titulo="Horário de funcionamento"
          descricao={
            abertos.length
              ? `Aberto em ${abertos.length} dia(s) da semana.`
              : 'Nenhum dia marcado — o perfil vai dizer que a loja está sempre fechada.'
          }
          icone="clock"
          semPadding
        >
          <ul className={styles.dias}>
            {DIAS.map((dia) => {
              const horario = dados.horarios[dia.id];

              return (
                <li
                  key={dia.id}
                  className={`${styles.dia} ${horario.aberto ? '' : styles.diaFechado}`}
                >
                  <PainelChave
                    ligada={horario.aberto}
                    onMudar={() => alternarDia(dia.id)}
                    rotulo={`${dia.rotulo}: ${horario.aberto ? 'aberto' : 'fechado'}`}
                  />

                  <span className={styles.diaNome}>{dia.rotulo}</span>

                  {horario.aberto ? (
                    <div className={styles.horas}>
                      <input
                        type="time"
                        className={styles.hora}
                        value={horario.de}
                        onChange={(evento) => mudarHorario(dia.id, 'de', evento.target.value)}
                        aria-label={`Abre ${dia.rotulo}`}
                      />

                      <span className={styles.ate}>às</span>

                      <input
                        type="time"
                        className={styles.hora}
                        value={horario.ate}
                        onChange={(evento) => mudarHorario(dia.id, 'ate', evento.target.value)}
                        aria-label={`Fecha ${dia.rotulo}`}
                      />
                    </div>
                  ) : (
                    <span className={styles.fechado}>Fechado</span>
                  )}
                </li>
              );
            })}
          </ul>
        </PainelCartao>

        <PainelCartao
          titulo="Entrega"
          descricao="Como a peça chega até quem comprou."
          icone="pump"
        >
          <div className={styles.opcoes}>
            {FORMAS_ENTREGA.map((forma) => {
              const marcada = dados.entregas.includes(forma.id);

              return (
                <button
                  key={forma.id}
                  type="button"
                  className={`${styles.opcao} ${marcada ? styles.opcaoAtiva : ''}`}
                  onClick={() => alternarEntrega(forma.id)}
                  aria-pressed={marcada}
                >
                  <span className={styles.marca}>
                    {marcada ? <Icon name="check" size={12} /> : null}
                  </span>

                  <span className={styles.opcaoTexto}>
                    <strong>{forma.rotulo}</strong>
                    <span>{forma.descricao}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {dados.entregas.includes('regiao') ? (
            <div className={styles.extra}>
              <Field
                label="Raio de entrega"
                htmlFor="raioEntrega"
                hint="Em quilômetros, a partir da loja"
              >
                <Input
                  id="raioEntrega"
                  value={dados.raioEntrega}
                  onChange={mudar('raioEntrega')}
                  inputMode="numeric"
                />
              </Field>
            </div>
          ) : null}

          <div className={styles.extra}>
            <Field
              label="Observação para o cliente"
              htmlFor="observacao"
              hint="Aparece junto do horário no seu perfil"
            >
              <Input
                as="textarea"
                id="observacao"
                rows={3}
                value={dados.observacao}
                onChange={mudar('observacao')}
              />
            </Field>
          </div>
        </PainelCartao>

        <PainelBarraSalvar
          alterado={alterado}
          onDescartar={() => {
            setDados(salvo);
            aviso.info('Alterações descartadas.');
          }}
          textoSalvo="Atendimento em dia"
        />
      </form>
    </>
  );
}
