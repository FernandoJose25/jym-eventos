import type { Metadata } from 'next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ContactoClient from './ContactoClient';

const DEFAULT_TITLE = 'Contacto y Cotizaciones | J&M Eventos';
const DEFAULT_DESC  = 'Cotiza tu evento en Sechura, Piura. Respuesta rápida por WhatsApp. Shows, decoración, catering, quinceaños y paquetes completos.';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const snap = await getDoc(doc(db, 'site_config', 'seo'));
    const data = snap.exists() ? snap.data() : {};
    return {
      title: data.contactoTitle || DEFAULT_TITLE,
      description: data.contactoDesc || DEFAULT_DESC,
    };
  } catch {
    return { title: DEFAULT_TITLE, description: DEFAULT_DESC };
  }
}

export default function Page() {
  return <ContactoClient />;
}
