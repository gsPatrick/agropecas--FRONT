import AdminShell from '@/components/AdminShell/AdminShell';

export const metadata = {
  title: 'Administração — AgroPeças MT',
  /* fora dos buscadores: painel administrativo indexado é convite a ataque */
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
