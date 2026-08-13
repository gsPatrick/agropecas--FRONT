import Link from 'next/link';
import Icon from '@/components/Icon/Icon';
import Badge from '@/components/Badge/Badge';
import styles from './AdCard.module.css';

/**
 * AdCard — o anúncio na listagem.
 *
 * Hierarquia: foto → título → preço → onde está → quem publicou. O preço vem
 * antes da localização porque é o primeiro filtro mental de quem procura peça;
 * a distância só importa depois que o valor cabe.
 */
export default function AdCard({ ad }) {
  return (
    <article className={styles.root}>
      <Link href={`/anuncios/${ad.id}`} className={styles.media} aria-label={ad.titulo}>
        {ad.foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ad.foto} alt="" className={styles.photo} />
        ) : (
          <span className={styles.placeholder} aria-hidden="true">
            <Icon name={ad.icone || 'gear'} size={40} />
          </span>
        )}

        <Badge tone={ad.tipo === 'servico' ? 'lime' : 'forest'} className={styles.tag}>
          {ad.tipo === 'servico' ? 'Serviço' : 'Peça'}
        </Badge>

        {ad.condicao ? <span className={styles.condition}>{ad.condicao}</span> : null}
      </Link>

      <div className={styles.body}>
        <h3 className={styles.title}>
          <Link href={`/anuncios/${ad.id}`}>{ad.titulo}</Link>
        </h3>

        <p className={styles.price}>
          {ad.preco ? (
            ad.preco
          ) : (
            <span className={styles.priceAsk}>Consultar valor</span>
          )}
        </p>

        <p className={styles.place}>
          <Icon name="pin" size={15} />
          {ad.cidade} · {ad.uf}
        </p>
      </div>

      <footer className={styles.foot}>
        <span className={styles.author}>
          <span className={styles.avatar} aria-hidden="true">
            <Icon name={ad.perfilIcone || 'tractor'} size={15} />
          </span>
          {ad.autor}
        </span>

        <span className={styles.time}>{ad.quando}</span>
      </footer>
    </article>
  );
}
