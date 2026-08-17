'use client';

/**
 * RequerContaModal — o aviso padrão para quando um visitante clica numa ação
 * que só existe com conta (chamar no WhatsApp, abrir o chat, favoritar).
 *
 * Existia antes como redirecionamento direto para `/entrar`: a pessoa clicava
 * em "Chamar no WhatsApp" e a tela trocava sem aviso nenhum, sem explicar por
 * quê. Este modal explica o motivo antes de sair da página — o "Entrar"
 * continua levando para `/entrar`, com o retorno para a página atual.
 *
 * `acao` é o texto que completa "Para X, você precisa de uma conta gratuita"
 * — cada tela escreve a própria frase (Maturacao/05 não fixa um texto único
 * para isso).
 */

import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal/Modal';
import Button from '@/components/Button/Button';
import styles from './RequerContaModal.module.css';

export default function RequerContaModal({ open, onClose, acao = 'continuar', retorno }) {
  const router = useRouter();

  function entrar() {
    const destino = retorno ? `/entrar?retorno=${encodeURIComponent(retorno)}` : '/entrar';
    router.push(destino);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Você precisa de uma conta"
      description={`Para ${acao}, crie uma conta gratuita ou entre na sua.`}
      footer={
        <div className={styles.rodape}>
          <Button variant="ghost" onClick={onClose}>
            Agora não
          </Button>
          <Button variant="primary" onClick={entrar}>
            Entrar ou cadastrar
          </Button>
        </div>
      }
    />
  );
}
