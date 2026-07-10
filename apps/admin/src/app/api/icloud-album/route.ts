import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';

/**
 * Proxy server-side para álbumes compartidos de iCloud.
 *
 * iCloud NO tiene una API pública ni documentada por Apple para leer fotos
 * de terceros. Esta ruta reproduce el protocolo interno que usa la propia
 * página web icloud.com/sharedalbum (el mismo que usan herramientas conocidas
 * como `icloud-shared-album` o `icloud-album-rs`). Al ser un formato no
 * oficial, Apple podría cambiarlo sin aviso — si un día esta ruta empieza a
 * fallar de golpe con TODOS los álbumes, es la primera sospechosa.
 *
 * Todo el trabajo (leer el álbum, resolver URLs, descargar y subir a
 * Cloudinary) pasa por el servidor — nunca por el navegador — para evitar
 * el mismo problema de CORS/tainted-canvas que ya resolvimos en el cropper:
 * el CDN de Apple no promete cabeceras CORS para terceros.
 *
 * Acciones:
 *  - POST { action:'list',   albumUrl }               -> metadata + miniaturas + URL de resolución completa
 *  - POST { action:'import', items:[{id,fullUrl,filename}] } -> descarga cada foto y la sube a Cloudinary
 */

const CONCURRENCIA_IMPORT = 3;

interface AppleDerivative {
    checksum: string;
    fileSize: string;
    width: string;
    height: string;
}
interface ApplePhoto {
    photoGuid: string;
    derivatives: Record<string, AppleDerivative>;
    caption?: string;
    dateCreated?: string;
    mediaAssetType?: string; // 'video' cuando está presente; no siempre viene
}

/** Extrae el token del link público, en cualquiera de los 2 formatos que usa Apple. */
function extraerToken(albumUrl: string): string {
    const s = albumUrl.trim();
    const hash = s.split('#')[1];                                   // .../sharedalbum/#B12GfnH...
    if (hash) return hash;
    const m = s.match(/share\.icloud\.com\/photos\/([A-Za-z0-9_-]+)/); // formato nuevo
    if (m) return m[1];
    if (/^[A-Za-z0-9_-]{10,}$/.test(s)) return s;                    // ya viene el token solo
    throw new Error('Ese link no parece un álbum compartido de iCloud válido');
}

/** Pide el listado del álbum; sigue el redirect de shard que manda Apple (X-Apple-MMe-Host). */
async function webstream(token: string, host = 'p23-sharedstreams.icloud.com', intentos = 0): Promise<{ photos: ApplePhoto[]; host: string }> {
    if (intentos > 3) throw new Error('iCloud no respondió después de varios intentos de redirección');
    const res = await fetch(`https://${host}/${token}/sharedstreams/webstream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamCtag: null }),
    });
    const data = await res.json().catch(() => null);
    const redirectHost = data?.['X-Apple-MMe-Host'];
    if (redirectHost && redirectHost !== host) {
        return webstream(token, redirectHost, intentos + 1);
    }
    if (!data?.photos) {
        throw new Error('El álbum no existe, es privado, o el link ya no es válido');
    }
    return { photos: data.photos, host };
}

/** Resuelve las URLs reales de descarga para todos los checksums de las fotos dadas, en un solo request. */
async function resolverUrls(token: string, host: string, photoGuids: string[]): Promise<Record<string, string>> {
    if (photoGuids.length === 0) return {};
    const res = await fetch(`https://${host}/${token}/sharedstreams/webasseturls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoGuids }),
    });
    const data = await res.json().catch(() => null);
    const items = data?.items || {};
    const out: Record<string, string> = {};
    for (const checksum of Object.keys(items)) {
        const it = items[checksum];
        if (it?.url_location && it?.url_path) out[checksum] = `https://${it.url_location}${it.url_path}`;
    }
    return out;
}

async function runWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
    const out: R[] = new Array(items.length);
    let i = 0;
    const runners = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
        while (i < items.length) {
            const idx = i++;
            out[idx] = await worker(items[idx]);
        }
    });
    await Promise.all(runners);
    return out;
}

