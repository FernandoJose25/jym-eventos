import { createHash } from 'crypto';

/**
 * Protocolo interno (no oficial) de álbumes compartidos de iCloud.
 * Server-only — nunca se importa desde componentes 'use client'.
 * Compartido entre /api/icloud-album (uso manual desde el importador) y
 * /api/icloud-album/accounts + /api/cron/icloud-sync (conexión persistente
 * y sincronización automática de fotos nuevas).
 */

export interface AppleDerivative {
    checksum: string;
    fileSize: string;
    width: string;
    height: string;
}
export interface ApplePhoto {
    photoGuid: string;
    derivatives: Record<string, AppleDerivative>;
    caption?: string;
    dateCreated?: string;
    mediaAssetType?: string; // 'video' cuando está presente; no siempre viene
}

export interface ICloudListedItem {
    id: string;
    filename: string;
    width: number;
    height: number;
    thumbUrl: string;
    fullUrl: string;
    tipo: 'imagen' | 'video';
}

/** Extrae el token del link público, en cualquiera de los 2 formatos que usa Apple. */
export function extraerTokenICloud(albumUrl: string): string {
    const s = albumUrl.trim();
    const hash = s.split('#')[1];                                     // .../sharedalbum/#B12GfnH...
    if (hash) return hash;
    const m = s.match(/share\.icloud\.com\/photos\/([A-Za-z0-9_-]+)/); // formato nuevo
    if (m) return m[1];
    if (/^[A-Za-z0-9_-]{10,}$/.test(s)) return s;                      // ya viene el token solo
    throw new Error('Ese link no parece un álbum compartido de iCloud válido');
}

/** ID estable y corto para usar como docId en Firestore a partir del token del álbum. */
export function idDeAlbumICloud(albumUrl: string): string {
    const token = extraerTokenICloud(albumUrl);
    return createHash('sha1').update(token).digest('hex').slice(0, 24);
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

/** Lee un álbum compartido y devuelve metadata + miniatura + URL de resolución completa de cada foto/video. */
export async function listarICloud(albumUrl: string): Promise<ICloudListedItem[]> {
    const token = extraerTokenICloud(albumUrl);
    const { photos, host } = await webstream(token);

    if (photos.length === 0) {
        throw new Error('El álbum está vacío');
    }

    const porItem = photos.map(p => {
        const ders = Object.values(p.derivatives || {});
        if (ders.length === 0) return null;
        // La derivative más pesada es siempre la de mayor calidad disponible: el
        // archivo de video original en el caso de videos, o la foto a resolución
        // completa en el caso de fotos. La más liviana sirve como miniatura/poster.
        const ordenadas = [...ders].sort((a, b) => Number(a.fileSize) - Number(b.fileSize));
        return {
            guid: p.photoGuid,
            thumb: ordenadas[0],
            full: ordenadas[ordenadas.length - 1],
            tipo: (p.mediaAssetType === 'video' ? 'video' : 'imagen') as 'imagen' | 'video',
        };
    }).filter(Boolean) as { guid: string; thumb: AppleDerivative; full: AppleDerivative; tipo: 'imagen' | 'video' }[];

    // Un solo request resuelve las URLs de TODOS los checksums (miniatura y completa) de todos los items
    const urls = await resolverUrls(token, host, photos.map(p => p.photoGuid));

    const items = porItem
        .map(p => ({
            id: p.guid,
            filename: `${p.guid}.${p.tipo === 'video' ? 'mov' : 'jpg'}`,
            width: Number(p.full.width) || 0,
            height: Number(p.full.height) || 0,
            thumbUrl: urls[p.thumb.checksum] || '',
            fullUrl: urls[p.full.checksum] || '',
            tipo: p.tipo,
        }))
        .filter(it => it.thumbUrl && it.fullUrl);

    if (items.length === 0) {
        throw new Error('No se pudieron resolver las URLs de las fotos/videos de este álbum');
    }
    return items;
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

export interface ResultadoImportICloud {
    id: string;
    cloudinaryUrl?: string;
    tipo?: 'imagen' | 'video';
    error?: string;
}

/** Descarga cada foto/video de Apple y lo sube a Cloudinary en su calidad original (sin transformar). Devuelve un resultado por cada uno. */
export async function importarYSubirICloud(
    items: { id: string; fullUrl: string; filename: string; tipo?: 'imagen' | 'video' }[],
    concurrencia = 3,
): Promise<ResultadoImportICloud[]> {
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!apiSecret || !apiKey || !cloudName) {
        throw new Error('Cloudinary no configurado en el servidor');
    }
    const folder = 'jym/galeria-importada';

    return runWithConcurrency(items, concurrencia, async (it) => {
        const tipo: 'imagen' | 'video' = it.tipo === 'video' ? 'video' : 'imagen';
        try {
            const res = await fetch(it.fullUrl);
            if (!res.ok) throw new Error(`iCloud devolvió ${res.status} al descargar este archivo`);
            const buf = Buffer.from(await res.arrayBuffer());

            const timestamp = Math.round(Date.now() / 1000);
            const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
            const signature = createHash('sha1').update(paramsToSign + apiSecret).digest('hex');

            const form = new FormData();
            form.append('file', new Blob([buf]), it.filename || `${it.id}.${tipo === 'video' ? 'mov' : 'jpg'}`);
            form.append('api_key', apiKey);
            form.append('timestamp', String(timestamp));
            form.append('signature', signature);
            form.append('folder', folder);

            const resourceType = tipo === 'video' ? 'video' : 'image';
            const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
                method: 'POST',
                body: form,
            });
            if (!upRes.ok) throw new Error(`Cloudinary rechazó este ${tipo === 'video' ? 'video' : 'archivo'}`);
            const upData = await upRes.json();
            return { id: it.id, cloudinaryUrl: upData.secure_url as string, tipo };
        } catch (e: any) {
            return { id: it.id, error: e.message || 'Error importando esta foto' };
        }
    });
}
