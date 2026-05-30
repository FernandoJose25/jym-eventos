import type { Metadata } from 'next';
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';
import Navbar        from '@/components/layout/Navbar';
import Footer        from '@/components/layout/Footer';
import MotionProvider from '@/components/ui/MotionProvider';
import CookieBanner  from '@/components/ui/CookieBanner';
import Script        from 'next/script';
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
          <Script id="whatsbox" strategy="afterInteractive">{`
(function (w, d, s, bu, cv) {
  w.wbwacw = {
    base_url: bu,
    cache_variant: cv,
    config: {
      brand: {
        phone_number: "51945203708",
        primary_color: "#085E54",
        logo_url: "https://res.cloudinary.com/dvcmazqtp/image/upload/v1780101985/logos/feuzcxtlvcwov5fefinu.webp"
      },
      button: {
        background_color: "#1c9247",
        icon: "white",
        icon_size: 24,
        padding: 8,
        position: "bottom-right",
        margin: { bottom: 15, right: 16, left: 0 }
      },
      prompt: {
        text: "👋 Hola, resuelve la duda que tengas",
        delay: 5
      },
      popup: {
        title: "J&M Eventos y Decoraciones ",
        subtitle: "Usualmente responde en  1  hora",
        welcome_text: "👋 Hola, ¿en qué podemos ayudarte?",
        customer_text_default: "Hola, quiero cotizar un evento"
      }
    }
  };
  const h = d.getElementsByTagName(s)[0], j = d.createElement(s);
  j.async = true;
  j.src = bu + '/init.js?cv=' + cv;
  h.parentNode.insertBefore(j, h);
})(window, document, 'script', 'https://wacw.whatsbox.io', '1780102875398');
          `}</Script>
        </MotionProvider>
      </body>
    </html>
  );
}
