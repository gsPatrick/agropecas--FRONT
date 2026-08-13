'use client';

/**
 * Mapa onde o anunciante MARCA o ponto.
 *
 * Usa Leaflet com telas do OpenStreetMap — livre, sem chave e sem cobrança por
 * carregamento (decisão registrada em `Maturacao/05` §9.4). O `embed` que havia
 * antes só exibia: não aceita clique nem pino arrastável, que é justamente o
 * que o cadastro por mapa precisa.
 *
 * Carregado só no navegador: o Leaflet mexe em `window` e `document` na
 * importação, e importá-lo no servidor quebra a renderização.
 *
 * Duas formas de marcar, porque as duas aparecem no uso real:
 *   · clicar em qualquer ponto do mapa;
 *   · arrastar o pino já colocado, para acertar os últimos metros.
 *
 * As camadas estão em `camadas.js`. Satélite e híbrido não são luxo aqui:
 * propriedade rural raramente tem rua com nome, e reconhecer o galpão pela
 * imagem costuma ser o único jeito de marcar o ponto certo.
 */

import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/Icon/Icon';
import { CAMADAS, CAMADA_PADRAO } from './camadas';
import styles from './MapaPicker.module.css';

/* centro que cobre as principais cidades de MT — ver LocalizacaoSeletor */
const CENTRO_MT = [-14.2, -55.9];
const ZOOM_ESTADO = 6;
const ZOOM_PONTO = 15;

export default function MapaPicker({ latitude, longitude, onMarcar, alvo }) {
  const container = useRef(null);
  const mapa = useRef(null);
  const marcador = useRef(null);
  const telas = useRef([]);
  const aoMarcar = useRef(onMarcar);

  const [camada, setCamada] = useState(CAMADA_PADRAO);

  /* a função vive num ref: sem isso, cada render do pai recriaria o mapa
     inteiro, apagando o zoom e a posição que a pessoa acabou de ajustar */
  aoMarcar.current = onMarcar;

  useEffect(() => {
    let vivo = true;

    async function iniciar() {
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      if (!vivo || !container.current || mapa.current) return;

      const instancia = L.map(container.current, {
        center: latitude && longitude ? [latitude, longitude] : CENTRO_MT,
        zoom: latitude && longitude ? ZOOM_PONTO : ZOOM_ESTADO,
        /* o mapa vive dentro de um formulário longo: rolar a página não pode
           virar zoom por acidente. Com Ctrl (ou pinça) continua funcionando */
        scrollWheelZoom: false,
        attributionControl: true,
      });

      /* a camada inicial. Trocar depois é só remover estas telas e pôr outras
         — o mapa, o pino e o zoom continuam onde estavam */
      const inicial = CAMADAS.find((c) => c.id === CAMADA_PADRAO);
      telas.current = inicial.urls.map((url) =>
        L.tileLayer(url, { maxZoom: inicial.maxZoom, attribution: inicial.atribuicao }).addTo(
          instancia
        )
      );

      /* pino desenhado com CSS em vez do ícone padrão: o do Leaflet aponta
         para uma imagem que o empacotador não resolve, e ainda ficaria fora da
         identidade visual */
      const icone = L.divIcon({
        className: '',
        html: `<span class="${styles.pino}"></span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      function colocar(lat, lon) {
        const posicao = [Number(lat.toFixed(5)), Number(lon.toFixed(5))];

        if (marcador.current) {
          marcador.current.setLatLng(posicao);
        } else {
          marcador.current = L.marker(posicao, { icon: icone, draggable: true }).addTo(instancia);

          marcador.current.on('dragend', (evento) => {
            const { lat: novaLat, lng } = evento.target.getLatLng();
            aoMarcar.current({ latitude: Number(novaLat.toFixed(5)), longitude: Number(lng.toFixed(5)) });
          });
        }

        aoMarcar.current({ latitude: posicao[0], longitude: posicao[1] });
      }

      instancia.on('click', (evento) => colocar(evento.latlng.lat, evento.latlng.lng));

      if (latitude && longitude) colocar(latitude, longitude);

      mapa.current = instancia;

      /* o mapa nasce dentro de uma aba escondida: sem recalcular o tamanho, as
         telas ficam cortadas até a primeira interação */
      setTimeout(() => instancia.invalidateSize(), 60);
    }

    iniciar();

    return () => {
      vivo = false;
      mapa.current?.remove();
      mapa.current = null;
      marcador.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* troca de camada sem recriar o mapa: recriar apagaria o pino e a posição,
     e a pessoa perderia o ponto que acabou de marcar */
  useEffect(() => {
    if (!mapa.current) return;

    let cancelado = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelado || !mapa.current) return;

      telas.current.forEach((tela) => mapa.current.removeLayer(tela));

      const escolhida = CAMADAS.find((c) => c.id === camada);
      telas.current = escolhida.urls.map((url) =>
        L.tileLayer(url, {
          maxZoom: escolhida.maxZoom,
          attribution: escolhida.atribuicao,
        }).addTo(mapa.current)
      );

      /* o pino não precisa ser reposicionado: o Leaflet mantém marcadores num
         plano acima do das telas, então trocar a camada nunca o encobre */
    })();

    return () => {
      cancelado = true;
    };
  }, [camada]);

  /* buscar por CEP ou por nome move o mapa; quem marca continua sendo a pessoa,
     mas já chega perto */
  useEffect(() => {
    if (!mapa.current || !alvo) return;

    mapa.current.setView([alvo.latitude, alvo.longitude], alvo.zoom || ZOOM_PONTO, {
      animate: true,
    });
  }, [alvo]);

  const atual = CAMADAS.find((c) => c.id === camada);

  return (
    <div className={styles.root}>
      <div className={styles.camadas} role="tablist" aria-label="Visualização do mapa">
        {CAMADAS.map((opcao) => (
          <button
            key={opcao.id}
            type="button"
            role="tab"
            aria-selected={camada === opcao.id}
            title={opcao.descricao}
            className={`${styles.camada} ${camada === opcao.id ? styles.camadaAtiva : ''}`}
            onClick={() => setCamada(opcao.id)}
          >
            <Icon name={opcao.icone} size={15} />
            {opcao.rotulo}
          </button>
        ))}
      </div>

      <div ref={container} className={styles.mapa} />

      <p className={styles.dica}>
        <strong>{atual.rotulo}</strong> — {atual.descricao}. Toque no mapa para marcar; depois
        arraste o pino para acertar o ponto.
      </p>
    </div>
  );
}
