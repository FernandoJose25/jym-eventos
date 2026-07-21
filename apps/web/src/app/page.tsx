import type { Metadata } from 'next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getHomeData } from '@/lib/homeData';
import { SITE_URL } from '@/lib/site';
import { metaDescription } from '@/lib/seo';
import HomeClient from './HomeClient';

// Evita que Next.js "congele" la Home en el momento del build.
// Así, los cambios hechos en el panel admin (Firestore) se ven
// de inmediato en cada visita, sin esperar un nuevo despliegue.
export const dynamic = 'force-dynamic';

const DEFAULT_TITLE = 'J&M Decoraciones y Eventos — Eventos de Lujo en Sechura, Piura';
const DEFAULT_DESC = 'Decoración, ambientación y producción integral de eventos en Sechura, Piura. Bodas, quinceaños y fiestas temáticas. Cotiza tu evento hoy.';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const snap = await getDoc(doc(db, 'site_config', 'seo'));
    const data = snap.exists() ? snap.data() : {};
    return {
      title: data.homeTitle || DEFAULT_TITLE,
      description: metaDescription(data.homeDesc, DEFAULT_DESC),
      alternates: { canonical: SITE_URL },
    };
  } catch {
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESC,
      alternates: { canonical: SITE_URL },
    };
  }
}

export default async function HomePage() {
  const data = await getHomeData();
  return <HomeClient data={data} />;
}