'use client';

/**
 * Administração → Comunicados.
 *
 * O canal da plataforma para falar com quem usa: manutenção programada, aviso
 * de golpe em circulação, recurso novo.
 *
 * Duas escolhas moldam a tela:
 *
 *  · **Público antes do texto.** Aviso para prestador que chega ao produtor é
 *    ruído, e ruído ensina a ignorar o próximo — que pode ser o que evitaria
 *    um golpe.
 *  · **Canal é escolha explícita.** Faixa no topo do site interrompe todo
 *    mundo; aviso no painel espera a pessoa entrar. Mandar nos três por
 *    padrão gastaria a atenção que existe uma vez.
 */

import { useEffect, useState } from 'react';
import PainelCartao from '@/components/PainelCartao/PainelCartao';
import AdminEtiqueta from '@/components/AdminEtiqueta/AdminEtiqueta';
import Modal from '@/components/Modal/Modal';
import Field from '@/components/Field/Field';
import Input from '@/components/Input/Input';
import Button from '@/components/Button/Button';
import Icon from '@/components/Icon/Icon';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import { enviarComunicado, listarHistoricoComunicados, PUBLICOS } from '@/lib/dados/admin-comunicados';
import styles from './page.module.css';

/**
 * ⚠️ Só os canais que `POST /notificacoes/massa` de fato entrega
 * (`notificacao.constants.js:CANAIS_ENTREGUES`). O mock antigo também tinha
 * "Faixa no topo do site" — não existe no backend: seria um aviso para
 * VISITANTE sem sessão, uma feature própria, não uma variação deste envio.
 */
const CANAIS_COMUNICADO = [
  { id: 'sistema', rotulo: 'Aviso no painel', icone: 'bell' },
  { id: 'email', rotulo: 'E-mail', icone: 'mail' },
];

const SITUACAO = {
  enviado: { rotulo: 'Enviado', tom: 'ok' },
  enviando: { rotulo: 'Enviando…', tom: 'alerta' },
  erro: { rotulo: 'Falhou', tom: 'perigo' },
};

const NOVO = {
  titulo: '',
  texto: '',
  publico: 'todos',
  canais: ['sistema'],
};

