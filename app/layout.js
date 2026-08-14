import { Sora, Inter } from 'next/font/google';
import AvisoProvider from '@/components/Aviso/AvisoProvider';
import ChatProvider from '@/components/ChatProvider/ChatProvider';
import ChatWidget from '@/components/ChatWidget/ChatWidget';
import ComunicadoModal from '@/components/ComunicadoModal/ComunicadoModal';
import './globals.css';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-sora',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  title: 'AgroPeças MT — O campo não pode parar.',
  description: 'Sua máquina parou? Encontre a peça ou o serviço que precisa.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${sora.variable} ${inter.variable}`}>
      <body>
        {/* o chat vive acima das páginas: o balão acompanha o usuário e o
            contador não zera ao navegar */}
        {/* os avisos ficam acima de tudo: qualquer tela pode dar retorno de
            ação sem montar a própria estrutura */}
        <AvisoProvider>
          <ChatProvider>
            {children}
            <ChatWidget />
            <ComunicadoModal />
          </ChatProvider>
        </AvisoProvider>
      </body>
    </html>
  );
}
