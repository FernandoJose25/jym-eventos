import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';
import { listarICloud, idDeAlbumICloud } from '@/lib/icloudProtocol';
import { icloudAlbumsCol } from '@/lib/icloudSync';

/**
 * Sesión persistente de álbumes compartidos de iCloud ("como Google Photos"):
 * en vez de tener que pegar el link cada vez que se vuelve a abrir el
 * importador, el link se guarda una sola vez y queda conectado hasta que se
 * presione "Desconectar". A partir de ahí, /api/icloud-album/sync (manual) y
 * /api/cron/icloud-sync (automático) revisan periódicamente si hay fotos
 * nuevas en el álbum y las importan solas.
 *
 * Colección: icloudAlbums/{adminUid}/albums/{albumId}
 */

/* ── GET: listar álbumes conectados (sin exponer la lista completa de IDs vistos).
   Con ?abrir=<id> devuelve, en cambio, solo las fotos/videos de ESE álbum que
   todavía no se habían traído antes (no están en seenIds) — para revisión manual
   en el importador sin repetir cada vez lo que ya se decidió (subido o descartado). ── */
export async function GET(req: NextRequest) {
    const auth = await verifyToken(req);
    if (auth.response) return auth.response;

    const abrirId = req.nextUrl.searchParams.get('abrir');
    if (abrirId) {
        const ref = icloudAlbumsCol(auth.uid).doc(abrirId);
        const snap = await ref.get();
        if (!snap.exists) return NextResponse.json({ error: 'Álbum no encontrado' }, { status: 404 });
        const data = snap.data()!;
        try {
            const items = await listarICloud(data.url);
            const seen: Set<string> = new Set(data.seenIds || []);
            const nuevos = items.filter(it => !seen.has(it.id));
            return NextResponse.json({ items: nuevos });
        } catch (e: any) {
            return NextResponse.json({ error: e.message || 'No se pudo leer el álbum de iCloud' }, { status: 400 });
        }
    }

    const snap = await icloudAlbumsCol(auth.uid).get();
    const albumes = snap.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            url: data.url,
            nombre: data.nombre,
            addedAt: data.addedAt || null,
            lastSyncedAt: data.lastSyncedAt || null,
            lastSyncError: data.lastSyncError || null,
            autoSync: data.autoSync !== false,
            fotosVistas: Array.isArray(data.seenIds) ? data.seenIds.length : 0,
        };
    });
    return NextResponse.json({ albumes });
}

/* ── POST: conectar un álbum nuevo — lo lee, guarda la sesión, y devuelve sus fotos actuales
   para cargarlas de una vez en el importador (igual que antes, pero ya queda guardado). ── */
export async function POST(req: NextRequest) {
    const auth = await verifyToken(req);
    if (auth.response) return auth.response;

    const { url, nombre } = await req.json().catch(() => ({}));
    if (!url || typeof url !== 'string') {
        return NextResponse.json({ error: 'Falta el link del álbum' }, { status: 400 });
    }

    let albumId: string;
    try {
        albumId = idDeAlbumICloud(url);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }

    try {
        const items = await listarICloud(url);
        const ref = icloudAlbumsCol(auth.uid).doc(albumId);
        const yaExistia = (await ref.get()).exists;

        await ref.set({
            url: url.trim(),
            nombre: (typeof nombre === 'string' && nombre.trim()) || `Álbum iCloud ${new Date().toLocaleDateString('es-PE')}`,
            addedAt: yaExistia ? undefined : new Date().toISOString(),
            lastSyncedAt: new Date().toISOString(),
            lastSyncError: null,
            autoSync: true,
            // Al conectar, el punto de partida son las fotos que YA están en el álbum ahora
            // mismo — esas se cargan de una vez abajo para revisarlas como siempre. Desde
            // este momento en adelante, cualquier foto NUEVA que se agregue al álbum
            // compartido se auto-importa sola en la próxima sincronización.
            seenIds: items.map(it => it.id),
        }, { merge: true });

        return NextResponse.json({ id: albumId, items });
    } catch (e: any) {
        console.error('[icloud-album/accounts] POST error', e);
        return NextResponse.json({ error: e.message || 'No se pudo conectar el álbum de iCloud' }, { status: 400 });
    }
}

/* ── PATCH: pausar/reanudar la auto-importación de un álbum ya conectado,
   o marcar fotos/videos como "ya vistos" tras decidirlos a mano en el
   importador (subidos o descartados) para que no se repitan la próxima vez. ── */
export async function PATCH(req: NextRequest) {
    const auth = await verifyToken(req);
    if (auth.response) return auth.response;

    const { id, autoSync, marcarVistos } = await req.json().catch(() => ({}));
    if (!id || typeof id !== 'string') {
        return NextResponse.json({ error: 'Falta el id del álbum' }, { status: 400 });
    }

    if (Array.isArray(marcarVistos) && marcarVistos.length > 0) {
        const ref = icloudAlbumsCol(auth.uid).doc(id);
        const snap = await ref.get();
        if (!snap.exists) return NextResponse.json({ error: 'Álbum no encontrado' }, { status: 404 });
        const seen: Set<string> = new Set(snap.data()!.seenIds || []);
        for (const itemId of marcarVistos) if (typeof itemId === 'string') seen.add(itemId);
        await ref.set({ seenIds: [...seen] }, { merge: true });
        return NextResponse.json({ ok: true });
    }

    await icloudAlbumsCol(auth.uid).doc(id).set({ autoSync: !!autoSync }, { merge: true });
    return NextResponse.json({ ok: true });
}

/* ── DELETE: desconectar un álbum (deja de sincronizarse; no borra fotos ya importadas) ── */
export async function DELETE(req: NextRequest) {
    const auth = await verifyToken(req);
    if (auth.response) return auth.response;

    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Falta el id del álbum' }, { status: 400 });

    await icloudAlbumsCol(auth.uid).doc(id).delete();
    return NextResponse.json({ ok: true });
}
