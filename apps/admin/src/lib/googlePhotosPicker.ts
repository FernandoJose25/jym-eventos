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

const SCOPE = 'https://www.googleapis.com/auth/photospicker.mediaitems.readonly openid email';
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

/** Abre el popup de consentimiento de Google y devuelve un access_token temporal (dura ~1h, sin persistencia). */
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

/**
 * Abre el popup de consentimiento de Google usando el flujo de "código de
 * autorización" (a diferencia de getGooglePhotosToken, que solo da un
 * access_token temporal). Este código se manda al backend, que lo cambia
 * por un refresh_token — así la sesión queda guardada de forma persistente,
 * sin volver a pedir login la próxima vez.
 *
 * `forzarSelector` fuerza la pantalla de "elegir cuenta" + consentimiento,
 * necesario para conectar una cuenta ADICIONAL (si no, Google reconecta
 * automáticamente la última cuenta usada).
 */
export async function getGooglePhotosAuthCode(forzarSelector = false): Promise<string> {
    await loadGis();
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_PHOTOS_CLIENT_ID;
    if (!clientId) throw new Error('Falta configurar NEXT_PUBLIC_GOOGLE_PHOTOS_CLIENT_ID');

    return new Promise((resolve, reject) => {
        const client = window.google.accounts.oauth2.initCodeClient({
            client_id: clientId,
            scope: SCOPE,
            ux_mode: 'popup',
            access_type: 'offline',
            prompt: forzarSelector ? 'consent select_account' : 'consent',
            callback: (resp: any) => {
                if (resp.error) reject(new Error(resp.error));
                else resolve(resp.code as string);
            },
            error_callback: (err: any) => reject(new Error(err?.message || 'Autorización cancelada')),
        });
        client.requestCode();
    });
}

export interface CuentaGoogle {
    email: string;
    connectedAt: string | null;
}

/** Lista las cuentas de Google Photos ya conectadas de forma persistente. */
export async function listarCuentasGoogle(idToken: string): Promise<CuentaGoogle[]> {
    const res = await fetch('/api/google-photos/accounts', {
        headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) throw new Error('No se pudieron cargar las cuentas de Google conectadas');
    const data = await res.json();
    return data.cuentas as CuentaGoogle[];
}

/** Cambia un "code" de autorización por un refresh_token persistente guardado en el servidor. */
export async function conectarCuentaGoogle(code: string, idToken: string): Promise<{ email: string; accessToken: string }> {
    const res = await fetch('/api/google-photos/accounts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo conectar la cuenta de Google Photos');
    return { email: data.email, accessToken: data.accessToken };
}

/** Pide un access_token fresco para una cuenta ya conectada, sin mostrar ningún popup. */
export async function obtenerAccessTokenDeCuenta(email: string, idToken: string): Promise<string> {
    const res = await fetch('/api/google-photos/token', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo renovar el acceso a Google Photos');
    return data.accessToken as string;
}

/** Desconecta una cuenta: revoca el permiso en Google y la borra del servidor. */
export async function desconectarCuentaGoogle(email: string, idToken: string): Promise<void> {
    const res = await fetch(`/api/google-photos/accounts?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) throw new Error('No se pudo desconectar la cuenta');
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