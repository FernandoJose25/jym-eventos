import type { Metadata } from 'next';
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';
import { Toaster }      from 'sonner';
import { AuthProvider } from '@/hooks/useAuth';
import { ModalProvider } from '@/components/ui/Modal';
import './globals.css';

const playfair = Playfair_Display({ subsets:['latin'], variable:'--font-playfair', display:'swap' });
const jakarta  = Plus_Jakarta_Sans({ subsets:['latin'], variable:'--font-jakarta', display:'swap', weight:['400','500','600','700'] });

export const metadata: Metadata = {
  title: { default:'Panel Admin | J&M Decoraciones y Eventos', template:'%s | J&M Admin' },
  robots: 'noindex,nofollow',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${playfair.variable} ${jakarta.variable}`}>
      <body>
        <AuthProvider>
          <ModalProvider>
            {children}
            <Toaster richColors position="top-right" />
          </ModalProvider>
        </AuthProvider>
      </body>
    </html>
  );
}