import type { Metadata } from 'next';
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';
import Navbar          from '@/components/layout/Navbar';
import Footer          from '@/components/layout/Footer';
import MotionProvider  from '@/components/ui/MotionProvider';
import CookieBanner    from '@/components/ui/CookieBanner';
import WhatsAppWidget  from '@/components/ui/WhatsAppWidget';
import JsonLd          from '@/components/ui/JsonLd';
import { Analytics } from '@vercel/analytics/next';
import { db } from '@/lib/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { SITE_URL } from '@/lib/site';
import './globals.css';
import '../styles/animations.css';

const playfair = Playfair_Display({
  subsets:  ['latin'], variable: '--font-playfair', display: 'swap',
});
const jakarta = Plus_Jakarta_Sans({
  subsets:  ['latin'], variable: '--font-jakarta', display: 'swap',
  weight:   ['400','500','600','700'],
});

// Se llama desde generateMetadata() y desde el layout — Firestore la resuelve una sola vez por request
async function getNavbarLogo(): Promise<string | undefined> {
  try {
    const snap = await getDoc(doc(db, 'site_config', 'navbar'));
    if (snap.exists()) return snap.data().logo || undefined;
  } catch {}
  return undefined;
}

export async function generateMetadata(): Promise<Metadata> {
  const iconUrl = await getNavbarLogo();

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default:  'J&M Eventos y Decoraciones — Sechura, Piura',
      template: '%s | J&M Eventos',
    },
    description: 'Organizamos eventos únicos en Sechura, Piura. Shows infantiles, hora loca, decoración temática, catering y fotografía profesional.',
    alternates: { canonical: SITE_URL },
    ...(iconUrl && { icons: { icon: iconUrl, apple: iconUrl } }),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const logoUrl = await getNavbarLogo();

  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'EventPlanner',
    name: 'J&M Eventos y Decoraciones',
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
      <head>
        {/* Preconnect para fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <JsonLd data={localBusinessSchema} />
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
