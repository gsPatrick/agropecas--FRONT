'use client';

/**
 * WhyUs — faixa institucional escura: os quatro motivos.
 *
 * É a única seção com fundo escuro da página, e a única em que o Verde Broto
 * puro aparece em texto — sobre escuro ele passa em contraste.
 *
 * Driver:  interseção — título e colunas entram escalonados
 * Mobile:  2 colunas e depois 1; os divisores somem
 */

import Reveal from '@/components/Reveal/Reveal';
import FeatureItem from '@/components/FeatureItem/FeatureItem';
import styles from './WhyUs.module.css';

const REASONS = [
  {
    id: 'busca',
    icon: 'search',
    title: 'Busca inteligente',
    text: 'Encontre o que precisa em segundos.',
  },
  {
    id: 'regiao',
    icon: 'pin',
    title: 'Próximo de você',
    text: 'Resultados por região para mais agilidade.',
  },
  {
    id: 'contato',
    icon: 'phone',
    title: 'Contato rápido',
    text: 'Fale direto com quem tem a peça.',
  },
  {
    id: 'produtividade',
    icon: 'tractor',
    title: 'Menos máquina parada',
    text: 'Mais tempo produzindo, mais lucro para você.',
  },
];

export default function WhyUs() {
  return (
    <section className={styles.root} id="por-que">
      <div className={styles.inner}>
        <Reveal>
          <h2 className={styles.title}>Por que usar a AgroPeças MT?</h2>
        </Reveal>

        <div className={styles.grid}>
          {REASONS.map((reason, i) => (
            <Reveal key={reason.id} delay={100 + i * 80} className={styles.cell}>
              <FeatureItem icon={reason.icon} title={reason.title} text={reason.text} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
