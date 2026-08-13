'use client';

/**
 * Minha propriedade — a tela exclusiva do produtor (Maturacao/05 §2).
 *
 * O centro dela é o **maquinário**, não os dados cadastrais. Saber que a
 * fazenda tem um John Deere 6110J 2018 é o que transforma "bomba hidráulica"
 * de busca cega em busca útil: dá para recomendar a peça compatível e avisar
 * quando alguém anuncia uma perto.
 *
 * Os dados da propriedade vêm antes por serem o que aparece no perfil público
 * — mas são poucos de propósito. Formulário longo de cadastro é o jeito mais
 * rápido de a pessoa fechar a aba.
 */

import { useEffect, useState } from 'react';
import PainelTopo from '@/components/PainelTopo/PainelTopo';
import PainelCartao from '@/components/PainelCartao/PainelCartao';
import PainelBarraSalvar from '@/components/PainelBarraSalvar/PainelBarraSalvar';
import Field from '@/components/Field/Field';
import Input from '@/components/Input/Input';
import Button from '@/components/Button/Button';
import Icon from '@/components/Icon/Icon';
import Dica from '@/components/Dica/Dica';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import { useSessao } from '@/lib/sessao';
import { TIPOS_MAQUINA, pendenciasExclusivas } from '@/lib/exclusivas-mock';
import {
  carregarPropriedade,
  salvarPropriedade,
  carregarCulturasDisponiveis,
} from '@/lib/dados/exclusivas';
import styles from './page.module.css';

const MAQUINA_VAZIA = { tipo: 'trator', marca: '', modelo: '', ano: '' };

/* estado enquanto a API não respondeu. Mesmo formato do que vem de lá, para a
   tela não ter de checar `null` em campo nenhum */
const VAZIO = {
  nome: '',
  inscricao: '',
  cidade: '',
  referencia: '',
  area: '',
  culturas: [],
  contatoSede: '',
  maquinas: [],
};

