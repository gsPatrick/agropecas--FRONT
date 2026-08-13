/**
 * FooterBackground — paisagem travada no fundo da janela, revelada ao fim do
 * scroll. Recipe: recipes/parallax-footer-reveal.
 *
 * Sem JS e sem background-attachment: a imagem é `fixed` no rodapé da viewport
 * e fica atrás do fluxo; o wrapper opaco da página a cobre enquanto se rola.
 * Quando o conteúdo acaba, não há mais o que cobrir — a cena aparece.
 *
 * Dois requisitos, ambos fáceis de quebrar:
 *  1. o wrapper da página precisa de background-color OPACO;
 *  2. nenhum ancestral pode ter transform/filter/opacity/isolation, senão o
 *     z-index negativo deixa de escapar e a imagem some.
 */

import styles from './FooterBackground.module.css';

export default function FooterBackground() {
  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/campo-linha.png" alt="" className={styles.image} aria-hidden="true" />

        <div className={styles.bar}>
          <span>© 2026 AgroPeças MT. Todos os direitos reservados.</span>
          <a href="https://codebypatrick.dev/" target="_blank" rel="noopener noreferrer">
            Desenvolvido por Patrick.Developer
          </a>
        </div>
      </div>
    </div>
  );
}
