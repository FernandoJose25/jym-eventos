// ── lib/camaraInvitado.ts (SOLO SERVIDOR) ──────────────────────
// Lee un link de "Cámara Invitado" por su token público (/c/{token}).
// Usa firebase-admin — solo en Server Components / Route Handlers.

import { adminDb } from './firebase-admin';
import type { CamaraInvitadoLink } from '@/types';

export async function getCamaraLinkByToken(token: string): Promise<CamaraInvitadoLink | null> {
  try {
    const snap = await adminDb
      .collection('camara_invitado_links')
      .where('token', '==', token)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    const data = doc.data();

    let albumSlug: string | undefined;
    if (data.albumId) {
      const albumDoc = await adminDb.collection('albums').doc(data.albumId).get();
      albumSlug = albumDoc.exists ? (albumDoc.data()?.slug || albumDoc.id) : undefined;
    }

    return {
      id: doc.id,
      albumId: data.albumId,
      albumTitulo: data.albumTitulo || undefined,
      albumSlug,
      token: data.token,
      activo: data.activo === true,
      plantillaUrl: data.plantillaUrl || null,
      plantillaActiva: data.plantillaActiva === true,
      permiteVideo: data.permiteVideo !== false,
      videoMaxSegundos: typeof data.videoMaxSegundos === 'number' ? data.videoMaxSegundos : 15,
    };
  } catch (e) {
    console.error('[camaraInvitado] Error leyendo link por token:', e);
    return null;
  }
}
