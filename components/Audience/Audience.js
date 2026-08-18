'use client';

/**
 * Audience — segunda seção: os três caminhos de entrada.
 *
 * Seção curta e autônoma: só a fileira de cartões, sem cabeçalho.
 * Driver:  interseção — cartões entram escalonados
 * Mobile:  coluna única
 */

import Reveal from '@/components/Reveal/Reveal';
import AudienceCard from '@/components/AudienceCard/AudienceCard';
import styles from './Audience.module.css';

/* Os nomes seguem Maturacao/05_perfis_e_funcoes.md — são os mesmos usados no
   cadastro, no admin e nos filtros de busca. */
const AUDIENCES = [
  {
    id: 'produtor',
    icon: 'tractor',
    title: 'Produtor Rural',
    text: 'Anuncie suas peças e encontre o que precisa sem parar a produção.',
  },
  {
    id: 'loja',
    icon: 'store',
    title: 'Loja de Peças',
    text: 'Divulgue seu estoque e conecte-se com produtores da sua região.',
  },
  {
    id: 'prestador',
    icon: 'wrench',
    title: 'Prestador de Serviços',
    text: 'Divulgue seus serviços e seja encontrado por quem precisa.',
  },
];

export default function Audience() {
  return (
    <section className={styles.root} id="publicos">
      <div className={styles.inner}>
        <h2 className={styles.srOnly}>Escolha como você usa a AgroPeças MT</h2>

        <div className={styles.grid}>
          {AUDIENCES.map((audience, i) => (
            <Reveal key={audience.id} delay={i * 90} className={styles.cell}>
              <AudienceCard
                icon={audience.icon}
                title={audience.title}
                text={audience.text}
                href="/entrar"
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