export async function POST(req: NextRequest) {
    const auth = await verifyToken(req);
    if (auth.response) return auth.response;

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    /* ── listar el álbum: metadata + miniatura + URL de resolución completa ── */
    if (action === 'list') {
        const albumUrl = body?.albumUrl;
        if (!albumUrl || typeof albumUrl !== 'string') {
            return NextResponse.json({ error: 'Falta el link del álbum' }, { status: 400 });
        }

        let token: string;
        try {
            token = extraerToken(albumUrl);
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 400 });
        }

        try {
            const { photos, host } = await webstream(token);

            // Solo fotos (los videos de álbumes compartidos quedan fuera por ahora)
            const soloFotos = photos.filter(p => p.mediaAssetType !== 'video');
            if (soloFotos.length === 0) {
                return NextResponse.json({ error: 'El álbum está vacío o solo tiene videos (aún no soportados)' }, { status: 400 });
            }

            const porFoto = soloFotos.map(p => {
                const ders = Object.values(p.derivatives || {});
                if (ders.length === 0) return null;
                const ordenadas = [...ders].sort((a, b) => Number(a.fileSize) - Number(b.fileSize));
                return { guid: p.photoGuid, thumb: ordenadas[0], full: ordenadas[ordenadas.length - 1] };
            }).filter(Boolean) as { guid: string; thumb: AppleDerivative; full: AppleDerivative }[];

            // Un solo request resuelve las URLs de TODOS los checksums (miniatura y completa) de todas las fotos
            const urls = await resolverUrls(token, host, soloFotos.map(p => p.photoGuid));

            const items = porFoto
                .map(p => ({
                    id: p.guid,
                    filename: `${p.guid}.jpg`,
                    width: Number(p.full.width) || 0,
                    height: Number(p.full.height) || 0,
                    thumbUrl: urls[p.thumb.checksum] || '',
                    fullUrl: urls[p.full.checksum] || '',
                }))
                .filter(it => it.thumbUrl && it.fullUrl);

            if (items.length === 0) {
                return NextResponse.json({ error: 'No se pudieron resolver las URLs de las fotos de este álbum' }, { status: 502 });
            }

            return NextResponse.json({ items });
        } catch (e: any) {
            console.error('[icloud-album] list error', e);
            return NextResponse.json({ error: e.message || 'No se pudo leer el álbum de iCloud' }, { status: 502 });
        }
    }

    /* ── importar: descargar cada foto de Apple y subirla a Cloudinary ── */
    if (action === 'import') {
        const items = body?.items as { id: string; fullUrl: string; filename: string }[];
        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'No hay fotos que importar' }, { status: 400 });
        }

        const apiSecret = process.env.CLOUDINARY_API_SECRET;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        if (!apiSecret || !apiKey || !cloudName) {
            return NextResponse.json({ error: 'Cloudinary no configurado en el servidor' }, { status: 500 });
        }

        const folder = 'jym/galeria-importada';

        const resultados = await runWithConcurrency(items, CONCURRENCIA_IMPORT, async (it) => {
            try {
                const res = await fetch(it.fullUrl);
                if (!res.ok) throw new Error(`iCloud devolvió ${res.status} al descargar esta foto`);
                const buf = Buffer.from(await res.arrayBuffer());

                const timestamp = Math.round(Date.now() / 1000);
                const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
                const signature = createHash('sha1').update(paramsToSign + apiSecret).digest('hex');

                const form = new FormData();
                form.append('file', new Blob([buf]), it.filename || `${it.id}.jpg`);
                form.append('api_key', apiKey);
                form.append('timestamp', String(timestamp));
                form.append('signature', signature);
                form.append('folder', folder);

                const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                    method: 'POST',
                    body: form,
                });
                if (!upRes.ok) throw new Error('Cloudinary rechazó esta imagen');
                const upData = await upRes.json();
                return { id: it.id, cloudinaryUrl: upData.secure_url as string };
            } catch (e: any) {
                return { id: it.id, error: e.message || 'Error importando esta foto' };
            }
        });

        return NextResponse.json({ resultados });
    }

    return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
}
