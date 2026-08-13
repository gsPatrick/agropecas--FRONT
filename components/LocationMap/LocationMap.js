'use client';

/**
 * LocationMap — onde está o anúncio, com mapa e distância.
 *
 * O endereço pode ter chegado por CEP, por coordenada ou por pino no mapa
 * (Maturacao/05, §9). O componente usa o que existir, nesta ordem:
 *   1. lat/lng  → mapa exato
 *   2. endereço → mapa por busca textual
 *   3. município/UF → mapa da cidade
 *
 * O `embed` do Google não exige chave de API. Para camadas próprias (raio de
 * privacidade, cluster de anúncios) será preciso migrar para a Maps JS API.
 *
 * A distância só é calculada quando o usuário pede: pedir geolocalização no
 * carregamento é invasivo e a maioria nega por reflexo.
 */

import { useState } from 'react';
import Icon from '@/components/Icon/Icon';
import styles from './LocationMap.module.css';

function haversine(a, b) {
  const R = 6371;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function LocationMap({ local }) {
  const [distancia, setDistancia] = useState(null);
  const [estado, setEstado] = useState('idle');

  if (!local) return null;

  const temCoordenada = typeof local.lat === 'number' && typeof local.lng === 'number';

  const enderecoTexto = [
    local.logradouro,
    local.bairro,
    `${local.cidade} - ${local.uf}`,
    local.cep,
  ]
    .filter(Boolean)
    .join(', ');

  const consulta = temCoordenada ? `${local.lat},${local.lng}` : enderecoTexto;
  const embed = `https://www.google.com/maps?q=${encodeURIComponent(consulta)}&z=${
    local.aproximado ? 12 : 15
  }&output=embed`;
  const abrir = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
  const rota = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(consulta)}`;

  function calcular() {
    if (!navigator.geolocation) {
      setEstado('indisponivel');
      return;
    }

    setEstado('carregando');
    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        if (!temCoordenada) {
          setEstado('semCoordenada');
          return;
        }
        const km = haversine(
          { lat: posicao.coords.latitude, lng: posicao.coords.longitude },
          { lat: local.lat, lng: local.lng }
        );
        setDistancia(km);
        setEstado('ok');
      },
      () => setEstado('negado'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }

  const aviso = {
    negado: 'Você não permitiu o acesso à localização.',
    indisponivel: 'Seu navegador não informa a localização.',
    semCoordenada: 'Este anúncio não tem coordenada exata.',
  }[estado];

  return (
    <section className={styles.root}>
      <header className={styles.head}>
        <h2 className={styles.title}>Localização</h2>
        {local.aproximado ? (
          <span className={styles.approx}>
            <Icon name="pin" size={13} />
            Localização aproximada
          </span>
        ) : null}
      </header>

      <p className={styles.address}>
        {local.logradouro ? (
          <>
            {local.logradouro}
            {local.numero ? `, ${local.numero}` : ''}
            {local.bairro ? ` — ${local.bairro}` : ''}
            <br />
          </>
        ) : null}
        <strong>
          {local.cidade} · {local.uf}
        </strong>
        {local.cep ? ` · CEP ${local.cep}` : ''}
      </p>

      <div className={styles.mapWrap}>
        <iframe
          className={styles.map}
          src={embed}
          title={`Mapa de ${local.cidade}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>

      <div className={styles.actions}>
        <a className={styles.action} href={abrir} target="_blank" rel="noopener noreferrer">
          <Icon name="pin" size={16} />
          Abrir no Google Maps
        </a>

        <a className={styles.action} href={rota} target="_blank" rel="noopener noreferrer">
          <Icon name="arrow-right" size={16} />
          Como chegar
        </a>

        {estado === 'ok' && distancia !== null ? (
          <span className={`${styles.action} ${styles.distance}`}>
            <Icon name="tractor" size={16} />
            {distancia < 1
              ? 'Menos de 1 km de você'
              : `${distancia.toFixed(distancia < 10 ? 1 : 0)} km de você`}
          </span>
        ) : (
          <button
            type="button"
            className={styles.action}
            onClick={calcular}
            disabled={estado === 'carregando'}
          >
            <Icon name="search" size={16} />
            {estado === 'carregando' ? 'Calculando…' : 'Ver distância até mim'}
          </button>
        )}
      </div>

      {aviso ? <p className={styles.note}>{aviso}</p> : null}
    </section>
  );
}
