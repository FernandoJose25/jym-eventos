'use client';

/**
 * Integración con la Google Photos Picker API (la única forma soportada desde
 * el 31/marzo/2025 para elegir fotos del historial completo del usuario;
 * la vieja Library API ya no da acceso a fotos que la app no subió ella misma).
 *
 * Flujo:
 *  1. getGooglePhotosToken()      -> pide permiso OAuth (popup de Google)
 *  2. createPickerSession(token)  -> crea sesión, devuelve pickerUri
 *  3. abrir pickerUri en una pestaña -> el usuario elige fotos en la UI de Google
 *  4. pollPickerSession()         -> se repite hasta que mediaItemsSet = true
 *  5. listPickedMediaItems()      -> trae los items elegidos
 *  6. fetchMediaBlob()            -> descarga los bytes reales de cada foto
 */

declare global {
    interface Window {
        google?: any;
    }
}

const SCOPE = 'https://www.googleapis.com/auth/photospicker.mediaitems.readonly';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

let gisLoaded: Promise<void> | null = null;

function loadGis(): Promise<void> {
    if (gisLoaded) return gisLoaded;
    gisLoaded = new Promise((resolve, reject) => {
        if (window.google?.accounts?.oauth2) { resolve(); return; }
        const script = document.createElement('script');
        script.src = GIS_SRC;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('No se pudo cargar Google Identity Services'));
        document.head.appendChild(script);
    });
    return gisLoaded;
}

/** Abre el popup de consentimiento de Google y devuelve un access_token temporal. */
export async function getGooglePhotosToken(): Promise<string> {
    await loadGis();
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_PHOTOS_CLIENT_ID;
    if (!clientId) throw new Error('Falta configurar NEXT_PUBLIC_GOOGLE_PHOTOS_CLIENT_ID');

    return new Promise((resolve, reject) => {
        const client = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: SCOPE,
            callback: (resp: any) => {
                if (resp.error) reject(new Error(resp.error));
                else resolve(resp.access_token as string);
            },
            error_callback: (err: any) => reject(new Error(err?.message || 'Autorización cancelada')),
        });
        client.requestAccessToken();
    });
}

export interface PickerSession {
    id: string;
    pickerUri: string;
    pollingConfig?: { pollInterval?: string; timeoutIn?: string };
    mediaItemsSet?: boolean;
}

export async function createPickerSession(token: string): Promise<PickerSession> {
    const res = await fetch('https://photospicker.googleapis.com/v1/sessions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error(`No se pudo crear la sesión del selector (${res.status})`);
    return res.json();
}

export async function pollPickerSession(sessionId: string, token: string): Promise<PickerSession> {
    const res = await fetch(`https://photospicker.googleapis.com/v1/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`No se pudo consultar la sesión (${res.status})`);
    return res.json();
}

export interface PickedMediaItem {
    id: string;
    mediaFile: {
        baseUrl: string;
        mimeType: string;
        filename: string;
        mediaFileMetadata?: { width?: number; height?: number };
    };
}

export async function listPickedMediaItems(sessionId: string, token: string): Promise<PickedMediaItem[]> {
    const items: PickedMediaItem[] = [];
    let pageToken = '';
    do {
        const url = new URL('https://photospicker.googleapis.com/v1/mediaItems');
        url.searchParams.set('sessionId', sessionId);
        url.searchParams.set('pageSize', '100');
        if (pageToken) url.searchParams.set('pageToken', pageToken);
        const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`No se pudieron listar las fotos elegidas (${res.status})`);
        const data = await res.json();
        items.push(...((data.mediaItems || []) as PickedMediaItem[]));
        pageToken = data.nextPageToken || '';
    } while (pageToken);
    return items;
}

export function deletePickerSession(sessionId: string, token: string) {
    fetch(`https://photospicker.googleapis.com/v1/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    }).catch(() => { });
}

/** Descarga los bytes reales de una foto elegida. suffix '=d' = original completo. */
export async function fetchMediaBlob(baseUrl: string, token: string, suffix = '=d'): Promise<Blob> {
    const res = await fetch(`${baseUrl}${suffix}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`No se pudo descargar la imagen (${res.status})`);
    return res.blob();
}

/** Parsea duraciones tipo "3s" / "1.5s" que devuelve la API a milisegundos. */
export function parseDurationMs(s?: string, fallbackMs = 3000): number {
    if (!s) return fallbackMs;
    const n = parseFloat(s.replace('s', ''));
    return Number.isFinite(n) ? n * 1000 : fallbackMs;
}