export default function AdminComunicadosPage() {
  const aviso = useAviso();

  /* histórico vem de `GET /notificacoes/massa` (lê a trilha de auditoria por
     lote — não existe tabela "comunicados" própria); `null` = carregando.
     Itens enviados NESTA sessão entram na frente da lista assim que
     `publicar()` roda, antes mesmo do histórico confirmar. */
  const [lista, setLista] = useState(null);
  const [rascunho, setRascunho] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const controlador = new AbortController();

    listarHistoricoComunicados({ sinal: controlador.signal })
      .then(({ itens }) => setLista(itens))
      .catch((erro) => {
        if (erro.name !== 'AbortError') {
          setLista([]);
          aviso.erro('Não foi possível carregar o histórico de comunicados.');
        }
      });

    return () => controlador.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function publicar() {
    if (rascunho.titulo.trim().length < 6) {
      aviso.erro('Escreva um título — é a primeira coisa que a pessoa lê.');
      return;
    }

    if (rascunho.texto.trim().length < 20) {
      aviso.erro('O texto está curto demais para explicar o aviso.');
      return;
    }

    if (!rascunho.canais.length) {
      aviso.erro('Escolha ao menos um canal — senão o aviso não chega a lugar nenhum.');
      return;
    }

    const idLocal = `k${Date.now()}`;
    setLista((atual) => [
      { ...rascunho, id: idLocal, situacao: 'enviando', quando: 'agora' },
      ...(atual || []),
    ]);
    setEnviando(true);
    setRascunho(null);

    try {
      await enviarComunicado({
        titulo: rascunho.titulo,
        mensagem: rascunho.texto,
        publico: rascunho.publico,
        canais: rascunho.canais,
      });

      setLista((atual) =>
        atual.map((item) => (item.id === idLocal ? { ...item, situacao: 'enviado' } : item))
      );
      aviso.sucesso('Comunicado aceito — a entrega roda em segundo plano.');
    } catch (erro) {
      setLista((atual) =>
        atual.map((item) => (item.id === idLocal ? { ...item, situacao: 'erro' } : item))
      );
      aviso.erro(erro.message || 'Não foi possível enviar o comunicado.');
    } finally {
      setEnviando(false);
    }
  }

  function alternarCanal(id) {
    setRascunho((atual) => ({
      ...atual,
      canais: atual.canais.includes(id)
        ? atual.canais.filter((item) => item !== id)
        : [...atual.canais, id],
    }));
  }

  return (
    <>
      <header className={styles.topo}>
        <div>
          <h1 className={styles.titulo}>Comunicados</h1>
          <p className={styles.descricao}>Avisos da plataforma para quem usa.</p>
        </div>

        <Button iconLeft="plus" onClick={() => setRascunho({ ...NOVO })}>
          Novo comunicado
        </Button>
      </header>

      {lista === null ? (
        <div className={styles.carregando}>
          <Esqueleto altura={92} raio={10} />
          <Esqueleto altura={92} raio={10} />
          <Esqueleto altura={92} raio={10} />
        </div>
      ) : null}

      {lista && lista.length === 0 ? (
        <p className={styles.vazio}>Nenhum comunicado enviado até agora.</p>
      ) : null}

      <ul className={styles.lista}>
        {(lista || []).map((comunicado) => {
          const situacao = SITUACAO[comunicado.situacao];
          const publico = PUBLICOS.find((item) => item.id === comunicado.publico);

          return (
            <li key={comunicado.id} className={styles.cartao}>
              <div className={styles.cabecalho}>
                <AdminEtiqueta tom={situacao.tom} ponto>
                  {situacao.rotulo}
                </AdminEtiqueta>

                <span className={styles.publico}>
                  <Icon name="user" size={12} />
                  {publico?.rotulo}
                </span>

                <span className={styles.quando}>{comunicado.quando}</span>
              </div>

              <div className={styles.corpo}>
                <h2 className={styles.comunicadoTitulo}>{comunicado.titulo}</h2>
                {comunicado.texto ? <p className={styles.texto}>{comunicado.texto}</p> : null}
              </div>

              <div className={styles.rodape}>
                <span className={styles.canais}>
                  {comunicado.canais.map((canalId) => {
                    const canal = CANAIS_COMUNICADO.find((item) => item.id === canalId);

                    return (
                      <span key={canalId} className={styles.canal}>
                        <Icon name={canal.icone} size={12} />
                        {canal.rotulo}
                      </span>
                    );
                  })}
                </span>

              </div>
            </li>
          );
        })}
      </ul>

      {rascunho ? (
        <Modal
          open
          onClose={() => setRascunho(null)}
          title="Novo comunicado"
          description="Chega a quem você escolher, pelos canais marcados."
          footer={
            <div className={styles.rodapeModal}>
              <Button variant="ghost" onClick={() => setRascunho(null)} disabled={enviando}>
                Cancelar
              </Button>

              <Button variant="forest" onClick={publicar} disabled={enviando}>
                Enviar agora
              </Button>
            </div>
          }
        >
          <div className={styles.campos}>
            {/* público primeiro: é ele que decide se o aviso informa ou vira
                ruído — e ruído ensina a ignorar o próximo */}
            <Field label="Quem recebe" htmlFor="publico">
              <Input
                as="select"
                id="publico"
                value={rascunho.publico}
                onChange={(evento) => setRascunho({ ...rascunho, publico: evento.target.value })}
              >
                {PUBLICOS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.rotulo}
                  </option>
                ))}
              </Input>
            </Field>

            <Field label="Título" htmlFor="titulo-comunicado">
              <Input
                id="titulo-comunicado"
                value={rascunho.titulo}
                onChange={(evento) => setRascunho({ ...rascunho, titulo: evento.target.value })}
                placeholder="Manutenção programada no domingo"
              />
            </Field>

            <Field
              label="Texto"
              htmlFor="texto-comunicado"
              hint="Direto ao ponto: o que acontece, quando e o que a pessoa precisa fazer"
            >
              <Input
                as="textarea"
                id="texto-comunicado"
                rows={4}
                value={rascunho.texto}
                onChange={(evento) => setRascunho({ ...rascunho, texto: evento.target.value })}
              />
            </Field>

            <div>
              <span className={styles.rotuloCanais}>Por onde enviar</span>

              <div className={styles.opcoesCanais}>
                {CANAIS_COMUNICADO.map((canal) => {
                  const marcado = rascunho.canais.includes(canal.id);

                  return (
                    <button
                      key={canal.id}
                      type="button"
                      className={`${styles.opcaoCanal} ${marcado ? styles.opcaoCanalAtiva : ''}`}
                      onClick={() => alternarCanal(canal.id)}
                      aria-pressed={marcado}
                    >
                      <Icon name={canal.icone} size={14} />
                      {canal.rotulo}
                    </button>
                  );
                })}
              </div>

              <span className={styles.dicaCanais}>
                O aviso no painel espera a pessoa entrar; o e-mail chega na hora. Enviado assim que
                você confirmar — a API não agenda envio futuro.
              </span>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
