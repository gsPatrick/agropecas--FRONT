'use client';

/**
 * Meus serviços — a tela exclusiva do prestador (Maturacao/05 §2).
 *
 * Duas decisões definem se ele aparece na busca certa: **o que faz** e **até
 * onde vai**. Por isso o catálogo vem primeiro e o raio logo abaixo, sem
 * cadastro longo no meio.
 *
 * O serviço é escolhido de uma lista, não digitado. Em campo livre, "retífica
 * de cabeçote" e "retificar cabecote" viram dois serviços diferentes, e nenhum
 * dos dois aparece na busca do outro — o prestador some da procura achando que
 * está cadastrado.
 */

import { useEffect, useState } from 'react';
import PainelTopo from '@/components/PainelTopo/PainelTopo';
import PainelCartao from '@/components/PainelCartao/PainelCartao';
import PainelBarraSalvar from '@/components/PainelBarraSalvar/PainelBarraSalvar';
import Field from '@/components/Field/Field';
import Input from '@/components/Input/Input';
import Icon from '@/components/Icon/Icon';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import { useSessao } from '@/lib/sessao';
import { RAIOS, FORMAS_ATENDIMENTO, pendenciasExclusivas } from '@/lib/vocabulario-exclusivas';
import {
  carregarServicos,
  salvarServicos,
  carregarCatalogoServicos,
} from '@/lib/dados/exclusivas';
import styles from './page.module.css';

/* estado enquanto a API não respondeu — mesmo formato do que vem de lá */
const VAZIO = {
  servicos: [],
  raio: '200 km',
  base: '',
  formas: [],
  cobraDeslocamento: 'Sim, acima do raio informado',
  prazo: 'Em até 48 h',
  equipe: '',
  observacao: '',
};

/* escapes explícitos: a faixa de acentos escrita com os próprios caracteres
   combinantes some em qualquer normalização de arquivo */
