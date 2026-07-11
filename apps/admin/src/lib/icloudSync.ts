import { adminDb } from '@/lib/firebase-admin';
import { listarICloud, importarYSubirICloud } from '@/lib/icloudProtocol';
import { clasificarFotosEnLotes } from '@/lib/classifyFotosIA';

/**
 * Sincronización de álbumes de iCloud conectados de forma persistente.
 * Colección: icloudAlbums/{adminUid}/albums/{albumId}
 *   { url, nombre, addedAt, lastSyncedAt, seenIds: string[], autoSync, albumDocId }
 *
 * Se llama desde:
 *  - POST /api/icloud-album/sync (botón "Sincronizar ahora" en el admin)
 *  - GET  /api/cron/icloud-sync  (Vercel Cron, todas las cuentas)
 */

function slugify(s: string) {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'evento';
}
function urlParaClasificar(url: string) {
    return url.includes('/upload/') ? url.replace('/upload/', '/upload/w_700,q_auto,f_auto/') : url;
}

export function icloudAlbumsCol(uid: string) {
    return adminDb.collection('icloudAlbums').doc(uid).collection('albums');
}

export interface ResultadoSyncAlbum {
    albumId: string;
    nuevas: number;
    error?: string;
}

/** Sincroniza UN álbum: sube + clasifica + guarda en la galería solo las fotos que aún no se habían visto. */
export async function sincronizarAlbumICloud(uid: string, albumId: string): Promise<ResultadoSyncAlbum> {
    const ref = icloudAlbumsCol(uid).doc(albumId);
    const snap = await ref.get();
    if (!snap.exists) return { albumId, nuevas: 0, error: 'Álbum no encontrado' };

    const data = snap.data()!;
    if (data.autoSync === false) return { albumId, nuevas: 0 };

    let items;
    try {
        items = await listarICloud(data.url);
    } catch (e: any) {
        await ref.set({ lastSyncError: e.message || 'Error leyendo el álbum' }, { merge: true });
        return { albumId, nuevas: 0, error: e.message || 'Error leyendo el álbum de iCloud' };
    }

    const seen: Set<string> = new Set(data.seenIds || []);
    const nuevos = items.filter(it => !seen.has(it.id));

    if (nuevos.length === 0) {
        await ref.set({ lastSyncedAt: new Date().toISOString(), lastSyncError: null }, { merge: true });
        return { albumId, nuevas: 0 };
    }

    // 1) Asegurar el álbum real en la galería (uno por conexión) para que las fotos nuevas se agrupen ahí.
    let albumDocId: string = data.albumDocId || '';
    if (!albumDocId) {
        const albumsSnap = await adminDb.collection('albums').get();
        const nuevoAlbum = await adminDb.collection('albums').add({
            titulo: data.nombre || 'Álbum de iCloud',
            slug: slugify(data.nombre || 'album-icloud'),
            tipoEvento: '', cliente: '', fecha: new Date().toISOString().slice(0, 10), descripcion: '',
            coverUrl: '', coverFocalX: 0.5, coverFocalY: 0.5,
            visible: true, order: albumsSnap.size + 1, createdAt: new Date().toISOString(),
            origen: 'icloud-auto',
        });
        albumDocId = nuevoAlbum.id;
    }

    // 2) Subir a Cloudinary
    const subidas = await importarYSubirICloud(
        nuevos.map(it => ({ id: it.id, fullUrl: it.fullUrl, filename: it.filename })),
        3,
    );
    const exitosas = subidas.filter(s => s.cloudinaryUrl) as { id: string; cloudinaryUrl: string }[];

    // 3) Clasificar con IA
    const clasificadas = await clasificarFotosEnLotes(
        exitosas.map(s => ({ id: s.id, url: urlParaClasificar(s.cloudinaryUrl) })),
    );

    // 4) Guardar en gallery_items — visible:false, para que quede pendiente de un vistazo
    //    rápido en el panel (Galería → aprobar/publicar) antes de salir al público.
    const gallerySnap = await adminDb.collection('gallery_items').orderBy('order', 'asc').get();
    let order = gallerySnap.size;
    let coverUrl = '';

    for (const s of exitosas) {
        const c = clasificadas[s.id];
        order += 1;
        if (!coverUrl) coverUrl = s.cloudinaryUrl;
        await adminDb.collection('gallery_items').doc(`${Date.now()}_${s.id}`).set({
            url: s.cloudinaryUrl,
            alt: c?.alt || c?.subcategoria || c?.categoria || 'Evento J&M',
            categoria: c?.categoria || 'General',
            subcategoria: c?.subcategoria || '',
            albumId: albumDocId,
            focalX: 0.5, focalY: 0.5,
            tipo: 'imagen',
            visible: false, // pendiente de aprobar en el panel antes de salir a la web pública
            order, row: 1,
            createdAt: new Date().toISOString(),
            origen: 'icloud-auto',
        });
    }

    if (coverUrl) {
        await adminDb.collection('albums').doc(albumDocId).set({ coverUrl }, { merge: true });
    }

    // 5) Actualizar seenIds con el estado completo actual del álbum (autocorrige cualquier desfase)
    await ref.set({
        seenIds: items.map(it => it.id),
        lastSyncedAt: new Date().toISOString(),
        lastSyncError: null,
        albumDocId,
    }, { merge: true });

    return { albumId, nuevas: exitosas.length };
}

/** Sincroniza TODOS los álbumes conectados de un admin. */
export async function sincronizarTodosLosAlbumes(uid: string): Promise<ResultadoSyncAlbum[]> {
    const snap = await icloudAlbumsCol(uid).get();
    const resultados: ResultadoSyncAlbum[] = [];
    for (const doc of snap.docs) {
        resultados.push(await sincronizarAlbumICloud(uid, doc.id));
    }
    return resultados;
}
