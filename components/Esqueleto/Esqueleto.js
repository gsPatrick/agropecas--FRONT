'use client';

/**
 * Esqueleto de carregamento.
 *
 * Ocupa exatamente o espaço que o conteúdo vai ocupar, para a página não
 * pular quando os dados chegarem. Salto de layout é pior que espera: a pessoa
 * clica no que estava ali e acerta outra coisa.
 *
 * É proposital que ele não tenha aparência própria — recebe largura, altura e
 * raio de quem o usa, porque cada lugar tem uma forma. Um "esqueleto padrão"
 * obrigaria cada tela a corrigir o tamanho por fora, que é o mesmo trabalho
 * com mais um passo.
 */

import styles from './Esqueleto.module.css';

export default function Esqueleto({
  largura = '100%',
  altura = 16,
  raio,
  className = '',
  /* quantos blocos iguais, para listas: dez chamadas ao componente fazem a
     tela repetir marcação que ninguém vai ler */
  repetir = 1,
}) {
  const bloco = (chave) => (
    <span
      key={chave}
      className={`${styles.root} ${className}`}
      style={{
        '--largura': typeof largura === 'number' ? `${largura}px` : largura,
        '--altura': typeof altura === 'number' ? `${altura}px` : altura,
        ...(raio ? { '--raio': typeof raio === 'number' ? `${raio}px` : raio } : {}),
      }}
      aria-hidden="true"
    />
  );

  if (repetir === 1) return bloco(0);

  return (
    <>
      {Array.from({ length: repetir }, (_, indice) => bloco(indice))}
    </>
  );
}
