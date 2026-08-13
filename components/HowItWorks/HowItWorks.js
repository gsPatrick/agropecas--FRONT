'use client';

/**
 * HowItWorks — os três passos, ligados por chevrons.
 *
 * Driver:  interseção — título e passos entram escalonados
 * Mobile:  coluna única; os chevrons giram 90° e viram ligação vertical
 */

import Reveal from '@/components/Reveal/Reveal';
import SectionHeading from '@/components/SectionHeading/SectionHeading';
import StepCard from '@/components/StepCard/StepCard';
import Icon from '@/components/Icon/Icon';
import styles from './HowItWorks.module.css';

const STEPS = [
  {
    id: 'procure',
    step: '1',
    icon: 'search',
    tone: 'forest',
    title: 'Procure',
    text: 'Busque pela peça que precisa ou pela máquina.',
  },
  {
    id: 'encontre',
    step: '2',
    icon: 'pin',
    tone: 'green',
    title: 'Encontre',
    text: 'Veja quem tem próximo de você com disponibilidade.',
  },
  {
    id: 'resolva',
    step: '3',
    icon: 'whatsapp',
    tone: 'green',
    title: 'Resolva',
    text: 'Entre em contato direto e resolve seu problema.',
  },
];

export default function HowItWorks() {
  return (
    <section className={styles.root} id="como-funciona">
      <div className={styles.inner}>
        <Reveal>
          <SectionHeading title="Como funciona" as="h2" className={styles.heading} />
        </Reveal>

        <div className={styles.steps}>
          {STEPS.map((step, i) => (
            <div className={styles.item} key={step.id}>
              {i > 0 ? (
                <Icon
                  name="chevron-right"
                  size={26}
                  className={styles.chevron}
                  aria-hidden="true"
                />
              ) : null}

              <Reveal delay={120 + i * 110} className={styles.cell}>
                <StepCard
                  step={step.step}
                  icon={step.icon}
                  tone={step.tone}
                  title={step.title}
                  text={step.text}
                />
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
