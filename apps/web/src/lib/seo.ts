import { unstable_cache } from 'next/cache';
import { adminDb } from '@/lib/firebase-admin';

/**
 * Utilidades de SEO compartidas por layout y páginas.
 *
 * NOTA DE PRIVACIDAD (decisión del dueño, 2026-07-21): la dirección del
 * negocio en schemas y metadata se publica SOLO a nivel ciudad/región
 * (Sechura, Piura) — nunca calle, número ni coordenadas GPS. No "completar"
 * la dirección aunque un auditor SEO lo marque como recomendado.
 */

/** Dirección aproximada del negocio para schemas LocalBusiness. */
export const BUSINESS_ADDRESS = {
  '@type': 'PostalAddress',
  addressLocality: 'Sechura',
  addressRegion: 'Piura',
  addressCountry: 'PE',
} as const;

/**
 * Trunca una descripción a ~150 caracteres en límite de palabra: Google corta
 * las meta descriptions más largas con "..." en los resultados (~920px), lo
 * que suele amputar el call-to-action final.
 */
export function metaDescription(text: string | undefined | null, fallback: string): string {
  const s = (text || fallback).trim();
  if (s.length <= 150) return s;
  const cut = s.slice(0, 150);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 100 ? lastSpace : 150).replace(/[,;:.]$/, '')}…`;
}

/**
 * Logo del navbar (site_config/navbar) cacheado 1 hora — se usa como favicon
 * y como imagen Open Graph de respaldo cuando la página no tiene una propia.
 */
export const getOgLogo = unstable_cache(
  async (): Promise<string | null> => {
    try {
      const snap = await adminDb.collection('site_config').doc('navbar').get();
      return snap.exists ? (snap.data()?.logo || null) : null;
    } catch {
      return null;
    }
  },
  ['navbar-logo'],
  { revalidate: 3600 },
);

/**
 * Open Graph completo para una página. Next NO fusiona el objeto openGraph
 * de una página con el del layout (lo reemplaza entero), así que cada página
 * que defina el suyo debe pasar por aquí para no perder siteName/locale/type
 * y para que og:url siempre coincida con su canonical.
 */
export function pageOpenGraph(opts: {
  title: string;
  description: string;
  url: string;
  images?: { url: string }[];
}) {
  return {
    title: opts.title,
    description: opts.description,
    url: opts.url,
    siteName: 'J&M Decoraciones y Eventos',
    locale: 'es_PE',
    type: 'website' as const,
    images: opts.images,
  };
}
