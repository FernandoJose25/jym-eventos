'use client';

/**
 * Cliente delgado para el importador de álbumes compartidos de iCloud.
 * Toda la lógica de protocolo (token, shard host, checksums) vive en el
 * servidor (`/api/icloud-album`) — desde aquí solo mandamos el link que
 * pega el usuario y recibimos fotos ya listas para mostrar/importar.
 */

export interface ICloudItem {
    id: string;
    filename: string;
    width: number;
    height: number;
    /** URL de Apple, se puede usar directo en un <img> (no necesita CORS para solo mostrarla) */
    thumbUrl: string;
    /** URL de Apple en resolución completa; el servidor la descarga y sube a Cloudinary al importar */
    fullUrl: string;
}

export interface ResultadoImportICloud {
    id: string;
    cloudinaryUrl?: string;
    error?: string;
}

/** Lee un álbum compartido público y devuelve todas sus fotos (metadata + miniatura). */
export async function listarAlbumICloud(albumUrl: string, idToken: string): Promise<ICloudItem[]> {
    const res = await fetch('/api/icloud-album', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', albumUrl }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo leer el álbum de iCloud');
    return data.items as ICloudItem[];
}

/** Descarga (en el servidor) las fotos elegidas y las sube a Cloudinary. Devuelve un resultado por cada una. */
export async function importarDeICloud(
    items: { id: string; fullUrl: string; filename: string }[],
    idToken: string,
): Promise<ResultadoImportICloud[]> {
    const res = await fetch('/api/icloud-album', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', items }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudieron importar las fotos de iCloud');
    return data.resultados as ResultadoImportICloud[];
}
