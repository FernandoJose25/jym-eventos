import type { Metadata } from 'next';
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import MotionProvider from '@/components/ui/MotionProvider';
import CookieBanner from '@/components/ui/CookieBanner';
import WhatsAppWidget from '@/components/ui/WhatsAppWidget';
import JsonLd from '@/components/ui/JsonLd';
import { Analytics } from '@vercel/analytics/next';
import { adminDb } from '@/lib/firebase-admin';
import { unstable_cache } from 'next/cache';
import { SITE_URL } from '@/lib/site';
import './globals.css';
import '../styles/animations.css';

const playfair = Playfair_Display({
  subsets: ['latin'], variable: '--font-playfair', display: 'swap',
});
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'], variable: '--font-jakarta', display: 'swap',
  weight: ['400', '500', '600', '700'],
});

async function fetchNavbarLogo(): Promise<string | undefined> {
  const snap = await adminDb.collection('site_config').doc('navbar').get();
  return snap.exists ? (snap.data()?.logo || undefined) : undefined;
}

// Se cachea 1 hora: si Firestore falla momentáneamente en una request puntual,
// se sigue sirviendo el último logo bueno en vez de quedarse sin ícono (el "mundo" del navegador).
const getNavbarLogo = unstable_cache(
  async () => {
    try { return (await fetchNavbarLogo()) ?? null; } catch { return null; }
  },
  ['navbar-logo'],
  { revalidate: 3600 }
);

const DEFAULT_TITLE = 'J&M Decoraciones y Eventos — Sechura, Piura';
const DEFAULT_DESCRIPTION = 'Organizamos eventos únicos en Sechura, Piura. Shows infantiles, hora loca, decoración temática, catering y fotografía profesional.';

export async function generateMetadata(): Promise<Metadata> {
  const iconUrl = await getNavbarLogo();

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
    alternates: { canonical: SITE_URL },
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
  const logoUrl = await getNavbarLogo();

  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'EventPlanner'],
    name: 'J&M Decoraciones y Eventos',
    ...(logoUrl && { image: logoUrl, logo: logoUrl }),
    url: SITE_URL,
    telephone: '+51945203708',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Sechura',
      addressRegion: 'Piura',
      addressCountry: 'PE',
    },
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
        </MotionProvider>
      </body>
    </html>
  );
}
