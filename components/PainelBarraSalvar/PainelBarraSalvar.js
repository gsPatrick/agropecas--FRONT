'use client';

/**
 * Barra de salvar das telas de edição do painel.
 *
 * Presa embaixo porque estas páginas são longas: com o botão no fim do
 * formulário, quem edita um campo no meio da tela não vê como confirmar e sai
 * achando que salvou.
 *
 * Vira componente por existir igual em quatro telas (perfil, propriedade,
 * atendimento, serviços). Copiada em cada uma, divergiria na primeira
 * correção feita em só uma delas.
 */

import Button from '@/components/Button/Button';
import styles from './PainelBarraSalvar.module.css';

export default function PainelBarraSalvar({
  alterado,
  onDescartar,
  rotulo = 'Salvar alterações',
  /* o que dizer quando não há nada pendente — cada tela tem o seu assunto */
  textoSalvo = 'Tudo salvo',
}) {
  return (
    <div className={`${styles.root} ${alterado ? styles.ativa : ''}`}>
      <span className={styles.estado}>
        {alterado ? 'Alterações não salvas' : textoSalvo}
      </span>

      <div className={styles.botoes}>
        {alterado ? (
          <Button type="button" variant="ghost" onClick={onDescartar}>
            Descartar
          </Button>
        ) : null}

        <Button type="submit" disabled={!alterado} iconLeft="check">
          {rotulo}
        </Button>
      </div>
    </div>
  );
}
