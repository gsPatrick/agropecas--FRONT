'use client';

/**
 * Administração → Visão geral.
 *
 * As **pendências vêm antes das métricas**, e não o contrário. Número bonito
 * não sai da fila sozinho: uma denúncia parada há três dias custa mais à
 * plataforma do que qualquer gráfico de crescimento informa. Cada pendência é
 * um botão para o lugar onde ela se resolve.
 *
 * Depois vêm os números, a atividade recente — que é a auditoria em forma
 * curta, para dar a sensação de que nada acontece sem registro — e a saúde
 * dos serviços.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PainelCartao from '@/components/PainelCartao/PainelCartao';
import PainelMetrica from '@/components/PainelMetrica/PainelMetrica';
import PainelGrafico from '@/components/PainelGrafico/PainelGrafico';
import AdminEtiqueta from '@/components/AdminEtiqueta/AdminEtiqueta';
import Icon from '@/components/Icon/Icon';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import { carregarPainelAdmin } from '@/lib/dados/admin';
import styles from './page.module.css';

const ESTADO = {
  ok: { rotulo: 'Operando', tom: 'ok' },
  atencao: { rotulo: 'Atenção', tom: 'alerta' },
  falha: { rotulo: 'Falha', tom: 'perigo' },
};

export default function AdminPage() {
  const aviso = useAviso();
  const [dados, setDados] = useState(null);

  useEffect(() => {
    const controle = new AbortController();

    carregarPainelAdmin({ sinal: controle.signal })
      .then(setDados)
      .catch((erro) => {
        if (erro.name !== 'AbortError') aviso.erro('Não foi possível carregar o painel.');
      });

    return () => controle.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!dados) {
    return (
      <>
        <header className={styles.topo}>
          <div>
            <h1 className={styles.titulo}>Visão geral</h1>
            <p className={styles.descricao}>Carregando…</p>
          </div>
        </header>

        <section className={styles.pendencias} aria-label="O que espera decisão">
          {Array.from({ length: 4 }, (_, indice) => (
            <Esqueleto key={indice} altura={72} raio={12} />
          ))}
        </section>

        <section className={styles.metricas} aria-label="Números da plataforma">
          {Array.from({ length: 4 }, (_, indice) => (
            <Esqueleto key={indice} altura={104} raio={12} />
          ))}
        </section>
      </>
    );
  }

  const urgentes = dados.pendencias.filter((item) => item.urgente && item.valor > 0);

  return (
    <>
      <header className={styles.topo}>
        <div>
          <h1 className={styles.titulo}>Visão geral</h1>
          <p className={styles.descricao}>
            {urgentes.length
              ? `${urgentes.length} fila(s) pedindo atenção agora.`
              : 'Nenhuma fila urgente. Bom momento para olhar os números.'}
          </p>
        </div>
      </header>

      {/* ── pendências ─────────────────────────────────── */}
      <section className={styles.pendencias} aria-label="O que espera decisão">
        {dados.pendencias.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`${styles.pendencia} ${
              item.urgente && item.valor > 0 ? styles.pendenciaUrgente : ''
            }`}
          >
            <span className={styles.pendenciaValor}>{item.valor}</span>

            <span className={styles.pendenciaTexto}>
              <strong>{item.rotulo}</strong>
              <span>{item.detalhe}</span>
            </span>

            <Icon name="chevron-right" size={16} className={styles.seta} />
          </Link>
        ))}
      </section>

      {/* ── métricas ───────────────────────────────────── */}
      <section className={styles.metricas} aria-label="Números da plataforma">
        {dados.metricas.map((metrica) => (
          <PainelMetrica
            key={metrica.chave}
            rotulo={metrica.rotulo}
            valor={metrica.valor}
            variacao={metrica.variacao}
            icone={metrica.icone}
            comparacao="semana passada"
          />
        ))}
      </section>

      <div className={styles.duas}>
        <PainelCartao
          titulo="Cadastros"
          descricao="Novos usuários nos últimos 14 dias."
          icone="user"
        >
          <PainelGrafico pontos={dados.serieCadastros} rotuloEixo="Cadastros por dia" />
        </PainelCartao>

        <PainelCartao
          titulo="Anúncios publicados"
          descricao="Novos anúncios nos últimos 14 dias."
          icone="grid"
        >
          <PainelGrafico pontos={dados.serieAnuncios} rotuloEixo="Anúncios por dia" />
        </PainelCartao>
      </div>

      <div className={styles.duas}>
        <PainelCartao
          titulo="Atividade recente"
          descricao="Tudo que foi feito fica registrado."
          icone="clock"
          acao={{ href: '/admin/auditoria', rotulo: 'Ver auditoria' }}
          semPadding
        >
          {dados.atividade === null ? (
            <p className={styles.semPermissao}>
              Sua conta não tem escopo de auditoria para ver esta trilha.
            </p>
          ) : dados.atividade.length ? (
            <ul className={styles.atividade}>
              {dados.atividade.map((registro) => (
                <li key={registro.id} className={styles.registro}>
                  <span className={styles.registroIcone}>
                    <Icon name={registro.icone} size={15} />
                  </span>

                  <span className={styles.registroTexto}>
                    <strong>{registro.quem}</strong> {registro.acao}{' '}
                    <span className={styles.alvo}>{registro.alvo}</span>
                  </span>

                  <span className={styles.quando}>{registro.quando}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.semPermissao}>Nenhuma ação administrativa ainda.</p>
          )}
        </PainelCartao>

        <PainelCartao
          titulo="Saúde dos serviços"
          descricao="O que sustenta a plataforma agora."
          icone="chart"
          semPadding
        >
          {dados.saude === null ? (
            <p className={styles.semPermissao}>
              O estado da infraestrutura é restrito ao administrador.
            </p>
          ) : (
          <ul className={styles.saude}>
            {dados.saude.map((servico) => {
              const estado = ESTADO[servico.estado];

              return (
                <li key={servico.id} className={styles.servico}>
                  <span className={styles.servicoNome}>{servico.rotulo}</span>
                  <span className={styles.servicoDetalhe}>{servico.detalhe}</span>
                  <AdminEtiqueta tom={estado.tom} ponto>
                    {estado.rotulo}
                  </AdminEtiqueta>
                </li>
              );
            })}
          </ul>
          )}
        </PainelCartao>
      </div>
    </>
  );
}
