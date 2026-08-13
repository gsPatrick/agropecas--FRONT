'use client';

/**
 * Formulário de anúncio — serve para criar e para editar.
 *
 * Um componente só porque as duas telas são o mesmo formulário: o que muda é o
 * estado inicial e o texto dos botões. Duas cópias divergiriam no primeiro
 * campo novo, e o anúncio passaria a aceitar na criação algo que a edição
 * descarta.
 *
 * Um formulário para os três tipos (peça, serviço e máquina), com o tipo no
 * topo. Três formulários repetiriam título, descrição, fotos, preço e
 * localização — que é quase tudo.
 *
 * O tipo vem de fora (`?tipo=servico` na URL) para o botão do painel abrir já
 * no certo, mas continua trocável: no campo é comum a oficina vender peça
 * também, e travar o tipo escondia metade do produto de quem faz as duas
 * coisas.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PainelCartao from '@/components/PainelCartao/PainelCartao';
import LocalizacaoSeletor from '@/components/LocalizacaoSeletor/LocalizacaoSeletor';
import Field from '@/components/Field/Field';
import Input from '@/components/Input/Input';
import Icon from '@/components/Icon/Icon';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import { useSessao } from '@/lib/sessao';
import { TIPOS_ANUNCIO } from '@/lib/painel-menu';
import { CONDICOES, NEGOCIACOES } from '@/lib/anuncio-form';
import { carregarCategorias, carregarMarcas } from '@/lib/dados/catalogo-anuncio';
import { enviarFoto } from '@/lib/dados/midia';
import {
  criarAnuncio,
  editarAnuncio,
  publicarAnuncio,
  paraCorpoAnuncio,
  resolverMunicipioPorNome,
} from '@/lib/dados/meus-anuncios';
import styles from './AnuncioForm.module.css';

const MAX_FOTOS = 8;

const VAZIO = {
  titulo: '',
  descricao: '',
  categoriaId: '',
  marcaId: '',
  condicao: 'usada',
  negociacao: 'venda',
  preco: '',
  aCombinar: false,
  quantidade: 1,
  atendeNoLocal: true,
  raioKm: '',
};

/** "Sorriso · MT" — mesmo texto que `LocalizacaoSeletor` monta, usado só para
    saber se a pessoa MUDOU a localização (e então vale resolver de novo) */
const textoDaLocalizacao = (valor) =>
  valor?.origem === 'mapa' ? null : [valor?.municipio, valor?.uf].filter(Boolean).join(' · ');

