import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { adminDb } from '@/lib/firebase-admin';
import { SITE_URL } from '@/lib/site';
import { getAlbumesVisibles } from '@/lib/albums';
import { cxCard } from '@/lib/cloudinary';
import GaleriaClient, { type GItem } from './GaleriaClient';

export const dynamic = 'force-dynamic';

const DEFAULT_TITLE = 'Galería de Eventos en Sechura, Piura';
const DEFAULT_DESC = 'Fotos y videos reales de bodas, quinceañeros, shows infantiles, decoración temática y eventos corporativos realizados en Sechura, Piura.';

// Trae los primeros items directo de Firestore EN EL SERVIDOR, para que el
// HTML que recibe Google (y cualquier vista previa) ya traiga fotos y alt
// reales — antes, GaleriaClient los cargaba solo en el navegador después
// del primer render, así que un rastreador veía la página vacía.
async function getInitialGalleryItems(): Promise<GItem[]> {
  try {
    const snap = await adminDb.collection('gallery_items').orderBy('order', 'asc').limit(60).get();
    return snap.docs
      .map(d => {
        const dt = d.data() as any;
        // Reconstruimos el objeto campo a campo (en vez de spread crudo) para
        // no arrastrar Timestamps u otros tipos de Firestore no serializables
        // al pasarlo del Server Component a GaleriaClient — Next.js exige
        // "plain objects" en ese límite.
        const item: GItem = {
          id: d.id,
          url: dt.url || '',
          alt: dt.alt || '',
          categoria: dt.categoria || undefined,
          subcategoria: dt.subcategoria || undefined,
          visible: dt.visible !== false,
          order: typeof dt.order === 'number' ? dt.order : 0,
          focalX: typeof dt.focalX === 'number' ? dt.focalX : undefined,
          focalY: typeof dt.focalY === 'number' ? dt.focalY : undefined,
          tipo: dt.tipo || undefined,
          sonidoPermitido: dt.sonidoPermitido === true,
          albumId: dt.albumId || undefined,
        };
        return item;
      })
      .filter(i => i.visible !== false);
  } catch (e) {
    console.error('[galeria] Error leyendo gallery_items en el servidor:', e);
    return [];
  }
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const snap = await adminDb.collection('site_config').doc('seo').get();
    const data = snap.exists ? snap.data() ?? {} : {};
    return {
      title: data.galeriaTitle || DEFAULT_TITLE,
      description: data.galeriaDesc || DEFAULT_DESC,
      alternates: { canonical: `${SITE_URL}/galeria` },
    };
  } catch {
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESC,
      alternates: { canonical: `${SITE_URL}/galeria` },
    };
  }
}

export default async function Page() {
  // Los álbumes viven en su propia colección con SEO dedicado por evento
  // (/albumes/[slug]). Aquí solo mostramos una tira de acceso rápido —
  // ya no existe un ítem de navegación separado para "Álbumes".
  const [albumes, initialItems] = await Promise.all([
    getAlbumesVisibles(),
    getInitialGalleryItems(),
  ]);

  return (
    <>
      {albumes.length > 0 && (
        <section style={{ background: '#0a1628', padding: '2.5rem 0 0' }}>
          <div className="container">
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
              <h2 style={{ color: '#fff', fontSize: '1.15rem', margin: 0 }}>
                Álbumes de eventos
              </h2>
              <Link href="/albumes" style={{ color: '#f5c842', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none' }}>
                Ver todos →
              </Link>
            </div>
            <div style={{
              display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '2rem',
              scrollSnapType: 'x proximity',
            }}>
              {albumes.map(album => (
                <Link
                  key={album.id}
                  href={`/albumes/${album.slug}`}
                  style={{
                    flex: '0 0 auto', width: 190, aspectRatio: '4/5', borderRadius: 14,
                    overflow: 'hidden', position: 'relative', textDecoration: 'none',
                    background: '#0a1628', scrollSnapAlign: 'start',
                  }}
                >
                  {album.coverUrl && (
                    <Image
                      src={cxCard(album.coverUrl)}
                      alt={album.titulo}
                      fill
                      sizes="190px"
                      style={{
                        objectFit: 'cover',
                        objectPosition: `${(album.coverFocalX ?? 0.5) * 100}% ${(album.coverFocalY ?? 0.5) * 100}%`,
                      }}
                    />
                  )}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(10,22,40,0.92) 0%, transparent 60%)',
                  }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.85rem' }}>
                    <p style={{ color: '#fff', fontWeight: 700, fontSize: '0.85rem', margin: 0, lineHeight: 1.25 }}>
                      {album.titulo}
                    </p>
                    {album.tipoEvento && (
                      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', margin: '2px 0 0' }}>
                        {album.tipoEvento}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
      <GaleriaClient initialItems={initialItems} />
    </>
  );
}