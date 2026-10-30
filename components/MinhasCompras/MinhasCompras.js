'use client';

/**
 * "Minhas compras" — o lado do comprador na custódia (Maturacao/06).
 *
 * Componente e não página porque aparece em dois lugares: no painel de quem
 * vende (`/painel/compras`) e na `/conta` de quem só compra. Os dois perfis
 * compram; só a moldura em volta muda.
 *
 * Confirmar o recebimento libera o dinheiro ao vendedor e não tem volta —
 * por isso passa por um diálogo que diz exatamente isso. A disputa pede o
 * relato, que vai para a equipe que vai analisar.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Modal from '@/components/Modal/Modal';
import Button from '@/components/Button/Button';
import Field from '@/components/Field/Field';
import Input from '@/components/Input/Input';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import PedidoItem from '@/components/PedidoItem/PedidoItem';
import PainelSegmentos from '@/components/PainelSegmentos/PainelSegmentos';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import {
  listarCompras,
  confirmarRecebimento,
  abrirDisputa,
  cancelarPedido,
  reais,
} from '@/lib/dados/pedidos';
import styles from './MinhasCompras.module.css';

const FILTROS = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'pago', rotulo: 'A receber' },
  { id: 'aguardando_pagamento', rotulo: 'Aguardando pagamento' },
  { id: 'entregue', rotulo: 'Recebidas' },
];

export default function MinhasCompras() {
  const aviso = useAviso();
  const [filtro, setFiltro] = useState('todas');
  const [pedidos, setPedidos] = useState(null);
  const [ocupado, setOcupado] = useState(null);
  const [confirmando, setConfirmando] = useState(null);
  const [disputando, setDisputando] = useState(null);
  const [relato, setRelato] = useState('');

  const carregar = useCallback(
    (sinal) =>
      listarCompras({ status: filtro === 'todas' ? undefined : filtro, porPagina: 50 }, { sinal })
        .then(({ dados }) => setPedidos(dados))
        .catch((erro) => {
          if (erro.name === 'AbortError') return;
          setPedidos([]);
          aviso.erro(erro.message);
        }),
    [filtro, aviso]
  );

  useEffect(() => {
    const controle = new AbortController();
    setPedidos(null);
    carregar(controle.signal);
    return () => controle.abort();
  }, [carregar]);

  function trocar(atualizado) {
    setPedidos((lista) => lista.map((item) => (item.id === atualizado.id ? atualizado : item)));
  }

  async function executar(pedido, acao, mensagem) {
    setOcupado(pedido.id);
    try {
      trocar(await acao());
      aviso.sucesso(mensagem);
    } catch (erro) {
      aviso.erro(erro.message);
    } finally {
      setOcupado(null);
    }
  }

  async function confirmar() {
    const pedido = confirmando;
    setConfirmando(null);
    await executar(pedido, () => confirmarRecebimento(pedido.id), 'Recebimento confirmado. Obrigado!');
  }

  async function disputar() {
    const pedido = disputando;
    const texto = relato.trim();
    setDisputando(null);
    setRelato('');
    await executar(pedido, () => abrirDisputa(pedido.id, texto), 'Recebemos seu relato. Nossa equipe vai entrar em contato.');
  }

  return (
    <div className={styles.root}>
      <PainelSegmentos opcoes={FILTROS} valor={filtro} onMudar={setFiltro} rotulo="Situação da compra" />

      <div className={styles.quadro}>
        {pedidos === null ? (
          <div className={styles.carregando}>
            <Esqueleto altura={88} raio={12} />
            <Esqueleto altura={88} raio={12} />
          </div>
        ) : pedidos.length ? (
          pedidos.map((pedido) => (
            <PedidoItem
              key={pedido.id}
              pedido={pedido}
              lado="comprador"
              ocupado={ocupado === pedido.id}
              onConfirmar={setConfirmando}
              onDisputar={setDisputando}
              onCancelar={(alvo) => executar(alvo, () => cancelarPedido(alvo.id), 'Pedido cancelado.')}
            />
          ))
        ) : (
          <div className={styles.vazio}>
            <p>Nenhuma compra por aqui.</p>
            <Button as={Link} href="/busca" variant="outline" size="sm">
              Procurar peças
            </Button>
          </div>
        )}
      </div>

      <Modal
        open={Boolean(confirmando)}
        onClose={() => setConfirmando(null)}
        title="A peça chegou certinha?"
        description={
          confirmando
            ? `Ao confirmar, liberamos ${reais(confirmando.valorTotalCentavos)} (menos a taxa da plataforma) para o vendedor. Isso não pode ser desfeito.`
            : ''
        }
        footer={
          <div className={styles.rodape}>
            <Button variant="ghost" onClick={() => setConfirmando(null)}>
              Ainda não
            </Button>
            <Button iconLeft="check" onClick={confirmar} data-autofocus>
              Sim, recebi
            </Button>
          </div>
        }
      />

      <Modal
        open={Boolean(disputando)}
        onClose={() => setDisputando(null)}
        title="Conte o que aconteceu"
        description="O valor continua retido enquanto a equipe AgroPeças analisa. Podemos devolver seu dinheiro ou liberar ao vendedor, conforme o caso."
        footer={
          <div className={styles.rodape}>
            <Button variant="ghost" onClick={() => setDisputando(null)}>
              Voltar
            </Button>
            <Button onClick={disputar} disabled={relato.trim().length < 8}>
              Enviar relato
            </Button>
          </div>
        }
      >
        <Field label="O que houve com a peça ou a entrega?" htmlFor="relato-disputa" hint="Mínimo de 8 caracteres.">
          <Input
            as="textarea"
            id="relato-disputa"
            rows={4}
            value={relato}
            onChange={(evento) => setRelato(evento.target.value)}
            placeholder="Ex.: a peça chegou com a carcaça trincada"
            data-autofocus
          />
        </Field>
      </Modal>
    </div>
  );
}
