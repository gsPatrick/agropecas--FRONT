'use client';

/**
 * ⚠️ PROVISÓRIO — troca o tipo de perfil sem backend.
 *
 * Existe só para conferir as três variações do painel enquanto não há API.
 * Some junto com o mock: quando a sessão vier do servidor, o tipo de perfil é
 * do cadastro e ninguém troca pela interface.
 */

import { PERFIS } from '@/lib/sessao';
import Icon from '@/components/Icon/Icon';
import styles from './PerfilChaveta.module.css';

export default function PerfilChaveta({ atual, onTrocar }) {
  return (
    <div className={styles.root} role="group" aria-label="Trocar perfil (provisório)">
      <span className={styles.aviso}>Pré-visualizar como</span>

      <div className={styles.botoes}>
        {Object.values(PERFIS).map((perfil) => (
          <button
            key={perfil.tipo}
            type="button"
            className={`${styles.botao} ${atual === perfil.tipo ? styles.ativo : ''}`}
            onClick={() => onTrocar(perfil.tipo)}
            aria-pressed={atual === perfil.tipo}
          >
            <Icon name={perfil.icone} size={15} />
            <span className={styles.rotulo}>{perfil.rotulo}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
