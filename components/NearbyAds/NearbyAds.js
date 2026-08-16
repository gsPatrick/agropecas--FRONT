'use client';

/**
 * NearbyAds — a vitrine da landing: topo com busca e escopo + carrossel.
 * O topo é o mesmo componente de /anuncios (NearbyHeader).
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import NearbyHeader from '@/components/NearbyHeader/NearbyHeader';
import Carousel from '@/components/Carousel/Carousel';
import AdCard from '@/components/AdCard/AdCard';
import Button from '@/components/Button/Button';
import Icon from '@/components/Icon/Icon';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { buscarAnunciosDaVitrine } from '@/lib/dados/home';
import styles from './NearbyAds.module.css';

/* quantos fantasmas enquanto carrega: o suficiente para o trilho já nascer
   rolável, sem montar cartão que ninguém vai ver */
const FANTASMAS = 4;

function normalizar(valor) {
  return (valor || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export default function NearbyAds() {
  const router = useRouter();
  const [local, setLocal] = useState(null);
  const [anuncios, setAnuncios] = useState(null);

  /**
   * A ordem vem do banco, não de um `sort` aqui.
   *
   * Antes disso a chamada rodava uma vez, sem local, e trocar a cidade só
   * reordenava os 12 itens já recebidos — o anúncio de Sinop na página 2 dos
   * "recentes" nunca subia para o topo de "perto de Lucas do Rio Verde"
   * porque ele nunca tinha chegado ao navegador. Refazer a busca com
   * `ordenar=proximidade` é o que resolve isso de verdade.
   */
  useEffect(() => {
    const controle = new AbortController();

    buscarAnunciosDaVitrine({
      quantidade: 12,
      ordenar: local ? 'proximidade' : 'recentes',
      cidade: local?.cidade,
      uf: local?.uf,
      sinal: controle.signal,
    })
      .then(setAnuncios)
      .catch((erro) => {
        /* vazio de verdade continua sendo `[]`, nunca dado inventado — uma
           vitrine com anúncio de mentira é pior que uma vitrine curta: quem
           clica cai numa página que não existe */
        if (erro.name !== 'AbortError') setAnuncios([]);
      });

    return () => controle.abort();
  }, [local]);

  const lista = anuncios || [];

  const naCidade = local
    ? lista.filter((anuncio) => normalizar(anuncio.cidade) === normalizar(local.cidade)).length
    : 0;

  function buscar(termo) {
    const params = new URLSearchParams();
    if (termo) params.set('q', termo);
    if (local) params.set('cidade', local.cidade);
    router.push(`/busca${params.toString() ? `?${params}` : ''}`);
  }

  return (
    <section className={styles.root} id="anuncios">
      <div className={styles.inner}>
        <NearbyHeader
          onSearch={buscar}
          onLocal={setLocal}
          resumo={
            local
              ? `Ordenado pela distância até ${local.cidade}. ${
                  naCidade > 0
                    ? `${naCidade} ${naCidade === 1 ? 'anúncio' : 'anúncios'} na sua cidade.`
                    : 'Ainda não há anúncios na sua cidade — veja os mais próximos.'
                }`
              : undefined
          }
        />

        {anuncios && lista.length === 0 ? (
          <div className={styles.vazio}>
            <span className={styles.vazioIcone}>
              <Icon name="grid" size={26} />
            </span>
            <p className={styles.vazioTitulo}>Nenhum anúncio por aqui ainda</p>
            <p className={styles.vazioTexto}>
              Seja a primeira loja, produtor ou prestador a anunciar na sua região.
            </p>
            <Button as={Link} href="/entrar" iconRight="arrow-right">
              Anunciar gratuitamente
            </Button>
          </div>
        ) : (
          <Carousel label="Anúncios disponíveis" className={styles.carousel}>
            {anuncios
              ? lista.map((anuncio) => <AdCard key={anuncio.id} ad={anuncio} />)
              : Array.from({ length: FANTASMAS }, (_, indice) => (
                  /* o fantasma tem a altura do cartão inteiro (mídia 4/3 +
                     corpo + rodapé) para o trilho não encolher na troca */
                  <Esqueleto key={indice} altura={392} raio="var(--radius-xl)" />
                ))}
          </Carousel>
        )}

        <div className={styles.more}>
          <Button as={Link} href="/anuncios" variant="outline" iconRight="arrow-right">
            Ver todos os anúncios
          </Button>
        </div>
      </div>
    </section>
  );
}
