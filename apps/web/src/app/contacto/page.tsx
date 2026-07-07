import type { Metadata } from 'next';

import { adminDb } from '@/lib/firebase-admin';
import { SITE_URL } from '@/lib/site';
import ContactoClient from './ContactoClient';

export const dynamic = 'force-dynamic';

const DEFAULT_TITLE = 'Contacto y Cotizaciones';
const DEFAULT_DESC = 'Cotiza tu evento en Sechura, Piura. Respuesta rápida por WhatsApp. Shows, decoración, catering, quinceaños y paquetes completos.';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const snap = await adminDb.collection('site_config').doc('seo').get();
    const data = snap.exists ? snap.data() ?? {} : {};
    return {
      title: data.contactoTitle || DEFAULT_TITLE,
      description: data.contactoDesc || DEFAULT_DESC,
      alternates: { canonical: `${SITE_URL}/contacto` },
    };
  } catch {
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESC,
      alternates: { canonical: `${SITE_URL}/contacto` },
    };
  }
}

export default function Page() {
  return <ContactoClient />;
}