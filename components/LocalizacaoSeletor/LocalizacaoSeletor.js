'use client';

/**
 * Como o anunciante informa onde a peça ou o serviço está.
 *
 * Três caminhos, e **nenhum é obrigatório** — regra registrada em
 * `Maturacao/05_perfis_e_funcoes.md` §9.1.1:
 *
 *   · **Mapa** — marca o ponto e o endereço é resolvido a partir dele
 *   · **CEP** — digita o CEP e o resto vem preenchido
 *   · **Texto** — escreve à mão, sem mapa
 *
 * O texto livre existe porque no campo há endereço sem CEP útil e sem ponto
 * reconhecível («Fazenda Santa Luzia, km 42 da MT-140»). Obrigar mapa ou CEP
 * travaria o cadastro de quem a plataforma mais quer atender.
 *
 * Trocar de aba **não apaga** o que já foi preenchido: quem tenta pelo CEP,
 * não acha e vai para o texto não pode perder o número que já digitou.
 */

import { useState } from 'react';
import Field from '@/components/Field/Field';
import Input from '@/components/Input/Input';
import Icon from '@/components/Icon/Icon';
import MapaPicker from '@/components/MapaPicker/MapaPicker';
import styles from './LocalizacaoSeletor.module.css';

const MODOS = [
  { id: 'mapa', rotulo: 'No mapa', icone: 'pin', ajuda: 'Marque o ponto onde a peça está.' },
  { id: 'cep', rotulo: 'Por CEP', icone: 'search', ajuda: 'Informe o CEP e conferimos o endereço.' },
  { id: 'texto', rotulo: 'Escrever', icone: 'edit', ajuda: 'Sem CEP nem mapa — descreva como se chega.' },
];

/* ⚠️ PROVISÓRIO — sem API. O CEP real vem do ViaCEP pelo servidor. */
const CEPS = {
  '78550000': { logradouro: 'Avenida dos Tarumãs', bairro: 'Centro', municipio: 'Sinop', uf: 'MT', latitude: -11.8642, longitude: -55.5025 },
  '78455000': { logradouro: 'Rua Barão do Rio Branco', bairro: 'Centro', municipio: 'Lucas do Rio Verde', uf: 'MT', latitude: -13.0508, longitude: -55.9114 },
  '78005000': { logradouro: 'Avenida Getúlio Vargas', bairro: 'Centro Norte', municipio: 'Cuiabá', uf: 'MT', latitude: -15.5989, longitude: -56.0949 },
  '78890000': { logradouro: 'Avenida Blumenau', bairro: 'Centro', municipio: 'Sorriso', uf: 'MT', latitude: -12.5453, longitude: -55.7114 },
  '78700000': { logradouro: 'Avenida Fernando Corrêa', bairro: 'Centro', municipio: 'Rondonópolis', uf: 'MT', latitude: -16.4673, longitude: -54.6372 },
};

/* lugares que a busca por nome encontra. No sistema pronto vem da
   geocodificação; aqui é amostra com coordenada para o mapa ter para onde ir */
const LUGARES = [
  { nome: 'Rodovia MT-140, km 42 — Sorriso, MT', latitude: -12.612, longitude: -55.65 },
  { nome: 'Estrada da Guia, km 12 — Cuiabá, MT', latitude: -15.51, longitude: -56.11 },
  { nome: 'Distrito Industrial — Sinop, MT', latitude: -11.9, longitude: -55.47 },
  { nome: 'Rodovia BR-163, km 780 — Lucas do Rio Verde, MT', latitude: -13.02, longitude: -55.95 },
  { nome: 'Centro — Nova Mutum, MT', latitude: -13.8375, longitude: -56.0742 },
  { nome: 'Centro — Primavera do Leste, MT', latitude: -15.5586, longitude: -54.2961 },
  { nome: 'Centro — Tangará da Serra, MT', latitude: -14.6229, longitude: -57.4833 },
];

const somenteDigitos = (valor) => valor.replace(/\D/g, '');

const mascararCep = (valor) => {
  const digitos = somenteDigitos(valor).slice(0, 8);
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
};

