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

/* ══════════════ Sesión persistente de álbumes de iCloud ══════════════
   Igual que las cuentas de Google Photos: el link se guarda una sola vez
   (no hay login real, pero sí queda "conectado") y desde ahí las fotos
   nuevas que aparezcan en el álbum se auto-importan solas (Vercel Cron),
   sin tener que volver a pegar el link cada vez que se entra a Galería. */

export interface CuentaICloud {
    id: string;
    url: string;
    nombre: string;
    addedAt: string | null;
    lastSyncedAt: string | null;
    lastSyncError: string | null;
    autoSync: boolean;
    fotosVistas: number;
}

/** Lista los álbumes de iCloud ya conectados (guardados) por este admin. */
export async function listarCuentasICloud(idToken: string): Promise<CuentaICloud[]> {
    const res = await fetch('/api/icloud-album/accounts', {
        headers: { Authorization: `Bearer ${idToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudieron listar los álbumes de iCloud conectados');
    return data.albumes as CuentaICloud[];
}

/** Conecta (guarda) un álbum nuevo y devuelve sus fotos actuales para cargarlas de una vez. */
export async function conectarAlbumICloud(url: string, nombre: string, idToken: string): Promise<{ id: string; items: ICloudItem[] }> {
    const res = await fetch('/api/icloud-album/accounts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, nombre }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo conectar el álbum de iCloud');
    return { id: data.id, items: data.items as ICloudItem[] };
}

/** Pausa o reanuda la auto-importación de un álbum ya conectado. */
export async function alternarAutoSyncICloud(id: string, autoSync: boolean, idToken: string): Promise<void> {
    const res = await fetch('/api/icloud-album/accounts', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, autoSync }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'No se pudo actualizar el álbum');
}

/** Desconecta un álbum guardado (deja de sincronizarse; no borra fotos ya importadas). */
export async function desconectarAlbumICloud(id: string, idToken: string): Promise<void> {
    const res = await fetch(`/api/icloud-album/accounts?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) throw new Error((await res.json()).error || 'No se pudo desconectar el álbum');
}

/** Fuerza una sincronización ahora mismo (uno o todos los álbumes conectados). */
export async function sincronizarAlbumesICloud(idToken: string, id?: string): Promise<{ albumId: string; nuevas: number; error?: string }[]> {
    const res = await fetch('/api/icloud-album/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { id } : {}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo sincronizar');
    return data.resultados;
}
