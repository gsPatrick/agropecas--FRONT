'use client';

/**
 * Barra do topo da administração.
 *
 * Traz o nome da seção, a busca global e a identificação de quem está
 * administrando. O nome de quem está logado fica visível o tempo todo de
 * propósito: toda ação daqui vai para a auditoria com esse nome, e quem age
 * precisa saber em nome de quem está agindo.
 */

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Icon from '@/components/Icon/Icon';
import Input from '@/components/Input/Input';
import { rotuloAtualAdmin } from '@/lib/admin-menu';
import styles from './AdminBarraTopo.module.css';

export default function AdminBarraTopo({ admin }) {
  const caminho = usePathname();
  const secao = rotuloAtualAdmin(caminho);

  return (
    <header className={styles.root}>
      {/* no celular a marca aparece aqui: a barra lateral não existe lá, e sem
          ela o cabeçalho não diria em que produto a pessoa está */}
      <span className={styles.marca}>
        <Icon name="leaf" size={18} />
        <span className={styles.selo}>admin</span>
      </span>

      <span className={styles.secao}>{secao}</span>

      <div className={styles.busca}>
        <Input
          placeholder="Buscar usuário, anúncio ou denúncia"
          iconLeft="search"
          aria-label="Busca da administração"
        />
      </div>

      <Link href="/" className={styles.verSite} title="Abrir o site">
        <Icon name="eye" size={16} />
        <span>Ver o site</span>
      </Link>

      <div className={styles.identidade}>
        <span className={styles.avatar}>{admin.iniciais}</span>

        <span className={styles.texto}>
          <strong>{admin.nome}</strong>
          <span>{admin.papel}</span>
        </span>
      </div>
    </header>
  );
}
