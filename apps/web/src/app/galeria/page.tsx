import type { Metadata } from 'next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import GaleriaClient from './GaleriaClient';

const DEFAULT_TITLE = 'Galería de Eventos | J&M Eventos y Decoraciones';
const DEFAULT_DESC  = 'Fotos y videos reales de shows infantiles, decoración temática, quinceaños y eventos corporativos realizados en Sechura, Piura.';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const snap = await getDoc(doc(db, 'site_config', 'seo'));
    const data = snap.exists() ? snap.data() : {};
    return {
      title: data.galeriaTitle || DEFAULT_TITLE,
      description: data.galeriaDesc || DEFAULT_DESC,
    };
  } catch {
    return { title: DEFAULT_TITLE, description: DEFAULT_DESC };
  }
}

export default function Page() {
  return <GaleriaClient />;
}
