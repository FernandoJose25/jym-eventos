import type { Metadata } from 'next';

import { adminDb } from '@/lib/firebase-admin';
import { SITE_URL } from '@/lib/site';
import GaleriaClient from './GaleriaClient';

export const dynamic = 'force-dynamic';

const DEFAULT_TITLE = 'Galería de Eventos | J&M Eventos y Decoraciones';
const DEFAULT_DESC = 'Fotos y videos reales de shows infantiles, decoración temática, quinceaños y eventos corporativos realizados en Sechura, Piura.';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const snap = await adminDb.collection('site_config').doc('seo').get();
    const data = snap.exists ? snap.data() ?? {} : {};
    return {
      title: data.galeriaTitle || DEFAULT_TITLE,
      description: data.galeriaDesc || DEFAULT_DESC,
      alternates: { canonical: `${SITE_URL}/galeria` },
    };
  } catch {
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESC,
      alternates: { canonical: `${SITE_URL}/galeria` },
    };
  }
}

export default function Page() {
  return <GaleriaClient />;
}