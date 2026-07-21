import type { Metadata } from 'next';

import { adminDb } from '@/lib/firebase-admin';
import { SITE_URL } from '@/lib/site';
import { metaDescription, getOgLogo, pageOpenGraph } from '@/lib/seo';
import SobreNosotrosClient from './SobreNosotrosClient';

export const dynamic = 'force-dynamic';

const DEFAULT_TITLE = 'Nuestra Historia';
const DEFAULT_DESC = 'Más de 10 años creando experiencias inolvidables en Sechura, Piura. Conoce nuestra trayectoria, valores y equipo.';

export async function generateMetadata(): Promise<Metadata> {
  const canonical = `${SITE_URL}/sobre-nosotros`;
  try {
    const snap = await adminDb.collection('site_config').doc('seo').get();
    const data = snap.exists ? snap.data() ?? {} : {};
    const title = data.nosotrosTitle || DEFAULT_TITLE;
    const description = metaDescription(data.nosotrosDesc, DEFAULT_DESC);
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

export default async function Page() {
  let initialCfg: Record<string, any> = {};
  try {
    const snap = await adminDb.collection('site_config').doc('nosotros').get();
    if (snap.exists) initialCfg = snap.data() ?? {};
  } catch {
    // sin datos: SobreNosotrosClient usa sus valores por defecto
  }
  return <SobreNosotrosClient initialCfg={initialCfg} />;
}