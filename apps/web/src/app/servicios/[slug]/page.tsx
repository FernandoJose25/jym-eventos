import type { Metadata } from 'next';
import { adminDb } from '@/lib/firebase-admin';
import { SITE_URL } from '@/lib/site';
import JsonLd from '@/components/ui/JsonLd';
import ServicioClient, { SERVICIOS_DATA } from './ServicioClient';

// ISR: cada servicio se sirve pre-generado y se revalida como máximo cada
// hora — sin esto, la página queda estática desde el último build y los
// cambios guardados en el admin (imagen hero, textos, etc.) nunca se
// reflejan en producción hasta el próximo deploy.
export const revalidate = 3600;
export const dynamicParams = true;

const FAQ_DEFAULT = [
  { pregunta: '¿Con cuánta anticipación debo reservar?', respuesta: 'Recomendamos al menos 15 días antes. En temporada alta (julio-diciembre) conviene reservar con 1-2 meses de anticipación para asegurar fecha y disponibilidad.' },
  { pregunta: '¿Puedo personalizar el paquete según mi presupuesto?', respuesta: 'Sí, armamos una propuesta a medida: puedes agregar o quitar elementos del paquete base según lo que necesites.' },
  { pregunta: '¿El precio incluye montaje y desmontaje?', respuesta: 'Sí, todo servicio incluye instalación previa y desmontaje al finalizar el evento, sin costo adicional.' },
  { pregunta: '¿Tienen cobertura fuera de Sechura?', respuesta: 'Sí, atendemos eventos en toda la región Piura. Consulta disponibilidad y costo de movilización según la zona.' },
];

async function findServicio(slug: string) {
  const snap = await adminDb.collection('services').where('visible', '==', true).get();
  const match = snap.docs.find(d => {
    const link = d.data().link || '';
    const docSlug = link.replace('servicios/', '').replace('.html', '');
    return docSlug === slug || d.id === slug;
  });
  return match ? { id: match.id, ...match.data() } : null;
}

export async function generateStaticParams() {
  // Genera las páginas estáticas a partir de los servicios reales en Firestore
  try {
    const snap = await adminDb.collection('services').get();
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
  const canonical = `${SITE_URL}/servicios/${slug}`;

  // Fuente de verdad real: Firestore (lo mismo que usa la página para el contenido visible)
  let data: any = null;
  try {
    data = await findServicio(slug);
  } catch { }

  // Respaldo legado por si el servicio todavía no está en Firestore
  if (!data) data = SERVICIOS_DATA[slug];

  if (!data) {
    return {
      title: 'Servicio no encontrado',
      description: 'El servicio que buscas no está disponible.',
      alternates: { canonical },
    };
  }

  const title = data.title;
  const desc = data.desc || data.detail?.hero_desc || data.hero
    || `${title} para tu evento en Sechura, Piura. Cotiza gratis con J&M Decoraciones y Eventos.`;
  const img = (data.mediaType === 'image' && data.mediaSrc) ? data.mediaSrc
    : (data.heroMediaType === 'image' && data.heroMediaSrc) ? data.heroMediaSrc
      : data.img;

  return {
    title: `${title} en Sechura, Piura`,
    description: desc,
    alternates: { canonical },
    openGraph: {
      title: `${title} | J&M Decoraciones y Eventos`,
      description: desc,
      url: canonical,
      images: img ? [{ url: img }] : undefined,
    },
  };
}

export default async function Page(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Ya obtenemos el servicio en el servidor para generateMetadata — lo
  // reutilizamos como contenido inicial para que el primer HTML que recibe
  // el crawler (o cualquier vista previa) traiga el contenido real, en vez
  // de mostrar el estado de carga.
  let initialData: any = null;
  try {
    initialData = await findServicio(slug);
  } catch { }
  if (!initialData) initialData = SERVICIOS_DATA[slug] ?? null;

  // Los campos Timestamp que devuelve firebase-admin (createdAt, updatedAt, etc.)
  // son instancias de clase, no objetos planos — Next.js no permite pasar eso
  // de un Server Component a un Client Component. Este JSON.parse/stringify
  // los convierte a datos planos serializables.
  if (initialData) {
    initialData = JSON.parse(JSON.stringify(initialData));
  }

  const canonical = `${SITE_URL}/servicios/${slug}`;
  const serviceSchema = initialData ? {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: initialData.title,
    name: `${initialData.title} en Sechura, Piura`,
    description: initialData.desc || initialData.detail?.hero_desc || initialData.hero
      || `${initialData.title} para tu evento en Sechura, Piura.`,
    url: canonical,
    areaServed: {
      '@type': 'City',
      name: 'Sechura, Piura, Perú',
    },
    provider: {
      '@type': 'LocalBusiness',
      name: 'J&M Decoraciones y Eventos',
      url: SITE_URL,
      telephone: '+51945203708',
    },
  } : null;

  const faqList = (initialData?.detail?.faq && initialData.detail.faq.length > 0)
    ? initialData.detail.faq
    : FAQ_DEFAULT;
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqList.map((f: any) => ({
      '@type': 'Question',
      name: f.pregunta,
      acceptedAnswer: { '@type': 'Answer', text: f.respuesta },
    })),
  };

  const breadcrumbSchema = initialData ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Servicios', item: `${SITE_URL}/servicios` },
      { '@type': 'ListItem', position: 3, name: initialData.title, item: canonical },
    ],
  } : null;

  return (
    <>
      {serviceSchema && <JsonLd data={serviceSchema} />}
      {breadcrumbSchema && <JsonLd data={breadcrumbSchema} />}
      <JsonLd data={faqSchema} />
      <ServicioClient initialData={initialData} />
    </>
  );
}
