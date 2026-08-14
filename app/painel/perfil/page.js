'use client';

/**
 * Perfil público — o que quem chega de fora vê.
 *
 * Duas colunas com papéis distintos: à esquerda a edição, à direita a
 * **prévia** do cartão público, atualizando a cada tecla. Sem a prévia, a
 * pessoa preenche campos no escuro e só descobre o resultado saindo do painel
 * para ver o próprio anúncio — e é justamente esse ida-e-volta que faz o
 * perfil ficar pela metade.
 *
 * A barra de completude vem antes de tudo porque perfil incompleto é a causa
 * mais comum de anúncio sem resposta: quem não sabe com quem fala não chama.
 *
 * Os campos do meio mudam por tipo de perfil (Maturacao/05 §2) e vêm de
 * `camposDoPerfil` — três telas quase iguais divergiriam na primeira correção
 * feita em só uma delas.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import PainelTopo from '@/components/PainelTopo/PainelTopo';
import PainelCartao from '@/components/PainelCartao/PainelCartao';
import Field from '@/components/Field/Field';
import Input from '@/components/Input/Input';
import CampoCidadeCep from '@/components/CampoCidadeCep/CampoCidadeCep';
import Button from '@/components/Button/Button';
import Icon from '@/components/Icon/Icon';
import Dica from '@/components/Dica/Dica';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import { useSessao } from '@/lib/sessao';
import {
  carregarPerfilPublico,
  salvarPerfilPublico,
  enviarFotoPerfil,
  camposDoPerfil,
  completudeDoPerfil,
  LIMITE_SOBRE,
} from '@/lib/dados/perfil-publico';
import styles from './page.module.css';

const VAZIO = { fotoUrl: '', sobre: '', telefone: '', whatsapp: '', cidade: '', publicos: { anuncios: 0, desde: '' } };

export default function PerfilPage() {
  const { perfil, usuario, tipoPerfil } = useSessao();
  const aviso = useAviso();

  const campos = camposDoPerfil(tipoPerfil);

  const [dados, setDados] = useState(VAZIO);
  const [salvo, setSalvo] = useState(VAZIO);
  const [pronto, setPronto] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const arquivoRef = useRef(null);

  useEffect(() => {
    if (!usuario) return undefined;

    let cancelado = false;

    carregarPerfilPublico()
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

  const completude = completudeDoPerfil(dados, tipoPerfil);
  const alterado = JSON.stringify(dados) !== JSON.stringify(salvo);

  const mudar = (chave) => (evento) =>
    setDados((atual) => ({ ...atual, [chave]: evento.target.value }));

  async function salvar(evento) {
    evento.preventDefault();

    try {
      const atual = await salvarPerfilPublico(dados, tipoPerfil, { cidadeOriginal: salvo.cidade });
      setDados(atual);
      setSalvo(atual);
      aviso.sucesso('Perfil atualizado. As mudanças já valem para quem visitar.');
    } catch (erro) {
      aviso.erro(erro.message);
    }
  }

  function descartar() {
    setDados(salvo);
    aviso.info('Alterações descartadas.');
  }

  function abrirSeletorDeFoto() {
    arquivoRef.current?.click();
  }

  async function fotoEscolhida(evento) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!arquivo) return;

    setEnviandoFoto(true);
    try {
      const atual = await enviarFotoPerfil(arquivo);
      setDados(atual);
      setSalvo(atual);
      aviso.sucesso('Foto atualizada.');
    } catch (erro) {
      aviso.erro(erro.message || 'Não foi possível enviar a foto.');
    } finally {
      setEnviandoFoto(false);
    }
  }

  return (
    <>
      <PainelTopo
        perfil={perfil}
        titulo="Perfil público"
        descricao="O que aparece para quem vê seus anúncios"
        acoes={
          <Link href={`/perfil/${usuario.slug}`} className={styles.verPublico}>
            <Icon name="eye" size={15} />
            Ver como visitante
          </Link>
        }
      />

      {/* ── completude ─────────────────────────────────── */}
      <section className={styles.completude}>
        <div className={styles.completudeTopo}>
          <div>
            <strong className={styles.completudeTitulo}>
              Perfil {completude.porcentagem}% completo
            </strong>

            <p className={styles.completudeTexto}>
              {completude.faltando.length
                ? `Faltam ${completude.faltando.length} item(ns). Perfil completo recebe mais contato — quem não sabe com quem fala não chama.`
                : 'Tudo preenchido. É o que dá confiança para quem chega pelo anúncio.'}
            </p>
          </div>

          <span className={styles.completudeNumero}>
            {completude.feitos}/{completude.total}
          </span>
        </div>

        <span className={styles.trilho}>
          <span
            className={styles.preenchimento}
            style={{ '--largura': `${completude.porcentagem}%` }}
          />
        </span>

        {completude.faltando.length ? (
          <>
            <ul className={styles.faltando}>
              {completude.faltando.map((item) => (
                <li key={item.id} className={styles.falta}>
                  <Icon name="plus" size={12} />
                  {item.rotulo}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <div className={styles.grade}>
        {/* ── edição ───────────────────────────────────── */}
        <form className={styles.coluna} onSubmit={salvar}>
          <PainelCartao titulo="Identificação" icone="user">
            <div className={styles.foto}>
              <span className={styles.avatar}>
                {dados.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={dados.fotoUrl} alt="" />
                ) : (
                  usuario.iniciais
                )}
              </span>

              <div className={styles.fotoTexto}>
                <strong className={styles.fotoTitulo}>Foto de perfil</strong>
                <p className={styles.fotoDica}>
                  JPG ou PNG, quadrada. Perfil com foto passa mais confiança que
                  perfil com iniciais.
                </p>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  iconLeft="plus"
                  disabled={enviandoFoto}
                  onClick={abrirSeletorDeFoto}
                >
                  {enviandoFoto ? 'Enviando…' : dados.fotoUrl ? 'Trocar foto' : 'Enviar foto'}
                </Button>

                <input
                  ref={arquivoRef}
                  type="file"
                  accept="image/*"
                  className={styles.arquivoOculto}
                  onChange={fotoEscolhida}
                />
              </div>
            </div>

            <div className={styles.campos}>
              <Field label="Nome público" htmlFor="nome" hint="É o nome que aparece no anúncio">
                <Input id="nome" value={usuario.nome} readOnly />
              </Field>

              <Field
                label="Sobre o seu negócio"
                htmlFor="sobre"
                hint={`${dados.sobre.length}/${LIMITE_SOBRE} — conte o que você faz, há quanto tempo e como atende`}
              >
                <Input
                  as="textarea"
                  id="sobre"
                  rows={5}
                  maxLength={LIMITE_SOBRE}
                  value={dados.sobre}
                  onChange={mudar('sobre')}
                />
              </Field>
            </div>
          </PainelCartao>

          <PainelCartao titulo="Contato" icone="phone">
            <p className={styles.aviso}>
              <Icon name="eye-off" size={14} />
              Só aparece para quem está logado — é o que evita seu número virar
              lista de disparo.
            </p>

            <div className={styles.campos}>
              <div className={styles.duplo}>
              <Field label="Telefone" htmlFor="telefone">
                <Input
                  id="telefone"
                  value={dados.telefone}
                  onChange={mudar('telefone')}
                  placeholder="(65) 90000-0000"
                />
              </Field>

              <Field label="WhatsApp" htmlFor="whatsapp" hint="Onde a maioria vai te chamar">
                <Input
                  id="whatsapp"
                  value={dados.whatsapp}
                  onChange={mudar('whatsapp')}
                  placeholder="(65) 90000-0000"
                />
              </Field>
              </div>

              <CampoCidadeCep
                id="cidade"
                hint="Define em quais buscas você aparece primeiro"
                value={dados.cidade}
                onChange={(texto) => setDados((atual) => ({ ...atual, cidade: texto }))}
              />
            </div>
          </PainelCartao>

          <PainelCartao titulo={`Sobre ${perfil.rotulo.toLowerCase()}`} icone={perfil.icone}>
            <div className={styles.campos}>
              {campos.map((campo) => (
                <Field
                key={campo.chave}
                label={campo.rotulo}
                htmlFor={campo.chave}
                hint={campo.dica}
              >
                {campo.tipo === 'opcao' ? (
                  <Input
                    as="select"
                    id={campo.chave}
                    value={dados[campo.chave] || ''}
                    onChange={mudar(campo.chave)}
                  >
                    <option value="">Selecione</option>
                    {campo.opcoes.map((opcao) => (
                      <option key={opcao} value={opcao}>
                        {opcao}
                      </option>
                    ))}
                  </Input>
                ) : (
                  <Input
                    id={campo.chave}
                    value={dados[campo.chave] || ''}
                    onChange={mudar(campo.chave)}
                  />
                  )}
                </Field>
              ))}
            </div>
          </PainelCartao>

          {/* a barra fica presa embaixo: numa página longa, o botão de salvar
              sumia no fim do formulário e a alteração ficava sem confirmar */}
          <div className={`${styles.barraSalvar} ${alterado ? styles.barraAtiva : ''}`}>
            <span className={styles.estado}>
              {alterado ? 'Alterações não salvas' : 'Tudo salvo'}
            </span>

            <div className={styles.botoes}>
              {alterado ? (
                <Button type="button" variant="ghost" onClick={descartar}>
                  Descartar
                </Button>
              ) : null}

              <Button type="submit" disabled={!alterado} iconLeft="check">
                Salvar alterações
              </Button>
            </div>
          </div>
        </form>

        {/* ── prévia ───────────────────────────────────── */}
        <aside className={styles.coluna}>
          <PainelCartao
            titulo="Como aparece"
            descricao="Prévia do seu cartão público, ao vivo."
            icone="eye"
          >
            <article className={styles.cartaoPublico}>
              <header className={styles.publicoTopo}>
                <span className={styles.publicoAvatar}>{usuario.iniciais}</span>

                <div className={styles.publicoIdentidade}>
                  <h3 className={styles.publicoNome}>
                    {usuario.nome}
                    {usuario.verificado ? (
                      <Dica texto="Cadastro verificado">
                        <span className={styles.selo}>
                          <Icon name="check" size={11} />
                        </span>
                      </Dica>
                    ) : null}
                  </h3>

                  <p className={styles.publicoTipo}>{perfil.rotulo}</p>

                  <p className={styles.publicoLocal}>
                    <Icon name="pin" size={12} />
                    {dados.cidade || (
                      <span className={styles.faltaTexto}>cidade não informada</span>
                    )}
                  </p>
                </div>
              </header>

              <p className={styles.publicoSobre}>
                {dados.sobre.trim() || (
                  <span className={styles.faltaTexto}>
                    Sem descrição. Quem chega não sabe o que você faz.
                  </span>
                )}
              </p>

              <dl className={styles.publicoDados}>
                {campos.map((campo) =>
                  dados[campo.chave] ? (
                    <div key={campo.chave} className={styles.publicoDado}>
                      <dt>{campo.rotulo}</dt>
                      <dd>{dados[campo.chave]}</dd>
                    </div>
                  ) : null
                )}
              </dl>

              <div className={styles.publicoNumeros}>
                <span className={styles.publicoNumero}>
                  <strong>{dados.publicos.anuncios}</strong>
                  anúncios no ar
                </span>

                <span className={styles.publicoNumero}>
                  <strong>{dados.publicos.desde}</strong>
                  na plataforma desde
                </span>
              </div>

              <div className={styles.publicoAcoes}>
                <span className={styles.publicoBotao}>
                  <Icon name="whatsapp" size={15} />
                  {dados.whatsapp ? 'Chamar no WhatsApp' : 'WhatsApp não informado'}
                </span>

                <span className={styles.publicoBotaoVazio}>
                  <Icon name="mail" size={15} />
                  Mensagem
                </span>
              </div>
            </article>

            <p className={styles.nota}>
              Telefone e WhatsApp só aparecem depois que o visitante entra na
              conta. Para quem não entrou, os botões pedem login.
            </p>
          </PainelCartao>
        </aside>
      </div>
    </>
  );
}
