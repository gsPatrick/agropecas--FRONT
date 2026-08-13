'use client';

/**
 * AppHeader — barra das telas de sistema (anúncios, busca, perfil, painel).
 *
 * Diferente do Header da landing: aqui não se vende, se navega. Barra fixa,
 * baixa, com busca sempre à mão — em tela de catálogo, buscar é a ação mais
 * repetida, e obrigar a voltar para a home para procurar de novo é atrito.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BrandMark from '@/components/BrandMark/BrandMark';
import Button from '@/components/Button/Button';
import Icon from '@/components/Icon/Icon';
import { useChat } from '@/components/ChatProvider/ChatProvider';
import { useSessao, rotaDaConta } from '@/lib/sessao';
import styles from './AppHeader.module.css';

const LINKS = [
  { label: 'Anúncios', href: '/anuncios' },
  { label: 'Buscar', href: '/busca' },
  { label: 'Como funciona', href: '/#como-funciona' },
];

export default function AppHeader({ showSearch = true }) {
  const router = useRouter();
  const { naoLidas } = useChat();
  const { autenticado, usuario, tipoPerfil, sair } = useSessao();
  /* quem só compra não tem o que anunciar — o CTA muda de convite a vender
     para atalho até a própria conta, no mesmo lugar em que o vendedor vê
     "Anunciar" */
  const ehCliente = tipoPerfil === 'cliente';
  const rotaConta = rotaDaConta(tipoPerfil);
  const [termo, setTermo] = useState('');
  const [aberto, setAberto] = useState(false);

  function buscar(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (termo.trim()) params.set('q', termo.trim());
    router.push(`/busca${params.toString() ? `?${params}` : ''}`);
    setAberto(false);
  }

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} aria-label="AgroPeças MT — início">
          <BrandMark size="sm" />
        </Link>

        {showSearch ? (
          <form className={styles.search} onSubmit={buscar} role="search">
            <Icon name="search" size={17} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              type="search"
              value={termo}
              placeholder="Buscar peça, serviço ou máquina"
              onChange={(event) => setTermo(event.target.value)}
              aria-label="Buscar na plataforma"
            />
          </form>
        ) : null}

        <nav className={styles.nav} aria-label="Navegação">
          {LINKS.map((link) => (
            <Link key={link.label} href={link.href} className={styles.link}>
              {link.label}
            </Link>
          ))}
        </nav>

        {/* logado: mensagens, perfil e "Anunciar" — visitante não tem o que
            anunciar nem conversas, então vê o convite para entrar */}
        <div className={styles.actions}>
          {autenticado ? (
            <>
              <Link href="/mensagens" className={styles.mensagens} aria-label="Mensagens">
                <Icon name="mail" size={19} />
                {naoLidas > 0 ? (
                  <span className={styles.badge}>{naoLidas > 9 ? '9+' : naoLidas}</span>
                ) : null}
              </Link>

              <Link href={rotaConta} className={styles.conta} title={usuario.nome}>
                <span className={styles.avatar}>{usuario.iniciais}</span>
              </Link>

              <Button
                as={Link}
                href={rotaConta}
                variant="primary"
                size="sm"
                iconLeft={ehCliente ? 'user' : 'check'}
              >
                {ehCliente ? 'Minha conta' : 'Anunciar'}
              </Button>

              <button type="button" className={styles.sair} onClick={sair}>
                Sair
              </button>
            </>
          ) : (
            <>
              <Button as={Link} href="/entrar" variant="ghost" size="sm">
                Entrar
              </Button>
              <Button as={Link} href="/entrar" variant="primary" size="sm">
                Cadastrar
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          className={styles.burger}
          aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={aberto}
          onClick={() => setAberto((valor) => !valor)}
        >
          <Icon name={aberto ? 'close' : 'grid'} size={20} />
        </button>
      </div>

      {aberto ? (
        <div className={styles.drawer}>
          <form className={styles.drawerSearch} onSubmit={buscar} role="search">
            <Icon name="search" size={17} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              type="search"
              value={termo}
              placeholder="Buscar peça ou serviço"
              onChange={(event) => setTermo(event.target.value)}
              aria-label="Buscar na plataforma"
            />
          </form>

          {LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={styles.drawerLink}
              onClick={() => setAberto(false)}
            >
              {link.label}
              <Icon name="chevron-right" size={16} />
            </Link>
          ))}

          <div className={styles.drawerActions}>
            {autenticado ? (
              <>
                <Button
                  as={Link}
                  href="/mensagens"
                  variant="outline"
                  fullWidth
                  iconLeft="mail"
                  onClick={() => setAberto(false)}
                >
                  Mensagens{naoLidas > 0 ? ` (${naoLidas})` : ''}
                </Button>
                <Button
                  as={Link}
                  href={rotaConta}
                  fullWidth
                  iconLeft={ehCliente ? 'user' : 'check'}
                  onClick={() => setAberto(false)}
                >
                  {ehCliente ? 'Minha conta' : 'Anunciar'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  as={Link}
                  href="/entrar"
                  variant="outline"
                  fullWidth
                  onClick={() => setAberto(false)}
                >
                  Entrar
                </Button>
                <Button as={Link} href="/entrar" fullWidth onClick={() => setAberto(false)}>
                  Cadastrar
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
