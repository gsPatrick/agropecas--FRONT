'use client';

/**
 * Editar anúncio.
 *
 * Mesmo formulário da criação, com os valores carregados. O que muda é o
 * cabeçalho e o texto dos botões — e isso vive dentro do próprio componente,
 * para as duas telas não divergirem quando um campo novo aparecer.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import PainelTopo from '@/components/PainelTopo/PainelTopo';
import AnuncioForm from '@/components/AnuncioForm/AnuncioForm';
import Icon from '@/components/Icon/Icon';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import { useSessao } from '@/lib/sessao';
import { obterAnuncioDono, ROTULO_STATUS } from '@/lib/dados/meus-anuncios';
import styles from './page.module.css';

export default function EditarAnuncioPage() {
  const { perfil, usuario } = useSessao();
  const { id } = useParams();
  const aviso = useAviso();

  const [anuncio, setAnuncio] = useState(undefined);

  useEffect(() => {
    if (!usuario) return undefined;

    let cancelado = false;

    obterAnuncioDono(id)
      .then((atual) => {
        if (!cancelado) setAnuncio(atual);
      })
      .catch((erro) => {
        if (cancelado) return;
        setAnuncio(null);
        aviso.erro(erro.message);
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id, id]);

  if (!usuario || anuncio === undefined) return null;

  /* anúncio que não existe não é erro do sistema: é link velho, favorito
     antigo ou anúncio já removido. Explica e oferece a saída */
  if (!anuncio) {
    return (
      <>
        <PainelTopo perfil={perfil} titulo="Anúncio não encontrado" />

        <div className={styles.ausente}>
          <Icon name="search" size={28} />
          <p>Este anúncio não existe mais ou nunca existiu.</p>
          <Link href="/painel/anuncios" className={styles.voltar}>
            Ver meus anúncios
          </Link>
        </div>
      </>
    );
  }

  const valores = {
    titulo: anuncio.titulo,
    descricao: anuncio.descricao,
    categoriaId: anuncio.categoriaId,
    marcaId: anuncio.marcaId,
    condicao: anuncio.condicao,
    negociacao: anuncio.negociacao,
    preco: anuncio.preco?.startsWith('R$') ? anuncio.preco.replace('R$ ', '') : '',
    aCombinar: anuncio.preco === 'A combinar',
    quantidade: anuncio.quantidade,
    atendeNoLocal: anuncio.atendeNoLocal,
  };

  const localizacaoInicial = anuncio.localizacao?.municipio
    ? { origem: 'texto', municipio: anuncio.localizacao.municipio, uf: anuncio.localizacao.uf }
    : { origem: null, exibirExato: false };

  return (
    <>
      <PainelTopo
        perfil={perfil}
        titulo="Editar anúncio"
        descricao={`${ROTULO_STATUS[anuncio.status]} · ${anuncio.vistas} visualizações · ${anuncio.contatos} contatos`}
      />

      <AnuncioForm
        modo="edicao"
        anuncioId={anuncio.id}
        tipoInicial={anuncio.tipo}
        valoresIniciais={valores}
        localizacaoInicial={localizacaoInicial}
        fotosIniciais={anuncio.fotosItens}
      />
    </>
  );
}
