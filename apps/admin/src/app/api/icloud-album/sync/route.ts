import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';
import { sincronizarAlbumICloud, sincronizarTodosLosAlbumes } from '@/lib/icloudSync';

/**
 * Sincronización manual ("Sincronizar ahora" en el panel): revisa el álbum
 * (o todos los álbumes conectados si no se manda id) y trae las fotos que
 * todavía no se habían importado, ya clasificadas por la IA y guardadas en
 * la galería (visible:false, pendientes de aprobar en /dashboard/galeria).
 *
 * La sincronización automática en segundo plano (sin que Fernando tenga que
 * entrar al panel) corre aparte, vía Vercel Cron -> /api/cron/icloud-sync.
 */
export async function POST(req: NextRequest) {
    const auth = await verifyToken(req);
    if (auth.response) return auth.response;

    const { id } = await req.json().catch(() => ({}));

    try {
        if (id && typeof id === 'string') {
            const resultado = await sincronizarAlbumICloud(auth.uid, id);
            return NextResponse.json({ resultados: [resultado] });
        }
        const resultados = await sincronizarTodosLosAlbumes(auth.uid);
        return NextResponse.json({ resultados });
    } catch (e: any) {
        console.error('[icloud-album/sync] error', e);
        return NextResponse.json({ error: e.message || 'Error sincronizando el álbum' }, { status: 500 });
    }
}