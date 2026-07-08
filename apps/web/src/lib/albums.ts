// ── lib/albums.ts (SOLO SERVIDOR) ──────────────────────────────
// Queries de la colección `albums` + sus fotos (gallery_items.albumId).
// Úsalo únicamente en Server Components, generateMetadata, generateStaticParams
// y sitemap.ts — usa firebase-admin (@/lib/firebase-admin), no el SDK cliente.

import { adminDb } from './firebase-admin';
import type { Album, AlbumFoto } from '@/types';

function serializeAlbum(id: string, data: FirebaseFirestore.DocumentData): Album {
  const fecha = data.fecha;
  return {
    id,
    slug: data.slug || id,
    titulo: data.titulo || '',
    tipoEvento: data.tipoEvento || undefined,
    cliente: data.cliente || undefined,
    fecha: typeof fecha === 'string' ? fecha : (fecha?.toDate?.().toISOString().slice(0, 10) ?? ''),
    descripcion: data.descripcion || undefined,
    coverUrl: data.coverUrl || '',
    coverFocalX: typeof data.coverFocalX === 'number' ? data.coverFocalX : 0.5,
    coverFocalY: typeof data.coverFocalY === 'number' ? data.coverFocalY : 0.5,
    visible: data.visible !== false,
    order: typeof data.order === 'number' ? data.order : 0,
  };
}

/** Álbumes visibles, ordenados — para el listado /albumes */
export async function getAlbumesVisibles(): Promise<Album[]> {
  try {
    const snap = await adminDb
      .collection('albums')
      .where('visible', '==', true)
      .orderBy('order', 'asc')
      .get();
    return snap.docs.map(d => serializeAlbum(d.id, d.data()));
  } catch (e) {
    console.error('[albums] Error leyendo albums visibles:', e);
    return [];
  }
}

/** Todos los slugs — para generateStaticParams (ISR) */
export async function getAllAlbumSlugs(): Promise<string[]> {
  try {
    const snap = await adminDb.collection('albums').get();
    return snap.docs.map(d => (d.data().slug as string) || d.id);
  } catch (e) {
    console.error('[albums] Error leyendo slugs de albums:', e);
    return [];
  }
}

/** Un álbum por slug (o por ID de documento como respaldo) */
export async function getAlbumBySlug(slug: string): Promise<Album | null> {
  try {
    const bySlug = await adminDb.collection('albums').where('slug', '==', slug).limit(1).get();
    if (!bySlug.empty) {
      const doc = bySlug.docs[0];
      return serializeAlbum(doc.id, doc.data());
    }
    // Respaldo: si el álbum aún no tiene `slug` propio, el ID del documento sirve de slug
    const byId = await adminDb.collection('albums').doc(slug).get();
    if (!byId.exists) return null;
    return serializeAlbum(byId.id, byId.data()!);
  } catch (e) {
    console.error('[albums] Error leyendo album por slug:', e);
    return null;
  }
}

/**
 * Fotos/videos de un álbum. Consulta por igualdad simple (albumId) — no
 * necesita índice compuesto — y ordena/filtra visibilidad en memoria,
 * igual que hace GaleriaClient con `gallery_items`.
 */
export async function getFotosDeAlbum(albumId: string): Promise<AlbumFoto[]> {
  try {
    const snap = await adminDb.collection('gallery_items').where('albumId', '==', albumId).get();
    return snap.docs
      .map(d => ({ id: d.id, ...(d.data() as any) }))
      .filter((i: any) => i.visible !== false)
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
      .map((i: any): AlbumFoto => ({
        id: i.id,
        url: i.url,
        alt: i.alt,
        tipo: i.tipo,
        focalX: i.focalX,
        focalY: i.focalY,
        order: i.order,
      }));
  } catch (e) {
    console.error('[albums] Error leyendo fotos del álbum:', e);
    return [];
  }
}