export default function LocalizacaoSeletor({ valor, onChange }) {
  const [modo, setModo] = useState('cep');
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroCep, setErroCep] = useState('');
  const [sugestoes, setSugestoes] = useState([]);

  /* busca da aba do mapa: aceita CEP ou nome e leva o mapa até lá. Marcar
     continua sendo clique no mapa — isto só poupa o arrasto desde o estado
     inteiro até a cidade certa */
  const [busca, setBusca] = useState('');
  const [achados, setAchados] = useState([]);
  const [alvo, setAlvo] = useState(null);

  /* CEP e endereço são buscas diferentes: uma é numérica e exata, a outra é
     texto e aproximada. Antes o campo adivinhava pelo número de dígitos, o que
     funcionava mas não dizia à pessoa o que ele aceitava */
  const [modoBusca, setModoBusca] = useState('texto');
  const [semResultado, setSemResultado] = useState(false);

  const atualizar = (mudancas) => onChange({ ...valor, ...mudancas });

  /* ── CEP ──────────────────────────────────────────────── */
  async function consultarCep(cepDigitado) {
    const digitos = somenteDigitos(cepDigitado);
    if (digitos.length !== 8) return;

    setBuscandoCep(true);
    setErroCep('');

    /* ⚠️ provisório: espera fingida para a interface mostrar o estado de
       carregando, que é onde a maioria dos formulários erra */
    await new Promise((resolver) => setTimeout(resolver, 500));

    const encontrado = CEPS[digitos];
    setBuscandoCep(false);

    if (!encontrado) {
      setErroCep('CEP não encontrado. Você pode escrever o endereço à mão.');
      return;
    }

    atualizar({
      origem: 'cep',
      ...encontrado,
      cep: mascararCep(digitos),
      /* o CEP dá o endereço, não o ponto exato: a coordenada é aproximada e
         a interface precisa dizer isso */
      precisao: 'aproximada',
    });
  }

  /* ── texto livre com sugestão ─────────────────────────── */
  function digitarTexto(texto) {
    atualizar({ origem: 'texto', enderecoLivre: texto, precisao: 'municipio' });

    const termo = texto.trim().toLowerCase();
    setSugestoes(
      termo.length < 3 ? [] : SUGESTOES.filter((s) => s.toLowerCase().includes(termo)).slice(0, 4)
    );
  }

  function escolherSugestao(sugestao) {
    /* escolher uma sugestão dá coordenada ao anúncio; ignorar todas deixa o
       endereço como texto puro, e isso continua válido */
    atualizar({
      origem: 'texto',
      enderecoLivre: sugestao,
      precisao: 'aproximada',
      latitude: -12.55,
      longitude: -55.72,
    });
    setSugestoes([]);
  }

  /* ── busca dentro do mapa ─────────────────────────────── */
  function buscarNoMapa(texto) {
    const porCep = modoBusca === 'cep';
    const valorCampo = porCep ? mascararCep(texto) : texto;

    setBusca(valorCampo);
    setSemResultado(false);

    if (porCep) {
      const digitos = somenteDigitos(valorCampo);
      if (digitos.length < 8) return setAchados([]);

      const encontrado = CEPS[digitos];
      if (!encontrado) {
        setAchados([]);
        setSemResultado(true);
        return;
      }

      setAchados([
        {
          nome: `${encontrado.logradouro}, ${encontrado.bairro}`,
          detalhe: `${encontrado.municipio} · ${encontrado.uf}`,
          ...encontrado,
        },
      ]);
      return;
    }

    const termo = valorCampo.trim().toLowerCase();
    if (termo.length < 3) return setAchados([]);

    const encontrados = LUGARES.filter((l) => l.nome.toLowerCase().includes(termo));
    setAchados(encontrados);
    setSemResultado(encontrados.length === 0);
  }

  function trocarModoBusca(novoModo) {
    /* limpa ao trocar: um CEP meio digitado não é um endereço, e deixá-lo no
       campo faria a busca por texto procurar por «7855» */
    setModoBusca(novoModo);
    setBusca('');
    setAchados([]);
    setSemResultado(false);
  }

  function irPara(lugar) {
    /* move o mapa e já marca o ponto: quem buscou um endereço quer o pino ali,
       e ainda pode arrastar para acertar */
    setAlvo({ latitude: lugar.latitude, longitude: lugar.longitude, zoom: 15 });
    atualizar({
      origem: 'mapa',
      latitude: lugar.latitude,
      longitude: lugar.longitude,
      precisao: 'exata',
      municipio: lugar.municipio || valor.municipio,
      uf: lugar.uf || valor.uf,
    });
    setAchados([]);
    setSemResultado(false);
    setBusca(lugar.nome);
  }

  /* ── mapa ─────────────────────────────────────────────── */
  function usarLocalizacaoAtual() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        const latitude = Number(posicao.coords.latitude.toFixed(5));
        const longitude = Number(posicao.coords.longitude.toFixed(5));

        atualizar({ origem: 'mapa', latitude, longitude, precisao: 'exata' });
        setAlvo({ latitude, longitude, zoom: 16 });
      },
      () => {
        /* negar a permissão é resposta legítima: a pessoa segue pelos outros
           caminhos, sem mensagem de erro culpando quem recusou */
        setModo('cep');
      }
    );
  }

  const temCoordenada = Boolean(valor.latitude && valor.longitude);

  return (
    <div className={styles.root}>
      <div className={styles.abas} role="tablist" aria-label="Como informar o endereço">
        {MODOS.map((opcao) => (
          <button
            key={opcao.id}
            type="button"
            role="tab"
            aria-selected={modo === opcao.id}
            className={`${styles.aba} ${modo === opcao.id ? styles.abaAtiva : ''}`}
            onClick={() => setModo(opcao.id)}
          >
            <Icon name={opcao.icone} size={16} />
            {opcao.rotulo}
          </button>
        ))}
      </div>

      <p className={styles.ajuda}>{MODOS.find((m) => m.id === modo).ajuda}</p>

      {modo === 'cep' ? (
        <div className={styles.corpo}>
          <Field label="CEP" htmlFor="loc-cep" error={erroCep}>
            <Input
              id="loc-cep"
              inputMode="numeric"
              placeholder="00000-000"
              iconLeft="pin"
              value={valor.cep || ''}
              onChange={(evento) => {
                const mascarado = mascararCep(evento.target.value);
                atualizar({ cep: mascarado });
                if (somenteDigitos(mascarado).length === 8) consultarCep(mascarado);
              }}
            />
          </Field>

          {buscandoCep ? <p className={styles.estado}>Consultando CEP…</p> : null}

          {valor.municipio && valor.origem === 'cep' ? (
            <div className={styles.resultado}>
              <Icon name="check" size={15} className={styles.resultadoIcone} />
              <span>
                {valor.logradouro}, {valor.bairro} — <strong>{valor.municipio} · {valor.uf}</strong>
              </span>
            </div>
          ) : null}

          <Field label="Número e complemento" htmlFor="loc-numero" hint="Opcional">
            <Input
              id="loc-numero"
              placeholder="Ex.: 1420, galpão 3"
              value={valor.numero || ''}
              onChange={(evento) => atualizar({ numero: evento.target.value })}
            />
          </Field>
        </div>
      ) : null}

      {modo === 'texto' ? (
        <div className={styles.corpo}>
          <Field
            label="Endereço"
            htmlFor="loc-texto"
            hint="Escreva como alguém chegaria até aí. Sugestões são atalho, não obrigação."
          >
            <Input
              id="loc-texto"
              as="textarea"
              rows={3}
              placeholder="Ex.: Fazenda Santa Luzia, km 42 da MT-140, depois da ponte do rio Verde"
              value={valor.enderecoLivre || ''}
              onChange={(evento) => digitarTexto(evento.target.value)}
            />
          </Field>

          {sugestoes.length ? (
            <ul className={styles.sugestoes}>
              {sugestoes.map((sugestao) => (
                <li key={sugestao}>
                  <button
                    type="button"
                    className={styles.sugestao}
                    onClick={() => escolherSugestao(sugestao)}
                  >
                    <Icon name="pin" size={15} />
                    {sugestao}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <p className={styles.nota}>
            Sem mapa, o anúncio aparece com a localização do município. Ainda funciona na busca.
          </p>
        </div>
      ) : null}

      {modo === 'mapa' ? (
        <div className={styles.corpo}>
          {/* buscar leva o mapa até o lugar. Marcar continua sendo no mapa —
              isto só evita arrastar desde o estado inteiro até a rua certa */}
          <div className={styles.busca}>
            <div className={styles.buscaTopo}>
              <span className={styles.buscaRotulo}>Encontrar no mapa</span>

              <div className={styles.buscaModos} role="tablist" aria-label="Buscar por">
                <button
                  type="button"
                  role="tab"
                  aria-selected={modoBusca === 'texto'}
                  className={`${styles.buscaModo} ${modoBusca === 'texto' ? styles.buscaModoAtivo : ''}`}
                  onClick={() => trocarModoBusca('texto')}
                >
                  Endereço
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={modoBusca === 'cep'}
                  className={`${styles.buscaModo} ${modoBusca === 'cep' ? styles.buscaModoAtivo : ''}`}
                  onClick={() => trocarModoBusca('cep')}
                >
                  CEP
                </button>
              </div>
            </div>

            {/* o campo e a lista ficam no mesmo bloco relativo: a lista flutua
                por cima do mapa em vez de empurrá-lo para baixo, que fazia a
                página saltar a cada letra digitada */}
            <div className={styles.buscaCampo}>
              <Input
                id="loc-busca"
                iconLeft="search"
                autoComplete="off"
                inputMode={modoBusca === 'cep' ? 'numeric' : 'text'}
                placeholder={
                  modoBusca === 'cep' ? '00000-000' : 'Rua, rodovia, bairro ou cidade'
                }
                aria-label={modoBusca === 'cep' ? 'Buscar por CEP' : 'Buscar por endereço'}
                value={busca}
                onChange={(evento) => buscarNoMapa(evento.target.value)}
              />

              {achados.length ? (
                <ul className={styles.dropdown} role="listbox">
                  {achados.map((lugar) => (
                    <li key={lugar.nome}>
                      <button
                        type="button"
                        role="option"
                        aria-selected="false"
                        className={styles.opcao}
                        onClick={() => irPara(lugar)}
                      >
                        <Icon name="pin" size={16} className={styles.opcaoIcone} />

                        <span className={styles.opcaoTexto}>
                          <strong>{lugar.nome}</strong>
                          {lugar.detalhe ? <span>{lugar.detalhe}</span> : null}
                        </span>

                        <Icon name="arrow-right" size={14} className={styles.opcaoSeta} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {semResultado ? (
                <p className={styles.semResultado}>
                  {modoBusca === 'cep'
                    ? 'CEP não encontrado. Você pode marcar direto no mapa.'
                    : 'Nada encontrado com esse nome. Marque direto no mapa.'}
                </p>
              ) : null}
            </div>

            <p className={styles.buscaAjuda}>
              Escolher um resultado leva o mapa até lá e já marca o ponto — depois é só arrastar
              o pino para acertar.
            </p>
          </div>

          <button type="button" className={styles.botaoLocal} onClick={usarLocalizacaoAtual}>
            <Icon name="pin" size={17} />
            Usar minha localização agora
          </button>

          <MapaPicker
            latitude={valor.latitude}
            longitude={valor.longitude}
            alvo={alvo}
            onMarcar={({ latitude, longitude }) =>
              atualizar({ origem: 'mapa', latitude, longitude, precisao: 'exata' })
            }
          />

          {temCoordenada ? (
            <div className={styles.resultado}>
              <Icon name="check" size={15} className={styles.resultadoIcone} />
              <span>
                Ponto marcado em <strong>{valor.latitude}, {valor.longitude}</strong>
              </span>
            </div>
          ) : (
            <p className={styles.nota}>
              Nenhum ponto marcado ainda. Toque no mapa para marcar.
            </p>
          )}
        </div>
      ) : null}

      <label className={styles.privacidade}>
        <input
          type="checkbox"
          checked={valor.exibirExato || false}
          onChange={(evento) => atualizar({ exibirExato: evento.target.checked })}
        />
        <span>
          <strong>Mostrar o endereço exato no anúncio</strong>
          <span className={styles.privacidadeAjuda}>
            Desmarcado, aparece só o município e a região aproximada. É o padrão para quem
            anuncia de casa.
          </span>
        </span>
      </label>
    </div>
  );
}
