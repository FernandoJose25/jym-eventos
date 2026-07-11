import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';
import { listarICloud, idDeAlbumICloud } from '@/lib/icloudProtocol';
import { icloudAlbumsCol } from '@/lib/icloudSync';

/**
 * Sesión persistente de álbumes compartidos de iCloud ("como Google Photos"):
 * en vez de tener que pegar el link cada vez que se vuelve a abrir el
 * importador, el link se guarda una sola vez y queda conectado hasta que se
 * presione "Desconectar".
 *
 * Flujo 100% manual: al abrir un álbum conectado se trae SIEMPRE el álbum
 * completo (ver /api/icloud-album action:'list') y el cliente compara contra
 * su propia galería (gallery_items, campo icloudId) qué ya está subido.
 *
 * Colección: icloudAlbums/{adminUid}/albums/{albumId}
 */

/* ── GET: listar álbumes conectados ── */
export async function GET(req: NextRequest) {
    const auth = await verifyToken(req);
    if (auth.response) return auth.response;

    const snap = await icloudAlbumsCol(auth.uid).get();
    const albumes = snap.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            url: data.url,
            nombre: data.nombre,
            addedAt: data.addedAt || null,
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
        }, { merge: true });

        return NextResponse.json({ id: albumId, items });
    } catch (e: any) {
        console.error('[icloud-album/accounts] POST error', e);
        return NextResponse.json({ error: e.message || 'No se pudo conectar el álbum de iCloud' }, { status: 400 });
    }
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
