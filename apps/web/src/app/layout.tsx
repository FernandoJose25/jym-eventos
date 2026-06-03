import type { Metadata } from 'next';
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';
import Navbar          from '@/components/layout/Navbar';
import Footer          from '@/components/layout/Footer';
import MotionProvider  from '@/components/ui/MotionProvider';
import CookieBanner    from '@/components/ui/CookieBanner';
import WhatsAppWidget  from '@/components/ui/WhatsAppWidget';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import '../styles/animations.css';

const playfair = Playfair_Display({
  subsets:  ['latin'], variable: '--font-playfair', display: 'swap',
});
const jakarta = Plus_Jakarta_Sans({
  subsets:  ['latin'], variable: '--font-jakarta', display: 'swap',
  weight:   ['400','500','600','700'],
});

export const metadata: Metadata = {
  title: {
    default:  'J&M Eventos y Decoraciones — Sechura, Piura',
    template: '%s | J&M Eventos',
  },
  description: 'Organizamos eventos únicos en Sechura, Piura. Shows infantiles, hora loca, decoración temática, catering y fotografía profesional.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${playfair.variable} ${jakarta.variable}`}>
      <head>
        {/* Preconnect para fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
      </head>
      <body>
        <MotionProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
          <CookieBanner />
          <Analytics />
          <WhatsAppWidget />
        </MotionProvider>
      </body>
    </html>
  );
}
