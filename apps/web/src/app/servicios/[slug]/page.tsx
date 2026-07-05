import type { Metadata } from 'next';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ServicioClient, { SERVICIOS_DATA } from './ServicioClient';

async function findServicio(slug: string) {
  const snap = await getDocs(query(collection(db, 'services'), where('visible', '==', true)));
  const match = snap.docs.find(d => {
    const link = d.data().link || '';
    const docSlug = link.replace('servicios/', '').replace('.html', '');
    return docSlug === slug || d.id === slug;
  });
  return match ? match.data() : null;
}

export async function generateStaticParams() {
  // Genera las páginas estáticas a partir de los servicios reales en Firestore
  try {
    const snap = await getDocs(collection(db, 'services'));
    const slugs = snap.docs.map(d => {
      const link = d.data().link || '';
      return link.replace('servicios/', '').replace('.html', '') || d.id;
    });
    return slugs.map((slug) => ({ slug }));
  } catch {
    // Respaldo si Firestore no responde en build time
    return Object.keys(SERVICIOS_DATA).map((slug) => ({ slug }));
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;

  // Fuente de verdad real: Firestore (lo mismo que usa la página para el contenido visible)
  let data: any = null;
  try {
    data = await findServicio(slug);
  } catch {}

  // Respaldo legado por si el servicio todavía no está en Firestore
  if (!data) data = SERVICIOS_DATA[slug];

  if (!data) {
    return {
      title: 'Servicio no encontrado',
      description: 'El servicio que buscas no está disponible.',
    };
  }

  const title = data.title;
  const desc  = data.desc || data.detail?.hero_desc || data.hero
    || `${title} para tu evento en Sechura, Piura. Cotiza gratis con J&M Eventos.`;
  const img   = (data.mediaType === 'image' && data.mediaSrc) ? data.mediaSrc
    : (data.heroMediaType === 'image' && data.heroMediaSrc) ? data.heroMediaSrc
    : data.img;

  return {
    title: `${title} en Sechura, Piura`,
    description: desc,
    openGraph: {
      title: `${title} | J&M Eventos`,
      description: desc,
      images: img ? [{ url: img }] : undefined,
    },
  };
}

export default function Page() {
  return <ServicioClient />;
}
