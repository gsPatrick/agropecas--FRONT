'use client';

/**
 * Confirmação de ação administrativa, com motivo obrigatório.
 *
 * Toda intervenção — suspender, banir, reprovar, remover — passa por aqui, e
 * por três razões:
 *
 *  · **O motivo vai para a auditoria.** Sem ele, o próximo administrador vê
 *    "usuário suspenso" sem saber se pode restaurar, e a decisão vira aposta.
 *  · **O motivo vai para a pessoa.** Sanção sem explicação gera resposta no
 *    suporte, e a resposta custa mais tempo do que escrever a frase aqui.
 *  · **O passo extra freia o clique errado.** Estas ações não têm desfazer de
 *    verdade: restaurar devolve o acesso, mas não a venda perdida no meio.
 *
 * As ações destrutivas ainda exigem digitar a palavra de confirmação — o
 * mesmo padrão do encerramento de conta, pela mesma razão.
 */

import { useEffect, useState } from 'react';
import Modal from '@/components/Modal/Modal';
import Button from '@/components/Button/Button';
import Field from '@/components/Field/Field';
import Input from '@/components/Input/Input';
import Icon from '@/components/Icon/Icon';
import styles from './AdminAcaoModal.module.css';

/**
 * Prazos possíveis para as medidas temporárias.
 *
 * “Indeterminado” está aqui de propósito, e não como ausência de escolha: a
 * medida sem prazo é legítima (fraude em apuração, por exemplo), mas precisa
 * ser dita como decisão. Deixar o campo em branco produziria o mesmo efeito
 * prático sem ninguém ter escolhido — e é assim que uma conta fica suspensa
 * por seis meses porque todo mundo achou que outro ia revisar.
 */
export const PRAZOS = [
  { id: '3', rotulo: '3 dias' },
  { id: '7', rotulo: '7 dias' },
  { id: '15', rotulo: '15 dias' },
  { id: '30', rotulo: '30 dias' },
  { id: 'indeterminado', rotulo: 'Por tempo indeterminado' },
];

export default function AdminAcaoModal({
  acao,
  onFechar,
  onConfirmar,
  /* sugestões de motivo: escrever do zero a cada vez faz o campo virar "abuso"
     em toda sanção, e aí ele deixa de informar qualquer coisa */
  motivos = [],
}) {
  const [motivo, setMotivo] = useState('');
  const [palavra, setPalavra] = useState('');
  const [avisar, setAvisar] = useState(true);
  const [prazo, setPrazo] = useState('7');

  /* zera ao trocar de ação: sem isto o motivo da suspensão anterior aparece
     preenchido na próxima, e é o tipo de texto que ninguém relê */
  useEffect(() => {
    setMotivo('');
    setPalavra('');
    setAvisar(true);
    setPrazo(acao?.prazoPadrao || '7');
  }, [acao?.id, acao?.prazoPadrao]);

  if (!acao) return null;

  const precisaPalavra = Boolean(acao.palavra);
  const palavraOk = !precisaPalavra || palavra.trim().toUpperCase() === acao.palavra;
  const podeConfirmar = motivo.trim().length >= 8 && palavraOk;

  return (
    <Modal
      open
      onClose={onFechar}
      title={acao.titulo}
      description={acao.descricao}
      footer={
        <div className={styles.rodape}>
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>

          <Button
            variant={acao.destrutiva ? 'primary' : 'forest'}
            disabled={!podeConfirmar}
            onClick={() =>
              onConfirmar({
                motivo: motivo.trim(),
                avisar,
                prazo: acao.comPrazo ? prazo : null,
                prazoRotulo: acao.comPrazo
                  ? PRAZOS.find((item) => item.id === prazo)?.rotulo
                  : null,
              })
            }
          >
            {acao.confirmar}
          </Button>
        </div>
      }
    >
      {acao.consequencias?.length ? (
        <ul className={`${styles.consequencias} ${acao.destrutiva ? styles.graves : ''}`}>
          {acao.consequencias.map((texto) => (
            <li key={texto}>
              <Icon name="chevron-right" size={13} />
              {texto}
            </li>
          ))}
        </ul>
      ) : null}

      {/* o prazo vem antes do motivo: é a parte da decisão que muda o efeito
          dela, e escondida depois do texto livre acaba no valor padrão */}
      {acao.comPrazo ? (
        <div className={styles.prazo}>
          <span className={styles.prazoRotulo}>{acao.prazoTitulo || 'Por quanto tempo'}</span>

          <div className={styles.prazos}>
            {PRAZOS.map((opcao) => (
              <button
                key={opcao.id}
                type="button"
                className={`${styles.opcaoPrazo} ${
                  prazo === opcao.id ? styles.opcaoPrazoAtiva : ''
                }`}
                onClick={() => setPrazo(opcao.id)}
                aria-pressed={prazo === opcao.id}
              >
                {opcao.rotulo}
              </button>
            ))}
          </div>

          <span className={styles.prazoDica}>
            {prazo === 'indeterminado'
              ? 'Sem data para voltar sozinho — só sai desta situação por decisão da administração. A pessoa vê isso escrito.'
              : `Volta ao normal automaticamente em ${
                  PRAZOS.find((item) => item.id === prazo)?.rotulo
                }. A pessoa vê a data.`}
          </span>
        </div>
      ) : null}

      {motivos.length ? (
        <div className={styles.sugestoes}>
          {motivos.map((sugestao) => (
            <button
              key={sugestao}
              type="button"
              className={`${styles.sugestao} ${motivo === sugestao ? styles.sugestaoAtiva : ''}`}
              onClick={() => setMotivo(sugestao)}
            >
              {sugestao}
            </button>
          ))}
        </div>
      ) : null}

      <Field
        label="Motivo"
        htmlFor="motivo-acao"
        hint="Fica na auditoria e é o que a pessoa recebe. Mínimo de 8 caracteres."
      >
        <Input
          as="textarea"
          id="motivo-acao"
          rows={3}
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
          placeholder="Descreva o que motivou esta decisão"
        />
      </Field>

      <label className={styles.avisar}>
        <input
          type="checkbox"
          checked={avisar}
          onChange={(evento) => setAvisar(evento.target.checked)}
        />
        <span>
          Avisar a pessoa por e-mail
          <span className={styles.avisarDica}>
            Desmarcar só se a comunicação já tiver sido feita por outro canal.
          </span>
        </span>
      </label>

      {precisaPalavra ? (
        <Field
          label={`Digite ${acao.palavra} para confirmar`}
          htmlFor="palavra-acao"
          hint="A palavra existe para o clique não ser acidental"
        >
          <Input
            id="palavra-acao"
            value={palavra}
            onChange={(evento) => setPalavra(evento.target.value)}
            placeholder={acao.palavra}
          />
        </Field>
      ) : null}
    </Modal>
  );
}
