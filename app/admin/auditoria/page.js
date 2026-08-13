'use client';

/**
 * Administração → Auditoria.
 *
 * O registro de tudo que a administração fez — com quem fez, o que fez, sobre
 * quem, **por quê** e de onde.
 *
 * O motivo é a coluna que justifica a tela existir. "Aline suspendeu Marcos"
 * não responde nada; "Aline suspendeu Marcos — anúncios repetidos com preço
 * divergente" permite a outra pessoa conferir, discordar ou restaurar sem
 * refazer a investigação. Na API real, `motivo` só existe quando quem agiu
 * registrou um — a maioria das ações de rotina (login, criar) não tem, e a
 * tela mostra "—" em vez de inventar um texto.
 *
 * ⚠️ Diferenças reais em relação ao mock — ver JSDoc de
 * `lib/dados/admin-auditoria.js`: sem IP em claro, sem nome de alvo já
 * resolvido, categoria e busca operam sobre a página carregada (a API não
 * tem contagem agregada por categoria nem busca por texto livre).
 */

import { useEffect, useState } from 'react';
import PainelSegmentos from '@/components/PainelSegmentos/PainelSegmentos';
import AdminEtiqueta from '@/components/AdminEtiqueta/AdminEtiqueta';
import Input from '@/components/Input/Input';
import Button from '@/components/Button/Button';
import Icon from '@/components/Icon/Icon';
import Esqueleto from '@/components/Esqueleto/Esqueleto';
import { useAviso } from '@/components/Aviso/AvisoProvider';
import { listarAuditoria, TIPOS_REGISTRO, TOM_DA_CATEGORIA } from '@/lib/dados/admin-auditoria';
import styles from './page.module.css';

export default function AdminAuditoriaPage() {
  const aviso = useAviso();

  /* `null` = carregando */
  const [registros, setRegistros] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const [tipo, setTipo] = useState('todos');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    const controlador = new AbortController();

    setRegistros(null);
    listarAuditoria({ pagina, porPagina: 50, sinal: controlador.signal })
      .then((resultado) => {
        setRegistros(resultado.itens);
        setTotalPaginas(resultado.totalPaginas);
      })
      .catch((erro) => {
        if (erro.name !== 'AbortError') {
          setRegistros([]);
          aviso.erro('Não foi possível carregar a auditoria.');
        }
      });

    return () => controlador.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina]);

  const listaBase = registros || [];
  const termo = busca.trim().toLowerCase();

  const lista = listaBase
    .filter((registro) => (tipo === 'todos' ? true : registro.tipo === tipo))
    .filter((registro) =>
      termo
        ? registro.alvo.toLowerCase().includes(termo) ||
          registro.acao.toLowerCase().includes(termo) ||
          registro.quem.toLowerCase().includes(termo)
        : true
    );

  /* contagem por categoria é só da página carregada — ver JSDoc do adapter */
  const contagens = TIPOS_REGISTRO.reduce(
    (acc, item) => ({
      ...acc,
      [item.id]:
        item.id === 'todos'
          ? listaBase.length
          : listaBase.filter((registro) => registro.tipo === item.id).length,
    }),
    {}
  );

  return (
    <>
      <header className={styles.topo}>
        <div>
          <h1 className={styles.titulo}>Auditoria</h1>
          <p className={styles.descricao}>
            Tudo que a administração fez fica registrado — inclusive o que só
            foi lido.
          </p>
        </div>

        <Button
          variant="outline"
          iconLeft="arrow-right"
          onClick={() => aviso.info('Exportação disponível em Auditoria → Exportar (motivo obrigatório).')}
        >
          Exportar
        </Button>
      </header>

      <div className={styles.filtros}>
        <PainelSegmentos
          opcoes={TIPOS_REGISTRO}
          valor={tipo}
          onMudar={setTipo}
          contagens={contagens}
          rotulo="Tipo de registro"
        />

        <div className={styles.campoBusca}>
          <Input
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Pessoa, ação ou alvo"
            iconLeft="search"
            aria-label="Buscar na auditoria"
          />
        </div>
      </div>

      {tipo === 'acesso' ? (
        <p className={styles.explicacao}>
          <Icon name="eye-off" size={15} />
          Leitura de conversa, exportação de cadastro e abertura de documento.
          Registrar isso é exigência da LGPD — e é o que permite responder “quem
          viu meus dados?” com uma lista, não com uma promessa.
        </p>
      ) : null}

      <div className={styles.quadro}>
        <div className={styles.cabecalho}>
          <span>Quando</span>
          <span>Quem</span>
          <span>O que fez</span>
          <span>Motivo</span>
          <span>Origem</span>
        </div>

        {registros === null ? (
          <div className={styles.carregando}>
            <Esqueleto altura={44} repetir={6} />
          </div>
        ) : lista.length ? (
          <ul className={styles.lista}>
            {lista.map((registro) => {
              const marca = TOM_DA_CATEGORIA[registro.tipo];

              return (
                <li key={registro.id} className={styles.linha}>
                  <span className={styles.quando}>{registro.quando}</span>

                  <span className={styles.quem}>
                    <span className={styles.avatar}>
                      {registro.quem === 'Sistema' ? (
                        <Icon name="gear" size={12} />
                      ) : (
                        registro.quem.slice(0, 2).toUpperCase()
                      )}
                    </span>
                    {registro.quem}
                  </span>

                  <span className={styles.acao}>
                    <AdminEtiqueta tom={marca.tom}>{marca.rotulo}</AdminEtiqueta>

                    <span className={styles.acaoTexto}>
                      {registro.acao} <strong>{registro.alvo}</strong>
                    </span>
                  </span>

                  {/* a coluna que justifica a tela existir */}
                  <span className={styles.motivo}>{registro.motivo}</span>

                  <span className={styles.ip}>{registro.origem}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.vazio}>Nenhum registro com esses filtros.</p>
        )}
      </div>

      {registros !== null && totalPaginas > 1 ? (
        <div className={styles.paginacao}>
          <Button
            variant="outline"
            size="sm"
            disabled={pagina <= 1}
            onClick={() => setPagina((atual) => Math.max(1, atual - 1))}
          >
            Anterior
          </Button>
          <span className={styles.paginaAtual}>
            Página {pagina} de {totalPaginas}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagina >= totalPaginas}
            onClick={() => setPagina((atual) => Math.min(totalPaginas, atual + 1))}
          >
            Próxima
          </Button>
        </div>
      ) : null}

      <p className={styles.nota}>
        Registros não podem ser apagados nem editados, nem pela administração.
        Um histórico que pode ser alterado por quem ele fiscaliza não serve de
        prova nenhuma.
      </p>
    </>
  );
}
