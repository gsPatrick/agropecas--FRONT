'use client';

/**
 * Desempenho — o que os números querem dizer.
 *
 * A tela responde três perguntas, nesta ordem: **quanto** apareceu, **de onde**
 * veio quem apareceu e **o que fazer** com isso. A última é a que justifica a
 * página: um painel que só empilha totais devolve o trabalho de interpretar
 * para quem menos tem tempo — o dono do anúncio.
 *
 * Por isso a leitura em uma frase vem antes dos gráficos, e a lista de
 * anúncios com visita e nenhum contato tem lugar próprio: é onde há dinheiro
 * parado.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PainelTopo from '@/components/PainelTopo/PainelTopo';
import PainelCartao from '@/components/PainelCartao/PainelCartao';
import PainelMetrica from '@/components/PainelMetrica/PainelMetrica';
import PainelSegmentos from '@/components/PainelSegmentos/PainelSegmentos';
import PainelGrafico from '@/components/PainelGrafico/PainelGrafico';
import Icon from '@/components/Icon/Icon';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import { useSessao } from '@/lib/sessao';
import { carregarDesempenho, PERIODOS } from '@/lib/dados/desempenho';
import styles from './page.module.css';

export default function DesempenhoPage() {
  const { perfil, usuario } = useSessao();
  const aviso = useAviso();

  const [periodo, setPeriodo] = useState('7d');
  const [serie, setSerie] = useState('visualizacoes');
  const [dados, setDados] = useState(null);

  useEffect(() => {
    if (!usuario) return undefined;

    const controle = new AbortController();

    carregarDesempenho(periodo, { sinal: controle.signal })
      .then(setDados)
      .catch((erro) => {
        if (erro.name !== 'AbortError') aviso.erro('Não foi possível carregar o desempenho.');
      });

    return () => controle.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id, periodo]);

  if (!usuario) return null;

  if (!dados) {
    return (
      <>
        <PainelTopo perfil={perfil} titulo="Desempenho" descricao="Como seus anúncios vêm se saindo" />
        <div className={styles.metricas}>
          {Array.from({ length: 4 }, (_, indice) => (
            <Esqueleto key={indice} altura={104} raio={12} />
          ))}
        </div>
      </>
    );
  }

  const leitura = dados.leitura;
  const comparacao = PERIODOS.find((item) => item.id === periodo)?.comparacao;

  const pontos =
    serie === 'visualizacoes' ? dados.serieVisualizacoes : dados.serieContatos;

  return (
    <>
      <PainelTopo
        perfil={perfil}
        titulo="Desempenho"
        descricao="Como seus anúncios vêm se saindo"
        acoes={
          <PainelSegmentos
            opcoes={PERIODOS}
            valor={periodo}
            onMudar={setPeriodo}
            rotulo="Período"
          />
        }
      />

      {/* a leitura antes dos números: é ela que diz o que fazer */}
      <div className={`${styles.leitura} ${styles[leitura.tom]}`}>
        <span className={styles.leituraIcone}>
          <Icon
            name={leitura.tom === 'bom' ? 'check' : leitura.tom === 'atencao' ? 'bell' : 'chart'}
            size={18}
          />
        </span>

        <div className={styles.leituraTexto}>
          <strong className={styles.leituraTitulo}>{leitura.titulo}</strong>
          <p className={styles.leituraDescricao}>{leitura.texto}</p>
        </div>
      </div>

      <div className={styles.metricas}>
        {dados.metricas.map((metrica) => (
          <PainelMetrica
            key={metrica.chave}
            rotulo={metrica.rotulo}
            valor={metrica.valor}
            variacao={metrica.variacao}
            icone={metrica.icone}
            comparacao={comparacao}
          />
        ))}

        <PainelMetrica
          rotulo="Visita que virou conversa"
          valor={dados.conversao.toFixed(1)}
          sufixo="%"
          icone="chart"
          comparacao={comparacao}
        />
      </div>

      <PainelCartao
        titulo="Movimento no período"
        descricao={`Por ${dados.unidade}. Passe o mouse para ver o número exato.`}
        controle={
          <PainelSegmentos
            opcoes={[
              { id: 'visualizacoes', rotulo: 'Visualizações' },
              { id: 'contatos', rotulo: 'Contatos' },
            ]}
            valor={serie}
            onMudar={setSerie}
            rotulo="O que mostrar no gráfico"
          />
        }
      >
        <PainelGrafico
          pontos={pontos}
          rotuloEixo={`${serie === 'contatos' ? 'Contatos' : 'Visualizações'} por ${dados.unidade}`}
        />
      </PainelCartao>

      <div className={styles.duas}>
        <PainelCartao
          titulo="Seus anúncios mais vistos"
          descricao="O que está puxando o resultado."
          semPadding
        >
          <ol className={styles.ranking}>
            {dados.destaques.length ? (
              dados.destaques.map((anuncio, indice) => (
                <li key={anuncio.id} className={styles.linha}>
                  <span className={styles.posicao}>{indice + 1}</span>

                  <Link href={`/painel/anuncios/${anuncio.id}`} className={styles.linhaTexto}>
                    <strong className={styles.linhaTitulo}>{anuncio.titulo}</strong>
                    <span className={styles.linhaPreco}>{anuncio.preco}</span>
                  </Link>

                  <span className={styles.numeros}>
                    <span className={styles.numero}>
                      <Icon name="eye" size={13} />
                      {anuncio.vistas}
                    </span>

                    <span className={styles.numero}>
                      <Icon name="phone" size={13} />
                      {anuncio.contatos}
                    </span>
                  </span>
                </li>
              ))
            ) : (
              <p className={styles.vazio}>Nenhum anúncio publicado com visualização no período.</p>
            )}
          </ol>
        </PainelCartao>

        <PainelCartao
          titulo="Vistos, mas sem contato"
          descricao="Gente olhou e não chamou — é aqui que há o que corrigir."
          semPadding
        >
          {dados.parados.length ? (
            <ul className={styles.ranking}>
              {dados.parados.map((anuncio) => (
                <li key={anuncio.id} className={styles.linha}>
                  <span className={styles.alerta}>
                    <Icon name="bell" size={14} />
                  </span>

                  <Link href={`/painel/anuncios/${anuncio.id}`} className={styles.linhaTexto}>
                    <strong className={styles.linhaTitulo}>{anuncio.titulo}</strong>
                    <span className={styles.linhaPreco}>
                      {anuncio.vistas} visualizações · nenhum contato
                    </span>
                  </Link>

                  <Link href={`/painel/anuncios/${anuncio.id}/editar`} className={styles.corrigir}>
                    Revisar
                    <Icon name="arrow-right" size={13} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.vazio}>
              Todos os seus anúncios no ar já receberam pelo menos um contato.
            </p>
          )}
        </PainelCartao>
      </div>

      {/* ⚠️ "de onde vêm as visitas" e "de onde falam com você" saíram: a API
          não rastreia por qual tela a pessoa chegou no anúncio, nem a cidade
          de quem contatou — ver o comentário no topo de `lib/dados/desempenho.js` */}
    </>
  );
}
