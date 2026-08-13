'use client';

/**
 * NearbyHeader — o topo com busca e escopo de localização.
 *
 * Usado na landing e em /anuncios: mesma promessa, mesmo comportamento. Sem
 * componente único, as duas telas divergem na primeira mudança de copy.
 *
 * O título tem no máximo duas linhas. Quando existe cidade, a frase de
 * contexto encolhe ("Disponível agora") para o nome caber na segunda — texto
 * de três linhas empurra a busca para fora da primeira dobra.
 *
 * A segunda linha é reescrita na frente do usuário: apaga o texto anterior e
 * digita o novo. É a confirmação de que o endereço dele mudou alguma coisa.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar/SearchBar';
import Button from '@/components/Button/Button';
import Icon from '@/components/Icon/Icon';
import styles from './NearbyHeader.module.css';

const CHAVE_LOCAL = 'agropecas:local';

function mascaraCep(valor) {
  const digitos = valor.replace(/\D/g, '').slice(0, 8);
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
}

/* Apagar é mais rápido que digitar (25ms × 55ms): assim lê como "trocando",
   e não como se a máquina estivesse hesitando. */
function useMaquinaDeEscrever(alvo) {
  const [texto, setTexto] = useState(alvo);
  const alvoRef = useRef(alvo);
  const primeiroRef = useRef(true);

  useEffect(() => {
    if (primeiroRef.current) {
      primeiroRef.current = false;
      alvoRef.current = alvo;
      setTexto(alvo);
      return undefined;
    }

    if (alvo === alvoRef.current) return undefined;
    alvoRef.current = alvo;

    let cancelado = false;
    let timer;

    const digitar = () => {
      setTexto((atual) => {
        if (cancelado) return atual;
        if (atual.length >= alvo.length) return alvo;
        timer = setTimeout(digitar, 55);
        return alvo.slice(0, atual.length + 1);
      });
    };

    const apagar = () => {
      setTexto((atual) => {
        if (cancelado) return atual;
        if (atual.length === 0) {
          timer = setTimeout(digitar, 120);
          return atual;
        }
        timer = setTimeout(apagar, 25);
        return atual.slice(0, -1);
      });
    };

    apagar();

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [alvo]);

  return texto;
}

export default function NearbyHeader({ onSearch, onLocal, eyebrow = 'Anúncios', resumo }) {
  const [local, setLocal] = useState(null);
  const [cep, setCep] = useState('');
  const [estado, setEstado] = useState('idle');
  const controllerRef = useRef(null);

  useEffect(() => {
    const salvo = sessionStorage.getItem(CHAVE_LOCAL);
    if (salvo) {
      const dados = JSON.parse(salvo);
      setLocal(dados);
      onLocal?.(dados);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => controllerRef.current?.abort(), []);

  function guardar(dados) {
    setLocal(dados);
    sessionStorage.setItem(CHAVE_LOCAL, JSON.stringify(dados));
    onLocal?.(dados);
    setEstado('ok');
  }

  async function buscarCep(event) {
    event.preventDefault();
    const digitos = cep.replace(/\D/g, '');
    if (digitos.length !== 8) {
      setEstado('curto');
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setEstado('carregando');

    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`, {
        signal: controller.signal,
      });
      const dados = await resposta.json();

      if (dados.erro) {
        setEstado('naoEncontrado');
        return;
      }

      guardar({ cidade: dados.localidade, uf: dados.uf, cep: mascaraCep(digitos) });
    } catch (erro) {
      if (erro.name !== 'AbortError') setEstado('erro');
    }
  }

  /* localização do aparelho: só quando o usuário pede, e com a cidade
     resolvida por geocodificação reversa — coordenada crua não diz nada a ele */
  function usarLocalizacao() {
    if (!navigator.geolocation) {
      setEstado('semSuporte');
      return;
    }

    setEstado('localizando');
    navigator.geolocation.getCurrentPosition(
      async (posicao) => {
        try {
          const { latitude, longitude } = posicao.coords;
          const resposta = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`
          );
          const dados = await resposta.json();
          const cidade = dados.city || dados.locality;

          if (!cidade) {
            setEstado('semCidade');
            return;
          }

          guardar({ cidade, uf: dados.principalSubdivisionCode?.split('-')[1] || '', cep: null });
        } catch {
          setEstado('erro');
        }
      },
      () => setEstado('negado'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }

  function mudarEndereco() {
    setLocal(null);
    setCep('');
    setEstado('idle');
    sessionStorage.removeItem(CHAVE_LOCAL);
    onLocal?.(null);
  }

  const prefixo = local ? 'Disponível' : 'Veja o que está disponível';
  const alvo = local ? `perto de ${local.cidade}` : '';
  const linha = useMaquinaDeEscrever(alvo);

  const aviso = useMemo(
    () =>
      ({
        curto: 'Digite os 8 dígitos do CEP.',
        naoEncontrado: 'CEP não encontrado. Confira o número.',
        erro: 'Não foi possível consultar agora.',
        negado: 'Você não permitiu o acesso à localização.',
        semSuporte: 'Seu navegador não informa a localização.',
        semCidade: 'Não identificamos sua cidade. Informe o CEP.',
      })[estado],
    [estado]
  );

  return (
    <div className={styles.topo}>
      <div className={styles.head}>
        <span className={styles.eyebrow}>{eyebrow}</span>

        <h1 className={styles.title}>
          {prefixo} <em>agora</em>
          {linha ? (
            <>
              <br />
              <span className={styles.linha}>
                {linha}
                <span className={styles.cursor} aria-hidden="true" />
              </span>
            </>
          ) : null}
        </h1>

        <p className={styles.lead}>
          {local
            ? resumo ||
              `Ordenado pela distância até ${local.cidade}${local.uf ? ` · ${local.uf}` : ''}.`
            : 'Peças, implementos e serviços publicados por produtores, lojas e prestadores.'}
        </p>

        <div className={styles.search}>
          <SearchBar onSearch={onSearch} className={styles.searchBar} />
        </div>

        <p className={styles.helper}>
          Não sabe o nome da peça?{' '}
          <Link href="/busca?por=maquina" className={styles.helperLink}>
            Busque por máquina
          </Link>
        </p>
      </div>

      {local ? (
        <aside className={`${styles.cartao} ${styles.cartaoPronto}`}>
          <span className={`${styles.selo} ${styles.seloPronto}`} aria-hidden="true">
            <Icon name="pin" size={22} />
          </span>

          <span className={styles.prontoRotulo}>Você está em</span>
          <strong className={styles.prontoCidade}>{local.cidade}</strong>
          <span className={styles.prontoUf}>
            {[local.uf, local.cep ? `CEP ${local.cep}` : null].filter(Boolean).join(' · ')}
          </span>

          <Button
            variant="outline"
            size="sm"
            fullWidth
            iconLeft="pin"
            onClick={mudarEndereco}
            className={styles.mudar}
          >
            Mudar endereço
          </Button>
        </aside>
      ) : (
        <aside className={styles.cartao}>
          <span className={styles.selo} aria-hidden="true">
            <Icon name="pin" size={22} />
          </span>

          <h2 className={styles.cartaoTitulo}>Quer ver o que tem mais perto?</h2>
          <p className={styles.cartaoTexto}>
            Informe seu CEP e organizamos os anúncios pela distância até você.
          </p>

          <form className={styles.form} onSubmit={buscarCep}>
            <div className={styles.campo}>
              <Icon name="pin" size={17} className={styles.campoIcone} />
              <input
                className={styles.input}
                inputMode="numeric"
                placeholder="00000-000"
                value={cep}
                onChange={(event) => {
                  setCep(mascaraCep(event.target.value));
                  setEstado('idle');
                }}
                aria-label="Seu CEP"
              />
            </div>

            <Button
              type="submit"
              size="md"
              fullWidth
              disabled={estado === 'carregando'}
              iconRight={estado === 'carregando' ? undefined : 'arrow-right'}
            >
              {estado === 'carregando' ? 'Buscando…' : 'Ver perto de mim'}
            </Button>
          </form>

          <div className={styles.ou}>
            <span />
            ou
            <span />
          </div>

          <button
            type="button"
            className={styles.gps}
            onClick={usarLocalizacao}
            disabled={estado === 'localizando'}
          >
            <Icon name="pin" size={16} />
            {estado === 'localizando' ? 'Localizando…' : 'Usar minha localização'}
          </button>

          {aviso ? <p className={styles.erro}>{aviso}</p> : null}

          <p className={styles.nota}>
            Usamos só para ordenar os resultados. Não aparece no seu perfil.
          </p>
        </aside>
      )}
    </div>
  );
}
