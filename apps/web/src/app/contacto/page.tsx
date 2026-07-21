import type { Metadata } from 'next';

import { adminDb } from '@/lib/firebase-admin';
import { SITE_URL } from '@/lib/site';
import { metaDescription, getOgLogo, pageOpenGraph } from '@/lib/seo';
import ContactoClient from './ContactoClient';

export const dynamic = 'force-dynamic';

const DEFAULT_TITLE = 'Contacto y Cotizaciones';
const DEFAULT_DESC = 'Cotiza tu evento en Sechura, Piura. Respuesta rápida por WhatsApp. Shows, decoración, catering, quinceaños y paquetes completos.';

export async function generateMetadata(): Promise<Metadata> {
  const canonical = `${SITE_URL}/contacto`;
  try {
    const snap = await adminDb.collection('site_config').doc('seo').get();
    const data = snap.exists ? snap.data() ?? {} : {};
    const title = data.contactoTitle || DEFAULT_TITLE;
    const description = metaDescription(data.contactoDesc, DEFAULT_DESC);
    const logo = await getOgLogo();
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: pageOpenGraph({
        title, description, url: canonical,
        images: logo ? [{ url: logo }] : undefined,
      }),
    };
  } catch {
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESC,
      alternates: { canonical },
    };
  }
}

function toPlain(d: Record<string, any>): Record<string, any> {
  const r: Record<string, any> = {};
  for (const [k, v] of Object.entries(d)) {
    if (!v || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') r[k] = v;
    else if (v?.toDate) r[k] = v.toDate().toISOString();
    else if (typeof v === 'object' && 'seconds' in v) r[k] = new Date(v.seconds * 1000).toISOString();
    else if (typeof v === 'object') r[k] = toPlain(v);
  }
  return r;
}

export default async function Page() {
  let initialContacto: Record<string, any> = {};
  try {
    const snap = await adminDb.collection('site_config').doc('contacto').get();
    if (snap.exists) initialContacto = toPlain(snap.data() ?? {});
  } catch {
    // sin datos: ContactoClient usa sus valores por defecto
  }
  return <ContactoClient initialContacto={initialContacto} />;
}