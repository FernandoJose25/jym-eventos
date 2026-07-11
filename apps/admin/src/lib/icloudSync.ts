import { adminDb } from '@/lib/firebase-admin';

/**
 * Colección de álbumes de iCloud conectados de forma persistente.
 * Colección: icloudAlbums/{adminUid}/albums/{albumId}
 *   { url, nombre, addedAt }
 *
 * Solo guarda la sesión (para no repegar el link); no hay sincronización
 * automática — la importación es siempre manual desde /dashboard/galeria/importar.
 */
export function icloudAlbumsCol(uid: string) {
    return adminDb.collection('icloudAlbums').doc(uid).collection('albums');
}