export default function PropriedadePage() {
  const { perfil, usuario } = useSessao();
  const aviso = useAviso();

  const [dados, setDados] = useState(VAZIO);
  const [salvo, setSalvo] = useState(VAZIO);
  const [nova, setNova] = useState(MAQUINA_VAZIA);
  const [pronto, setPronto] = useState(false);
  const [culturasDisponiveis, setCulturasDisponiveis] = useState([]);

  /* perfil e catálogo de culturas em paralelo — duas rotas independentes.
     `cancelado` porque a tela pode desmontar antes da resposta: sem ele, o
     React avisa sobre estado em componente desmontado a cada navegação rápida */
  useEffect(() => {
    if (!usuario) return undefined;

    let cancelado = false;

    Promise.all([carregarPropriedade(), carregarCulturasDisponiveis()])
      .then(([atual, culturas]) => {
        if (cancelado) return;
        setDados(atual);
        setSalvo(atual);
        setCulturasDisponiveis(culturas);
        setPronto(true);
      })
      .catch((erro) => {
        if (!cancelado) aviso.erro(erro.message);
      });

    return () => {
      cancelado = true;
    };
    /* só na montagem: recarregar a cada render do aviso descartaria o que a
       pessoa está digitando */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id]);

  if (!usuario || !pronto) return null;

  const alterado = JSON.stringify(dados) !== JSON.stringify(salvo);
  const pendencias = pendenciasExclusivas('produtor', dados);

  const mudar = (chave) => (evento) =>
    setDados((atual) => ({ ...atual, [chave]: evento.target.value }));

  function alternarCultura(cultura) {
    setDados((atual) => ({
      ...atual,
      culturas: atual.culturas.includes(cultura)
        ? atual.culturas.filter((item) => item !== cultura)
        : [...atual.culturas, cultura],
    }));
  }

  function adicionarMaquina(evento) {
    evento.preventDefault();

    if (!nova.marca.trim() || !nova.modelo.trim()) {
      aviso.erro('Informe marca e modelo — é o que permite achar a peça certa.');
      return;
    }

    setDados((atual) => ({
      ...atual,
      maquinas: [
        ...atual.maquinas,
        { ...nova, id: `m${Date.now()}`, marca: nova.marca.trim(), modelo: nova.modelo.trim() },
      ],
    }));

    setNova(MAQUINA_VAZIA);
    aviso.sucesso('Máquina adicionada.');
  }

  function removerMaquina(maquina) {
    setDados((atual) => ({
      ...atual,
      maquinas: atual.maquinas.filter((item) => item.id !== maquina.id),
    }));

    aviso.sucesso(`${maquina.marca} ${maquina.modelo} removida.`, {
      acao: {
        rotulo: 'Desfazer',
        executar: () =>
          setDados((atual) => ({ ...atual, maquinas: [...atual.maquinas, maquina] })),
      },
    });
  }

  async function salvar(evento) {
    evento.preventDefault();

    try {
      /* o que volta da API vira o novo estado — e não o que estava na tela:
         a máquina recém-criada ganha o id do banco ali, e sem isso o próximo
         salvamento a recriaria como se fosse outra */
      const atual = await salvarPropriedade(dados, { cidadeOriginal: salvo.cidade });

      setDados(atual);
      setSalvo(atual);
      aviso.sucesso('Propriedade atualizada.');
    } catch (erro) {
      aviso.erro(erro.message);
    }
  }

  return (
    <>
      <PainelTopo
        perfil={perfil}
        titulo="Minha propriedade"
        descricao="Onde você produz e com quais máquinas"
      />

      {pendencias.length ? (
        <div className={styles.pendencias}>
          <Icon name="bell" size={16} />
          <span>
            Falta preencher: {pendencias.join(' · ')}
          </span>
        </div>
      ) : null}

      <form className={styles.coluna} onSubmit={salvar}>
        <PainelCartao titulo="Dados da propriedade" icone="leaf">
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
              <Field label="Cidade e estado" htmlFor="cidade">
                <Input
                  id="cidade"
                  value={dados.cidade}
                  onChange={mudar('cidade')}
                  iconLeft="pin"
                />
              </Field>

              <Field
                label="Telefone da sede"
                htmlFor="contatoSede"
                hint="Quem atende no portão nem sempre é quem anuncia"
              >
                <Input
                  id="contatoSede"
                  value={dados.contatoSede}
                  onChange={mudar('contatoSede')}
                  placeholder="(65) 3000-0000"
                />
              </Field>
            </div>

            <Field
              label="Ponto de referência"
              htmlFor="referencia"
              hint="Ajuda quem vai entregar peça ou prestar serviço a chegar"
            >
              <Input
                as="textarea"
                id="referencia"
                rows={2}
                value={dados.referencia}
                onChange={mudar('referencia')}
              />
            </Field>
          </div>
        </PainelCartao>

        <PainelCartao
          titulo="O que você produz"
          descricao="Define quais anúncios e serviços aparecem primeiro para você."
          icone="leaf"
        >
          <div className={styles.fichas}>
            {culturasDisponiveis.map((cultura) => {
              const marcada = dados.culturas.includes(cultura);

              return (
                <button
                  key={cultura}
                  type="button"
                  className={`${styles.ficha} ${marcada ? styles.fichaAtiva : ''}`}
                  onClick={() => alternarCultura(cultura)}
                  aria-pressed={marcada}
                >
                  {marcada ? <Icon name="check" size={12} /> : null}
                  {cultura}
                </button>
              );
            })}
          </div>
        </PainelCartao>

        <PainelCartao
          titulo="Meu maquinário"
          descricao="Marca, modelo e ano são o que permitem achar a peça compatível."
          icone="tractor"
          semPadding
          permiteEstouro
        >
          {dados.maquinas.length ? (
            <ul className={styles.maquinas}>
              {dados.maquinas.map((maquina) => {
                const tipo =
                  TIPOS_MAQUINA.find((item) => item.id === maquina.tipo) || TIPOS_MAQUINA[0];

                return (
                  <li key={maquina.id} className={styles.maquina}>
                    <span className={styles.maquinaIcone}>
                      <Icon name={tipo.icone} size={17} />
                    </span>

                    <div className={styles.maquinaTexto}>
                      <strong className={styles.maquinaNome}>
                        {maquina.marca} {maquina.modelo}
                      </strong>

                      <span className={styles.maquinaDados}>
                        {tipo.rotulo}
                        {maquina.ano ? ` · ${maquina.ano}` : ''}
                      </span>
                    </div>

                    <Dica texto="Remover máquina" alinhamento="fim">
                      <button
                        type="button"
                        className={styles.remover}
                        onClick={() => removerMaquina(maquina)}
                        aria-label={`Remover ${maquina.marca} ${maquina.modelo}`}
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </Dica>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={styles.vazio}>
              Nenhuma máquina cadastrada. Sem elas, a busca de peça não tem como
              saber o que serve na sua frota.
            </p>
          )}

          {/* o formulário fica DENTRO do cartão da lista, e não em outro:
              cadastrar máquina e ver as cadastradas é a mesma tarefa */}
          <div className={styles.novaMaquina}>
            <div className={styles.novaLinha}>
              <Field label="Tipo" htmlFor="tipo">
                <Input
                  as="select"
                  id="tipo"
                  value={nova.tipo}
                  onChange={(evento) => setNova({ ...nova, tipo: evento.target.value })}
                >
                  {TIPOS_MAQUINA.map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.rotulo}
                    </option>
                  ))}
                </Input>
              </Field>

              <Field label="Marca" htmlFor="marca">
                <Input
                  id="marca"
                  value={nova.marca}
                  onChange={(evento) => setNova({ ...nova, marca: evento.target.value })}
                  placeholder="John Deere"
                />
              </Field>

              <Field label="Modelo" htmlFor="modelo">
                <Input
                  id="modelo"
                  value={nova.modelo}
                  onChange={(evento) => setNova({ ...nova, modelo: evento.target.value })}
                  placeholder="6110J"
                />
              </Field>

              <Field label="Ano" htmlFor="ano">
                <Input
                  id="ano"
                  value={nova.ano}
                  onChange={(evento) => setNova({ ...nova, ano: evento.target.value })}
                  placeholder="2018"
                  inputMode="numeric"
                />
              </Field>
            </div>

            {/* type="button": dentro do formulário da página, um submit aqui
                salvaria tudo em vez de adicionar a máquina */}
            <Button type="button" variant="outline" iconLeft="plus" onClick={adicionarMaquina}>
              Adicionar máquina
            </Button>
          </div>
        </PainelCartao>

        <PainelBarraSalvar
          alterado={alterado}
          onDescartar={() => {
            setDados(salvo);
            aviso.info('Alterações descartadas.');
          }}
          textoSalvo="Propriedade em dia"
        />
      </form>
    </>
  );
}
