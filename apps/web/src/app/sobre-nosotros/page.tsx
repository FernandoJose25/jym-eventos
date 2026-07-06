import type { Metadata } from 'next';

import { adminDb } from '@/lib/firebase-admin';
import { SITE_URL } from '@/lib/site';
import SobreNosotrosClient from './SobreNosotrosClient';

export const dynamic = 'force-dynamic';

const DEFAULT_TITLE = 'Nuestra Historia | J&M Eventos y Decoraciones';
const DEFAULT_DESC = 'Más de 10 años creando experiencias inolvidables en Sechura, Piura. Conoce nuestra trayectoria, valores y equipo.';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const snap = await adminDb.collection('site_config').doc('seo').get();
    const data = snap.exists ? snap.data() ?? {} : {};
    return {
      title: data.nosotrosTitle || DEFAULT_TITLE,
      description: data.nosotrosDesc || DEFAULT_DESC,
      alternates: { canonical: `${SITE_URL}/sobre-nosotros` },
    };
  } catch {
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESC,
      alternates: { canonical: `${SITE_URL}/sobre-nosotros` },
    };
  }
}

export default function Page() {
  return <SobreNosotrosClient />;
}