import type { Metadata } from 'next';
import FotoRedirect from './FotoRedirect';
import { cxOg } from '@/lib/cloudinary';

interface FirestoreItem {
  url: string;
  alt: string;
  categoria: string;
  slug?: string;
}

async function getItem(id: string): Promise<FirestoreItem | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey    = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/gallery_items/${id}?key=${apiKey}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const { fields } = await res.json();
    if (!fields) return null;

    return {
      url:       fields.url?.stringValue       ?? '',
      alt:       fields.alt?.stringValue       ?? '',
      categoria: fields.categoria?.stringValue ?? '',
      slug:      fields.slug?.stringValue,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const item = await getItem(id);

  const siteName  = 'J&M Eventos y Decoraciones — Sechura, Piura';
  const title     = item?.alt || item?.categoria || siteName;
  const desc      = `${item?.categoria ? item.categoria + ' · ' : ''}${siteName}`;
  // JPEG forzado, 1200×630, calidad máxima — Facebook/WhatsApp lo reciben sin recompresión extra
  const image     = item?.url ? cxOg(item.url) : '';
  const canonical = `https://jym-eventos-web.vercel.app/foto/${id}`;

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      url: canonical,
      siteName,
      type: 'website',
      images: image
        ? [{ url: image, width: 1200, height: 800, alt: title }]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: image ? [image] : [],
    },
  };
}

export default async function FotoPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = await getItem(id);

  return <FotoRedirect itemId={id} slug={item?.slug} />;
}