export default function AnuncioForm({
  modo = 'novo',
  anuncioId,
  tipoInicial,
  valoresIniciais,
  localizacaoInicial,
  fotosIniciais = [],
}) {
  const { perfil, usuario } = useSessao();
  const aviso = useAviso();
  const router = useRouter();

  const [tipo, setTipo] = useState(
    TIPOS_ANUNCIO.some((t) => t.id === tipoInicial) ? tipoInicial : perfil.tipoPadrao
  );

  const [form, setForm] = useState({ ...VAZIO, ...valoresIniciais });

  const [localizacao, setLocalizacao] = useState(
    localizacaoInicial || { origem: null, exibirExato: false }
  );
  const localizacaoOriginal = useRef(textoDaLocalizacao(localizacaoInicial));

  const [fotos, setFotos] = useState(fotosIniciais);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const arquivoRef = useRef(null);

  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);

  const editando = modo === 'edicao';

  /* o catálogo de categoria depende do TIPO — trocar de peça para serviço no
     topo do formulário precisa recarregar a lista de baixo */
  useEffect(() => {
    let cancelado = false;

    carregarCategorias(tipo)
      .then((itens) => {
        if (!cancelado) setCategorias(itens);
      })
      .catch(() => {});

    return () => {
      cancelado = true;
    };
  }, [tipo]);

  useEffect(() => {
    let cancelado = false;

    carregarMarcas()
      .then((itens) => {
        if (!cancelado) setMarcas(itens);
      })
      .catch(() => {});

    return () => {
      cancelado = true;
    };
  }, []);

  /* a barra de ações pode ser recolhida arrastando para baixo. Ela é útil
     enquanto se preenche, e atrapalha na hora de olhar o mapa ou as fotos.
     
     O que encolhe é o CONTEÚDO, não a barra inteira. Deslizar a barra para
     baixo a enfiava atrás da navegação inferior — ela aparecia cortada e não
     havia mais de onde puxá-la de volta. Encolhendo o miolo, a pega fica
     sempre no lugar.
     
     A altura é animada por `grid-template-rows` indo de `1fr` a `0fr`, técnica
     que anima sem precisar medir a altura em JavaScript — e é justamente medir
     que quebrava quando o conteúdo mudava de tamanho. */
  const [recolhida, setRecolhida] = useState(false);
  const rodape = useRef(null);
  const arrasto = useRef(null);

  /* fração aberta do miolo, de 1 (inteiro) a 0 (fechado). Vai numa variável de
     CSS: o valor vem do gesto, a aparência continua no módulo */
  function definirFracao(valor) {
    rodape.current?.style.setProperty('--aberto', valor === null ? '' : `${valor}fr`);
  }

  /* zera a duração enquanto o dedo está na tela e devolve ao soltar */
  function definirTransicao(ligada) {
    rodape.current?.style.setProperty('--dur-miolo', ligada ? '' : '0ms');
  }

  function iniciarArrasto(evento) {
    const miolo = rodape.current?.querySelector(`.${styles.miolo}`);

    arrasto.current = {
      inicio: evento.clientY,
      tempo: Date.now(),
      distancia: 0,
      altura: Math.max(1, miolo?.offsetHeight || 100),
    };

    evento.currentTarget.setPointerCapture?.(evento.pointerId);
    definirTransicao(false);
  }

  function moverArrasto(evento) {
    if (!arrasto.current) return;

    const { inicio, altura } = arrasto.current;
    const distancia = evento.clientY - inicio;
    arrasto.current.distancia = distancia;

    /* aberta, arrastar para baixo fecha; recolhida, para cima abre */
    const base = recolhida ? 0 : 1;
    const fracao = base - distancia / altura;

    definirFracao(Math.min(1, Math.max(0, fracao)));
  }

  function soltarArrasto() {
    const gesto = arrasto.current;
    arrasto.current = null;

    /* devolve o controle ao CSS: sem limpar, um gesto interrompido deixaria a
       barra travada no meio, que era exatamente o defeito */
    definirTransicao(true);
    definirFracao(null);

    if (!gesto) return;

    const percorrido = Math.abs(gesto.distancia);

    /* toque sem arrasto alterna: quem não percebeu que dá para arrastar ainda
       consegue abrir e fechar clicando */
    if (percorrido < 8) return setRecolhida((valor) => !valor);

    /* solta rápido = intenção clara, mesmo com pouco percurso. É o que separa
       um peteleco de um arrasto hesitante */
    const velocidade = percorrido / Math.max(1, Date.now() - gesto.tempo);

    if (velocidade > 0.5 || percorrido > gesto.altura * 0.33) {
      setRecolhida(gesto.distancia > 0);
    }
    /* senão volta sozinha para onde estava — a transição do CSS faz o retorno */
  }

  if (!usuario) return null;

  const atualizar = (mudancas) => setForm((atual) => ({ ...atual, ...mudancas }));
  const ehServico = tipo === 'servico';
  const definicao = TIPOS_ANUNCIO.find((t) => t.id === tipo);

  function abrirSeletorDeArquivo() {
    arquivoRef.current?.click();
  }

  async function arquivoEscolhido(evento) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!arquivo) return;

    setEnviandoFoto(true);
    try {
      const enviada = await enviarFoto(arquivo);
      setFotos((atual) => [...atual, enviada]);
    } catch (erro) {
      aviso.erro(erro.message || 'Não foi possível enviar a foto.');
    } finally {
      setEnviandoFoto(false);
    }
  }

  const removerFoto = (id) => setFotos((atual) => atual.filter((f) => f.id !== id));

  /* o que ainda falta para poder publicar. Mostrado o tempo todo, não só ao
     clicar: descobrir o que falta depois de tentar enviar é o que faz a pessoa
     desistir no meio */
  const pendencias = [
    !form.titulo.trim() && 'título',
    !form.descricao.trim() && 'descrição',
    !form.categoriaId && 'categoria',
    !form.aCombinar && !form.preco && 'preço',
    !localizacao.origem && 'localização',
    !fotos.length && 'ao menos uma foto',
  ].filter(Boolean);

  const podePublicar = pendencias.length === 0;

  /**
   * Localização resolvida para o corpo da API.
   *
   * `mapa` sempre manda lat/lng — é escolha explícita de agora. `cep`/`texto`
   * só resolvem o município (uma busca a mais) quando o texto MUDOU: reenviar
   * a mesma busca a cada salvamento seria uma chamada extra para reconfirmar
   * o que já estava certo. Sem mudança nenhuma, nada de localização entra no
   * corpo — o valor que já existia no anúncio (ou o padrão do perfil, na
   * criação) continua valendo.
   */
  async function resolverLocalizacaoParaApi() {
    if (localizacao.origem === 'mapa' && localizacao.latitude && localizacao.longitude) {
      return { latitude: localizacao.latitude, longitude: localizacao.longitude, uf: localizacao.uf };
    }

    const textoAtual = textoDaLocalizacao(localizacao);
    if (!textoAtual || textoAtual === localizacaoOriginal.current) return {};

    const municipioId = await resolverMunicipioPorNome(localizacao.municipio, localizacao.uf);
    if (!municipioId) return {};

    localizacaoOriginal.current = textoAtual;
    return { municipioId, uf: localizacao.uf };
  }

  async function salvar({ publicarAgora }) {
    if (salvando) return;
    setSalvando(true);

    try {
      const localizacaoResolvida = await resolverLocalizacaoParaApi();

      const corpo = paraCorpoAnuncio({
        tipo,
        form,
        localizacao: localizacaoResolvida,
        fotos,
        publicar: publicarAgora && !editando,
      });

      if (editando) {
        await editarAnuncio(anuncioId, corpo);
        if (publicarAgora) await publicarAnuncio(anuncioId);

        aviso.sucesso(publicarAgora ? 'Anúncio republicado.' : 'Alterações salvas.');
        router.push(`/painel/anuncios/${anuncioId}`);
      } else {
        const criado = await criarAnuncio(corpo);

        aviso.sucesso(publicarAgora ? 'Anúncio no ar. Já aparece na busca.' : 'Rascunho salvo.');
        router.push(`/painel/anuncios/${criado.id}`);
      }
    } catch (erro) {
      aviso.erro(erro.message || 'Não foi possível salvar o anúncio.');
    } finally {
      setSalvando(false);
    }
  }

  return (
      <form className={styles.form} onSubmit={(evento) => evento.preventDefault()}>
        {/* ── tipo ─────────────────────────────────────── */}
        <PainelCartao
          titulo="O que você vai anunciar?"
          descricao="Isso muda alguns campos mais abaixo."
          icone="grid"
        >
          <div className={styles.tipos}>
            {TIPOS_ANUNCIO.map((opcao) => (
              <button
                key={opcao.id}
                type="button"
                className={`${styles.tipo} ${tipo === opcao.id ? styles.tipoAtivo : ''}`}
                onClick={() => setTipo(opcao.id)}
                aria-pressed={tipo === opcao.id}
              >
                <span className={styles.tipoIcone}>
                  <Icon name={opcao.icone} size={20} />
                </span>

                <span className={styles.tipoTexto}>
                  <strong>{opcao.rotulo}</strong>
                  <span>{opcao.descricao}</span>
                </span>
              </button>
            ))}
          </div>
        </PainelCartao>

        {/* ── identificação ────────────────────────────── */}
        <PainelCartao titulo={`Sobre ${ehServico ? 'o serviço' : 'a peça'}`} icone="edit">
          <div className={styles.campos}>
            <Field
              label="Título"
              htmlFor="titulo"
              required
              hint={
                ehServico
                  ? 'Diga o que você faz e onde. Ex.: “Manutenção hidráulica em campo”'
                  : 'Nome, modelo e a máquina em que serve. É por isso que buscam.'
              }
            >
              <Input
                id="titulo"
                maxLength={120}
                placeholder={
                  ehServico
                    ? 'Ex.: Solda e recuperação de implementos'
                    : 'Ex.: Bomba hidráulica John Deere 6110J'
                }
                value={form.titulo}
                onChange={(e) => atualizar({ titulo: e.target.value })}
              />
            </Field>

            <Field
              label="Descrição"
              htmlFor="descricao"
              required
              hint="Estado, o que está incluso, o que não está. Detalhe evita mensagem repetida."
            >
              <Input
                id="descricao"
                as="textarea"
                rows={5}
                maxLength={2000}
                value={form.descricao}
                onChange={(e) => atualizar({ descricao: e.target.value })}
              />
            </Field>

            <div className={styles.linha}>
              <Field label="Categoria" htmlFor="categoria" required>
                <Input
                  id="categoria"
                  as="select"
                  value={form.categoriaId}
                  onChange={(e) => atualizar({ categoriaId: e.target.value })}
                >
                  <option value="">Selecione…</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </Input>
              </Field>

              {/* select, não texto livre: `marcaId` é UUID do catálogo — a API
                  não resolve nome digitado como resolve cultura/serviço.
                  "Outra" está na lista para quem tem marca fora do catálogo */}
              {!ehServico ? (
                <Field label="Marca" htmlFor="marca" hint="Opcional.">
                  <Input
                    id="marca"
                    as="select"
                    value={form.marcaId}
                    onChange={(e) => atualizar({ marcaId: e.target.value })}
                  >
                    <option value="">Selecione…</option>
                    {marcas.map((marca) => (
                      <option key={marca.id} value={marca.id}>
                        {marca.nome}
                      </option>
                    ))}
                  </Input>
                </Field>
              ) : (
                <Field label="Atendimento" htmlFor="atendimento">
                  <Input
                    id="atendimento"
                    as="select"
                    value={form.atendeNoLocal ? 'campo' : 'oficina'}
                    onChange={(e) => atualizar({ atendeNoLocal: e.target.value === 'campo' })}
                  >
                    <option value="campo">Vou até o cliente</option>
                    <option value="oficina">O cliente vem até mim</option>
                  </Input>
                </Field>
              )}
            </div>

            {/* campos que só existem para um tipo */}
            {!ehServico ? (
              <div className={styles.linha}>
                <Field label="Condição" htmlFor="condicao">
                  <Input
                    id="condicao"
                    as="select"
                    value={form.condicao}
                    onChange={(e) => atualizar({ condicao: e.target.value })}
                  >
                    {CONDICOES.map((condicao) => (
                      <option key={condicao.id} value={condicao.id}>
                        {condicao.rotulo}
                      </option>
                    ))}
                  </Input>
                </Field>

                <Field label="Quantidade" htmlFor="quantidade">
                  <Input
                    id="quantidade"
                    type="number"
                    min={1}
                    value={form.quantidade}
                    onChange={(e) => atualizar({ quantidade: e.target.value })}
                  />
                </Field>
              </div>
            ) : (
              <Field
                label="Raio de atendimento"
                htmlFor="raio"
                hint="Em quilômetros. Deixe vazio se atende qualquer distância."
              >
                <Input
                  id="raio"
                  type="number"
                  min={0}
                  placeholder="Ex.: 120"
                  value={form.raioKm}
                  onChange={(e) => atualizar({ raioKm: e.target.value })}
                />
              </Field>
            )}
          </div>
        </PainelCartao>

        {/* ── preço ────────────────────────────────────── */}
        <PainelCartao
          titulo="Preço"
          descricao="Anúncio com preço recebe mais contato — mas «a combinar» é válido."
          icone="chart"
        >
          <div className={styles.campos}>
            <div className={styles.linha}>
              <Field label="Forma" htmlFor="negociacao">
                <Input
                  id="negociacao"
                  as="select"
                  value={form.negociacao}
                  onChange={(e) => atualizar({ negociacao: e.target.value })}
                >
                  {NEGOCIACOES.map((opcao) => (
                    <option key={opcao.id} value={opcao.id}>
                      {opcao.rotulo}
                    </option>
                  ))}
                </Input>
              </Field>

              <Field label="Valor" htmlFor="preco" required={!form.aCombinar}>
                <Input
                  id="preco"
                  inputMode="decimal"
                  placeholder="R$ 0,00"
                  disabled={form.aCombinar}
                  value={form.preco}
                  onChange={(e) => atualizar({ preco: e.target.value })}
                />
              </Field>
            </div>

            <label className={styles.caixa}>
              <input
                type="checkbox"
                checked={form.aCombinar}
                onChange={(e) => atualizar({ aCombinar: e.target.checked, preco: '' })}
              />
              <span>Preço a combinar</span>
            </label>
          </div>
        </PainelCartao>

        {/* ── fotos ────────────────────────────────────── */}
        <PainelCartao
          titulo="Fotos"
          descricao={`Até ${MAX_FOTOS}. A primeira é a capa e aparece na busca.`}
          icone="image"
        >
          <div className={styles.fotos}>
            {fotos.map((foto, indice) => (
              <div key={foto.id} className={styles.foto}>
                {foto.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={foto.url} alt="" />
                ) : (
                  <Icon name="image" size={22} />
                )}
                {indice === 0 ? <span className={styles.capa}>capa</span> : null}

                <button
                  type="button"
                  className={styles.removerFoto}
                  onClick={() => removerFoto(foto.id)}
                  aria-label="Remover foto"
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            ))}

            {fotos.length < MAX_FOTOS ? (
              <button
                type="button"
                className={styles.adicionarFoto}
                onClick={abrirSeletorDeArquivo}
                disabled={enviandoFoto}
              >
                <Icon name={enviandoFoto ? 'clock' : 'plus'} size={20} />
                <span>{enviandoFoto ? 'Enviando…' : 'Adicionar'}</span>
              </button>
            ) : null}

            <input
              ref={arquivoRef}
              type="file"
              accept="image/*"
              className={styles.arquivoOculto}
              onChange={arquivoEscolhido}
            />
          </div>
        </PainelCartao>

        {/* ── localização ──────────────────────────────── */}
        <PainelCartao
          titulo="Onde está?"
          descricao="Escolha o jeito mais fácil para você. Nenhum é obrigatório."
          icone="pin"
        >
          <LocalizacaoSeletor valor={localizacao} onChange={setLocalizacao} />
        </PainelCartao>

        {/* ── ações ────────────────────────────────────── */}
        <div
          ref={rodape}
          className={`${styles.rodape} ${recolhida ? styles.rodapeRecolhido : ''}`}
        >
          {/* pega para arrastar — só existe no celular, onde a barra disputa
              espaço com o conteúdo */}
          <button
            type="button"
            className={styles.puxador}
            onPointerDown={iniciarArrasto}
            onPointerMove={moverArrasto}
            onPointerUp={soltarArrasto}
            onPointerCancel={soltarArrasto}
            aria-expanded={!recolhida}
            aria-label={recolhida ? 'Mostrar ações' : 'Recolher ações'}
          >
            <span className={styles.pega} />
            {recolhida ? (
              <span className={styles.puxadorTexto}>
                {podePublicar ? 'Pronto para publicar' : `Faltam ${pendencias.length} item(ns)`}
              </span>
            ) : null}
          </button>

          <div className={styles.miolo} aria-hidden={recolhida}>
            <div className={styles.mioloInterno}>
          <div className={styles.pendencias}>
            {podePublicar ? (
              <span className={styles.pronto}>
                <Icon name="check" size={16} />
                Tudo pronto para publicar.
              </span>
            ) : (
              <span className={styles.falta}>
                Falta preencher: <strong>{pendencias.join(', ')}</strong>
              </span>
            )}
          </div>

          <div className={styles.botoes}>
            <Link href="/painel/anuncios" className={styles.cancelar}>
              Cancelar
            </Link>

            {/* rascunho aceita anúncio pela metade: é o que permite começar no
                celular no campo e terminar no computador à noite */}
            <button
              type="button"
              className={styles.rascunho}
              disabled={salvando}
              onClick={() => salvar({ publicarAgora: false })}
            >
              {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Salvar rascunho'}
            </button>

            <button
              type="button"
              className={styles.publicar}
              disabled={!podePublicar || salvando}
              onClick={() => salvar({ publicarAgora: true })}
            >
              <Icon name="check" size={17} />
              {salvando
                ? 'Enviando…'
                : editando
                  ? 'Republicar'
                  : `Publicar ${definicao.rotulo.toLowerCase()}`}
            </button>
          </div>
            </div>
          </div>
        </div>
      </form>
  );
}
