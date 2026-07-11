import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';
import { listarICloud, importarYSubirICloud } from '@/lib/icloudProtocol';

/**
 * Proxy server-side para álbumes compartidos de iCloud (uso manual, sin guardar sesión).
 *
 * iCloud NO tiene una API pública ni documentada por Apple para leer fotos
 * de terceros. Esta ruta reproduce el protocolo interno que usa la propia
 * página web icloud.com/sharedalbum. Al ser un formato no oficial, Apple
 * podría cambiarlo sin aviso.
 *
 * Todo el trabajo (leer el álbum, resolver URLs, descargar y subir a
 * Cloudinary) pasa por el servidor — nunca por el navegador — para evitar
 * el mismo problema de CORS/tainted-canvas que ya resolvimos en el cropper.
 *
 * Acciones:
 *  - POST { action:'list',   albumUrl }                        -> metadata + miniaturas + URL de resolución completa
 *  - POST { action:'import', items:[{id,fullUrl,filename}] }   -> descarga cada foto y la sube a Cloudinary
 *
 * Para conectar un álbum de forma persistente (sesión guardada + auto-importado
 * cuando aparecen fotos nuevas), ver /api/icloud-album/accounts y /api/cron/icloud-sync.
 */

const CONCURRENCIA_IMPORT = 3;

export async function POST(req: NextRequest) {
    const auth = await verifyToken(req);
    if (auth.response) return auth.response;

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'list') {
        const albumUrl = body?.albumUrl;
        if (!albumUrl || typeof albumUrl !== 'string') {
            return NextResponse.json({ error: 'Falta el link del álbum' }, { status: 400 });
        }
        try {
            const items = await listarICloud(albumUrl);
            return NextResponse.json({ items });
        } catch (e: any) {
            console.error('[icloud-album] list error', e);
            return NextResponse.json({ error: e.message || 'No se pudo leer el álbum de iCloud' }, { status: 400 });
        }
    }

    if (action === 'import') {
        const items = body?.items as { id: string; fullUrl: string; filename: string; tipo?: 'imagen' | 'video' }[];
        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'No hay fotos que importar' }, { status: 400 });
        }
        try {
            const resultados = await importarYSubirICloud(items, CONCURRENCIA_IMPORT);
            return NextResponse.json({ resultados });
        } catch (e: any) {
            return NextResponse.json({ error: e.message || 'Error importando fotos de iCloud' }, { status: 500 });
        }
    }

    return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
}
