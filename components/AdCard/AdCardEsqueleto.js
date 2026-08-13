import Esqueleto from '@/components/Esqueleto/Esqueleto';
import styles from './AdCard.module.css';

/**
 * O AdCard enquanto os dados não chegaram.
 *
 * Reaproveita o MESMO CSS do card real — não uma caixa cinza parecida. É o
 * único jeito de garantir que a grade não pule quando a resposta chegar: a
 * proporção 4/3 da mídia, os paddings e a borda do rodapé vêm da mesma folha,
 * então o espaço ocupado é idêntico por construção, não por coincidência de
 * números copiados.
 */
export default function AdCardEsqueleto() {
  return (
    <article className={styles.root} aria-hidden="true">
      <span className={styles.media}>
        <Esqueleto largura="100%" altura="100%" raio={0} />
      </span>

      <div className={styles.body}>
        {/* duas linhas de título, como o clamp do card permite */}
        <Esqueleto largura="100%" altura={17} />
        <Esqueleto largura="70%" altura={17} />
        <Esqueleto largura="45%" altura={20} />
        <span className={styles.place}>
          <Esqueleto largura="55%" altura={13} />
        </span>
      </div>

      <footer className={styles.foot}>
        <span className={styles.author}>
          <Esqueleto largura={24} altura={24} raio="50%" />
          <Esqueleto largura={90} altura={12} />
        </span>
        <Esqueleto largura={54} altura={11} />
      </footer>
    </article>
  );
}
