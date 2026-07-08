import type { MetadataRoute } from 'next';
import { adminDb } from '@/lib/firebase-admin';
import { SITE_URL } from '@/lib/site';
import { getAlbumesVisibles } from '@/lib/albums';

// Se regenera al menos una vez por hora, incluyendo los servicios que hayas
// agregado, editado o borrado desde el panel admin — sin tocar código.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE_URL}/sobre-nosotros`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/galeria`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/albumes`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/contacto`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/anuncia-con-nosotros`, changeFrequency: 'monthly', priority: 0.4 },
  ];

  let serviceRoutes: MetadataRoute.Sitemap = [];
  try {
    const snap = await adminDb.collection('services').get();
    serviceRoutes = snap.docs
      .filter(d => d.data().visible !== false)
      .map(d => {
        const link = d.data().link || '';
        const slug = link.replace('servicios/', '').replace('.html', '') || d.id;
        return {
          url: `${SITE_URL}/servicios/${slug}`,
          changeFrequency: 'monthly' as const,
          priority: 0.8,
        };
      });
  } catch (e) {
    console.error('[sitemap] Error leyendo servicios de Firestore:', e);
  }

  let albumRoutes: MetadataRoute.Sitemap = [];
  try {
    const albumes = await getAlbumesVisibles();
    albumRoutes = albumes.map(a => ({
      url: `${SITE_URL}/albumes/${a.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));
  } catch (e) {
    console.error('[sitemap] Error leyendo albumes de Firestore:', e);
  }

  return [...staticRoutes, ...serviceRoutes, ...albumRoutes];
}