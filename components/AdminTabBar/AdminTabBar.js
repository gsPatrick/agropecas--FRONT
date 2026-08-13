'use client';

/**
 * Barra inferior da administração — a navegação no celular.
 *
 * A Aline vai olhar denúncia no domingo pelo telefone. Gaveta lateral exige
 * duas ações (abrir e escolher) para o que aqui custa uma, e o polegar alcança
 * a base da tela sem reposicionar a mão.
 *
 * Quatro destinos e um botão “Mais”, que abre o resto do menu numa folha. Os
 * quatro são os de decisão — o que chegou e precisa de resposta; catálogo,
 * comunicados e configurações são trabalho de mesa e ficam em “Mais”.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/Icon/Icon';
import { itensMobileAdmin, itensExtrasAdmin, estaAtivo } from '@/lib/admin-menu';
import styles from './AdminTabBar.module.css';

export default function AdminTabBar({ contadores = {} }) {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);

  const itens = itensMobileAdmin();
  const grupos = itensExtrasAdmin();

  /* fecha ao navegar: a folha aberta cobriria a tela nova */
  useEffect(() => {
    setAberto(false);
  }, [caminho]);

  useEffect(() => {
    if (!aberto) return undefined;

    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [aberto]);

  /* soma o que ficou em “Mais”: sem isso, uma denúncia de LGPD vencendo não
     apareceria em lugar nenhum da barra */
  const extras = grupos
    .flatMap((grupo) => grupo.itens)
    .reduce((total, item) => total + (contadores[item.contador] || 0), 0);

  const naFolha = grupos.some((grupo) =>
    grupo.itens.some((item) => estaAtivo(item, caminho))
  );

  return (
    <>
      <nav className={styles.root} aria-label="Navegação da administração">
        <ul className={styles.lista}>
          {itens.map((item) => {
            const ativo = estaAtivo(item, caminho);
            const contador = contadores[item.contador];

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`${styles.aba} ${ativo ? styles.abaAtiva : ''}`}
                  aria-current={ativo ? 'page' : undefined}
                >
                  <span className={styles.icone}>
                    <Icon name={item.icone} size={20} />
                    {contador > 0 ? (
                      <span className={styles.selo}>{contador > 9 ? '9+' : contador}</span>
                    ) : null}
                  </span>

                  <span className={styles.rotulo}>{item.rotulo}</span>
                </Link>
              </li>
            );
          })}

          <li>
            <button
              type="button"
              className={`${styles.aba} ${naFolha ? styles.abaAtiva : ''}`}
              onClick={() => setAberto(true)}
              aria-haspopup="menu"
              aria-expanded={aberto}
            >
              <span className={styles.icone}>
                <Icon name="menu" size={20} />
                {extras > 0 ? <span className={styles.selo}>{extras}</span> : null}
              </span>

              <span className={styles.rotulo}>Mais</span>
            </button>
          </li>
        </ul>
      </nav>

      {aberto ? (
        <div className={styles.folhaRaiz}>
          <button
            type="button"
            className={styles.veu}
            onClick={() => setAberto(false)}
            aria-label="Fechar menu"
          />

          <div className={styles.folha} role="menu">
            <div className={styles.puxador} aria-hidden="true" />

            {grupos.map((grupo) => (
              <div key={grupo.titulo} className={styles.grupo}>
                <span className={styles.grupoTitulo}>{grupo.titulo}</span>

                {grupo.itens.map((item) => {
                  const contador = contadores[item.contador];

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      className={`${styles.item} ${
                        estaAtivo(item, caminho) ? styles.itemAtivo : ''
                      }`}
                    >
                      <Icon name={item.icone} size={18} />
                      <span>{item.rotulo}</span>

                      {contador > 0 ? (
                        <span className={styles.contador}>{contador}</span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            ))}

            <Link href="/painel" className={styles.saida}>
              <Icon name="chevron-left" size={16} />
              Voltar ao meu painel
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