const semAcento = (texto) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function ServicosPage() {
  const { perfil, usuario } = useSessao();
  const aviso = useAviso();

  const [dados, setDados] = useState(VAZIO);
  const [salvo, setSalvo] = useState(VAZIO);
  const [busca, setBusca] = useState('');
  const [catalogoApi, setCatalogoApi] = useState([]);
  const [pronto, setPronto] = useState(false);

  /* perfil e catálogo em paralelo: são duas rotas independentes, e encadeá-las
     dobraria o tempo até a tela aparecer */
  useEffect(() => {
    if (!usuario) return undefined;

    let cancelado = false;

    Promise.all([carregarServicos(), carregarCatalogoServicos()])
      .then(([atual, catalogo]) => {
        if (cancelado) return;
        setDados(atual);
        setSalvo(atual);
        setCatalogoApi(catalogo);
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
  const pendencias = pendenciasExclusivas('prestador', dados);

  const termo = semAcento(busca.trim());

  /* a busca filtra dentro dos grupos e descarta os que ficaram vazios: um
     título de grupo sem nenhum item embaixo parece falha da busca */
  const catalogo = catalogoApi.map((grupo) => ({
    ...grupo,
    itens: termo ? grupo.itens.filter((item) => semAcento(item).includes(termo)) : grupo.itens,
  })).filter((grupo) => grupo.itens.length);

  const mudar = (chave) => (evento) =>
    setDados((atual) => ({ ...atual, [chave]: evento.target.value }));

  function alternarServico(servico) {
    setDados((atual) => ({
      ...atual,
      servicos: atual.servicos.includes(servico)
        ? atual.servicos.filter((item) => item !== servico)
        : [...atual.servicos, servico],
    }));
  }

  function alternarForma(formaId) {
    setDados((atual) => ({
      ...atual,
      formas: atual.formas.includes(formaId)
        ? atual.formas.filter((item) => item !== formaId)
        : [...atual.formas, formaId],
    }));
  }

  async function salvar(evento) {
    evento.preventDefault();

    try {
      const atual = await salvarServicos(dados, { baseOriginal: salvo.base });

      setDados(atual);
      setSalvo(atual);
      aviso.sucesso('Serviços atualizados. Já valem para as próximas buscas.');
    } catch (erro) {
      aviso.erro(erro.message);
    }
  }

  return (
    <>
      <PainelTopo
        perfil={perfil}
        titulo="Meus serviços"
        descricao="O que você faz e até onde você vai"
      />

      {pendencias.length ? (
        <div className={styles.pendencias}>
          <Icon name="bell" size={16} />
          <span>Falta preencher: {pendencias.join(' · ')}</span>
        </div>
      ) : null}

      <form className={styles.coluna} onSubmit={salvar}>
        <PainelCartao
          titulo="Serviços que você presta"
          descricao={`${dados.servicos.length} selecionado(s). São eles que colocam você no resultado da busca.`}
          icone="wrench"
          controle={
            <div className={styles.buscaCampo}>
              <Input
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Buscar serviço"
                iconLeft="search"
                aria-label="Buscar serviço no catálogo"
              />
            </div>
          }
        >
          {/* os selecionados ficam no topo: com trinta itens no catálogo, quem
              já escolheu perde de vista o que marcou */}
          {dados.servicos.length ? (
            <div className={styles.selecionados}>
              {dados.servicos.map((servico) => (
                <button
                  key={servico}
                  type="button"
                  className={styles.selecionado}
                  onClick={() => alternarServico(servico)}
                  aria-label={`Tirar ${servico}`}
                >
                  {servico}
                  <Icon name="close" size={12} />
                </button>
              ))}
            </div>
          ) : null}

          <div className={styles.grupos}>
            {catalogo.length ? (
              catalogo.map((grupo) => (
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
                          onClick={() => alternarServico(item)}
                          aria-pressed={marcado}
                        >
                          {marcado ? <Icon name="check" size={12} /> : null}
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <p className={styles.vazio}>
                Nenhum serviço com esse nome. Se o que você faz não está na
                lista, descreva no campo de observação abaixo.
              </p>
            )}
          </div>
        </PainelCartao>

        <PainelCartao
          titulo="Como você atende"
          descricao="Define para quem você aparece — e a que distância."
          icone="pin"
        >
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

          <div className={styles.campos}>
            <div className={styles.duplo}>
              <Field
                label="Base de atendimento"
                htmlFor="base"
                hint="De onde você sai para os chamados"
              >
                <Input id="base" value={dados.base} onChange={mudar('base')} iconLeft="pin" />
              </Field>

              <Field
                label="Raio de atendimento"
                htmlFor="raio"
                hint="Acima disso você não aparece na busca"
              >
                <Input as="select" id="raio" value={dados.raio} onChange={mudar('raio')}>
                  {RAIOS.map((raio) => (
                    <option key={raio} value={raio}>
                      {raio}
                    </option>
                  ))}
                </Input>
              </Field>
            </div>

            <div className={styles.duplo}>
              <Field label="Costuma atender em" htmlFor="prazo">
                <Input as="select" id="prazo" value={dados.prazo} onChange={mudar('prazo')}>
                  {['No mesmo dia', 'Em até 48 h', 'Em até 5 dias', 'Conforme agenda'].map(
                    (opcao) => (
                      <option key={opcao} value={opcao}>
                        {opcao}
                      </option>
                    )
                  )}
                </Input>
              </Field>

              <Field
                label="Cobra deslocamento?"
                htmlFor="cobraDeslocamento"
                hint="Dito aqui, não vira discussão depois"
              >
                <Input
                  as="select"
                  id="cobraDeslocamento"
                  value={dados.cobraDeslocamento}
                  onChange={mudar('cobraDeslocamento')}
                >
                  {[
                    'Não cobro dentro do raio',
                    'Sim, acima do raio informado',
                    'Sim, sempre por quilômetro',
                    'A combinar',
                  ].map((opcao) => (
                    <option key={opcao} value={opcao}>
                      {opcao}
                    </option>
                  ))}
                </Input>
              </Field>
            </div>

            <div className={styles.duplo}>
              <Field label="Tamanho da equipe" htmlFor="equipe" hint="Quantas pessoas atendem">
                <Input
                  id="equipe"
                  value={dados.equipe}
                  onChange={mudar('equipe')}
                  inputMode="numeric"
                />
              </Field>
            </div>

            <Field
              label="Observação"
              htmlFor="observacao"
              hint="Equipamento próprio, especialidade, restrição de agenda…"
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
          textoSalvo="Serviços em dia"
        />
      </form>
    </>
  );
}
