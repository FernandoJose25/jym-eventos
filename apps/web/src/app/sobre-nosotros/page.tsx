import type { Metadata } from 'next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import SobreNosotrosClient from './SobreNosotrosClient';

const DEFAULT_TITLE = 'Nuestra Historia | J&M Eventos y Decoraciones';
const DEFAULT_DESC  = 'Más de 10 años creando experiencias inolvidables en Sechura, Piura. Conoce nuestra trayectoria, valores y equipo.';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const snap = await getDoc(doc(db, 'site_config', 'seo'));
    const data = snap.exists() ? snap.data() : {};
    return {
      title: data.nosotrosTitle || DEFAULT_TITLE,
      description: data.nosotrosDesc || DEFAULT_DESC,
    };
  } catch {
    return { title: DEFAULT_TITLE, description: DEFAULT_DESC };
  }
}

export default function Page() {
  return <SobreNosotrosClient />;
}
