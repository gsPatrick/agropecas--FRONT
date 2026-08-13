'use client';

/**
 * Barra lateral da administração.
 *
 * Retrátil, e a escolha é lembrada: quem passa o dia na tabela de usuários
 * quer a largura toda; quem está navegando quer os rótulos. Impor um dos dois
 * erra metade das vezes.
 *
 * Recolhida vira faixa de ícones com `title` — não some. "Moderação",
 * "Denúncias" e "Auditoria" têm ícones que não se distinguem sozinhos, e numa
 * tela com poder de banir o clique errado custa caro; por isso a dica de texto
 * continua, e o contador vira um ponto no canto do ícone.
 *
 * No celular ela não existe: lá a navegação é a barra inferior.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import BrandMark from '@/components/BrandMark/BrandMark';
import Icon from '@/components/Icon/Icon';
import { montarMenuAdmin, estaAtivo } from '@/lib/admin-menu';
import styles from './AdminSidebar.module.css';

export default function AdminSidebar({ contadores = {}, recolhida, onAlternar }) {
  const caminho = usePathname();
  const grupos = montarMenuAdmin();

  return (
    <aside
      className={`${styles.root} ${recolhida ? styles.recolhida : ''}`}
      data-recolhida={recolhida ? 'sim' : 'nao'}
    >
      {/* o botão fica montado NA BORDA, metade para fora: assim pertence à
          divisa entre menu e conteúdo, que é o que ele move */}
      <button
        type="button"
        className={styles.alternar}
        onClick={onAlternar}
        aria-label={recolhida ? 'Expandir menu' : 'Recolher menu'}
        title={recolhida ? 'Expandir menu' : 'Recolher menu'}
        aria-expanded={!recolhida}
      >
        <Icon name={recolhida ? 'chevron-right' : 'chevron-left'} size={15} />
      </button>

      <div className={styles.topo}>
        <Link href="/admin" className={styles.marca} aria-label="AgroPeças MT — administração">
          {recolhida ? <Icon name="leaf" size={22} /> : <BrandMark size="sm" />}
          {recolhida ? null : <span className={styles.selo}>admin</span>}
        </Link>
      </div>

      <nav className={styles.nav} aria-label="Menu da administração">
        {grupos.map((grupo) => (
          <div key={grupo.titulo} className={styles.grupo}>
            <span className={styles.grupoTitulo}>{recolhida ? '·' : grupo.titulo}</span>

            {grupo.itens.map((item) => {
              const ativo = estaAtivo(item, caminho);
              const contador = contadores[item.contador];

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.item} ${ativo ? styles.itemAtivo : ''}`}
                  aria-current={ativo ? 'page' : undefined}
                  title={recolhida ? item.rotulo : undefined}
                >
                  <span className={styles.itemIcone}>
                    <Icon name={item.icone} size={17} />
                    {/* recolhida, o número não caberia: vira ponto no canto,
                        que ainda avisa que há fila esperando */}
                    {contador > 0 ? <span className={styles.ponto} /> : null}
                  </span>

                  <span className={styles.itemTexto}>{item.rotulo}</span>

                  {contador > 0 ? <span className={styles.contador}>{contador}</span> : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* saída para o site: quem administra também é usuário, e ficar preso no
          admin obriga a digitar a URL na mão */}
      <Link href="/painel" className={styles.saida} title="Voltar ao meu painel">
        <Icon name="chevron-left" size={15} />
        <span className={styles.saidaTexto}>Voltar ao meu painel</span>
      </Link>
    </aside>
  );
}
