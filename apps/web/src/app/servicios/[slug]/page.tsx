import type { Metadata } from 'next';
import ServicioClient, { SERVICIOS_DATA } from './ServicioClient';

export async function generateStaticParams() {
  return Object.keys(SERVICIOS_DATA).map((slug) => ({ slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const data = SERVICIOS_DATA[slug];

  if (!data) {
    return {
      title: 'Servicio no encontrado',
      description: 'El servicio que buscas no está disponible.',
    };
  }

  return {
    title: `${data.title} en Sechura, Piura`,
    description: data.hero ?? `${data.title} para tu evento en Sechura, Piura. Cotiza gratis con J&M Eventos.`,
    openGraph: {
      title: `${data.title} | J&M Eventos`,
      description: data.hero,
      images: data.img ? [{ url: data.img }] : undefined,
    },
  };
}

export default function Page() {
  return <ServicioClient />;
}
