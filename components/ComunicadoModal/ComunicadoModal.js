'use client';

/**
 * ComunicadoModal — o aviso que a administração manda para a base ("fora do
 * ar no domingo", "categoria nova") aparece aqui, para quem estiver logado.
 *
 * Fica no layout raiz, ao lado do `ChatWidget`: não é exclusivo de um perfil —
 * produtor, loja, prestador e cliente podem estar no segmento de qualquer
 * comunicado (`POST /notificacoes/massa`, campo `segmento.tipoPerfil`).
 *
 * Um de cada vez, mesmo que existam vários não lidos: empilhar avisos na
 * mesma tela é o tipo de coisa que faz a pessoa fechar tudo sem ler nenhum.
 * Fechar marca como lido e revela o próximo, se houver.
 *
 * Não aparece em `/admin`: quem está DENTRO da administração é quem manda o
 * comunicado, não quem o recebe — um aviso próprio por cima da própria tela
 * de trabalho não tem serventia. Também não aparece em `/entrar`: a pessoa
 * ainda não tem sessão para os avisos pousarem.
 */

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Modal from '@/components/Modal/Modal';
import Button from '@/components/Button/Button';
import { useSessao } from '@/lib/sessao';
import { carregarComunicadosNaoLidos, marcarComoLida } from '@/lib/dados/notificacoes';
import styles from './ComunicadoModal.module.css';

const OCULTO_EM = ['/entrar', '/admin'];

export default function ComunicadoModal() {
  const caminho = usePathname();
  const { autenticado } = useSessao();
  const [fila, setFila] = useState([]);
  const [fechando, setFechando] = useState(false);

  const ativo = OCULTO_EM.every((rota) => !caminho.startsWith(rota));

  useEffect(() => {
    if (!autenticado || !ativo) {
      setFila([]);
      return undefined;
    }

    const controle = new AbortController();

    carregarComunicadosNaoLidos({ sinal: controle.signal })
      .then(setFila)
      .catch(() => {
        /* sem comunicado nenhum não é erro de tela: a pessoa só segue sem ver
           aviso nenhum */
      });

    return () => controle.abort();
  }, [autenticado, ativo]);

  const atual = fila[0];

  function fechar() {
    if (!atual || fechando) return;

    setFechando(true);
    marcarComoLida(atual.id)
      .catch(() => {
        /* a marcação falhou: o comunicado volta a aparecer na próxima
           navegação, o que é melhor do que travar quem só quer fechar */
      })
      .finally(() => {
        setFila((restante) => restante.slice(1));
        setFechando(false);
      });
  }

  if (!atual) return null;

  return (
    <Modal open title={atual.titulo} onClose={fechar}>
      <p className={styles.mensagem}>{atual.mensagem}</p>

      {atual.link ? (
        <a className={styles.link} href={atual.link}>
          Saiba mais
        </a>
      ) : null}

      <Button onClick={fechar} disabled={fechando} fullWidth>
        {fila.length > 1 ? 'Entendi, próximo aviso' : 'Entendi'}
      </Button>
    </Modal>
  );
}
