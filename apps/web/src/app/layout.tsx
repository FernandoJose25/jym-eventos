import type { Metadata } from 'next';
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import MotionProvider from '@/components/ui/MotionProvider';
import CookieBanner from '@/components/ui/CookieBanner';
import WhatsAppWidget from '@/components/ui/WhatsAppWidget';
import BackToTop from '@/components/ui/BackToTop';
import JsonLd from '@/components/ui/JsonLd';
import { Analytics } from '@vercel/analytics/next';
import { GoogleAnalytics } from '@next/third-parties/google';
import { SITE_URL } from '@/lib/site';
import { getOgLogo, BUSINESS_ADDRESS } from '@/lib/seo';
import './globals.css';
import '../styles/animations.css';

const playfair = Playfair_Display({
  subsets: ['latin'], variable: '--font-playfair', display: 'swap',
});
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'], variable: '--font-jakarta', display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const DEFAULT_TITLE = 'J&M Decoraciones y Eventos — Eventos de Lujo en Sechura, Piura';
// Máx ~150 caracteres: Google trunca descripciones más largas en los resultados
const DEFAULT_DESCRIPTION = 'Decoración, ambientación y producción integral de eventos en Sechura, Piura. Bodas, quinceaños y fiestas temáticas. Cotiza tu evento hoy.';

export async function generateMetadata(): Promise<Metadata> {
  const iconUrl = await getOgLogo();

  // Open Graph por defecto: sin esto, páginas que no definen su propio
  // `openGraph` (home, galería, sobre-nosotros, contacto, etc.) no muestran
  // imagen ni texto propio al compartirse en WhatsApp, Facebook o Instagram.
  // TODO: reemplazar `iconUrl` por una imagen horizontal de 1200x630 dedicada
  // para OG (el logo es cuadrado y se recorta feo en la mayoría de tarjetas
  // de vista previa). Se puede subir a Cloudinary y guardar la URL en
  // site_config, igual que ya se hace con el logo del navbar.
  const defaultOgImage = iconUrl ? [{ url: iconUrl }] : undefined;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: DEFAULT_TITLE,
      template: '%s | J&M Decoraciones y Eventos',
    },
    description: DEFAULT_DESCRIPTION,
    // Sin canonical global: cada página define el suyo. Un canonical heredado
    // apuntando a la home hace que og:url y canonical se contradigan en las
    // páginas internas (lo detectó la auditoría SEO en 7 páginas).
    verification: {
      google: [
        'MRy0O_zkW6ZNsC_CnEB5krGekfmnAjcB3dKlhxeKwUA',
        'DNmC4C6F7ycqWjm16_zsDOxurIA87vTDvGJzuQYASqE',
      ],
      other: {
        'facebook-domain-verification': 'wwqpxmcd49tkr5j6takgz2hg9evk0v',
      },
    },
    openGraph: {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      url: SITE_URL,
      siteName: 'J&M Decoraciones y Eventos',
      locale: 'es_PE',
      type: 'website',
      images: defaultOgImage,
    },
    twitter: {
      card: 'summary_large_image',
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      images: defaultOgImage,
    },
    ...(iconUrl && { icons: { icon: iconUrl, apple: iconUrl } }),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const logoUrl = await getOgLogo();

  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'EventPlanner'],
    name: 'J&M Decoraciones y Eventos',
    ...(logoUrl && { image: logoUrl, logo: logoUrl }),
    url: SITE_URL,
    telephone: '+51945203708',
    // Solo ciudad/región a propósito — nunca publicar calle ni coordenadas (ver lib/seo.ts)
    address: BUSINESS_ADDRESS,
    areaServed: {
      '@type': 'City',
      name: 'Sechura, Piura, Perú',
    },
    priceRange: '$$',
    sameAs: [
      'https://www.instagram.com/jmdecoracionesyeventos1',
      'https://www.tiktok.com/@jmdecoraciones.18',
    ],
  };

  return (
    <html lang="es" className={`${playfair.variable} ${jakarta.variable}`}>
      <body>
        <JsonLd data={localBusinessSchema} />
        <MotionProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
          <CookieBanner />
          <Analytics />
          <WhatsAppWidget />
          <BackToTop />
        </MotionProvider>
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        )}
      </body>
    </html>
  );
}
