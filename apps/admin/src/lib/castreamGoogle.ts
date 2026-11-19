import { decryptToken } from './googleTokenCrypto';
import { castreamDb } from './publisher';

/**
 * Google Photos para CASTREAM (server-only). Usa el cliente OAuth del proyecto de Google
 * Cloud de CASTREAM (no el de J&M) y la Picker API, la única que desde 2025 deja elegir
 * fotos de toda la biblioteca. Cada cuenta conectada guarda su refresh token cifrado en
 * secrets.google_photos_tokens, indexado por el id de su fila en connected_accounts.
 */

export const SCOPE_FOTOS = 'https://www.googleapis.com/auth/photospicker.mediaitems.readonly openid email';
const PICKER = 'https://photospicker.googleapis.com/v1';

export function googleApp() {
  const clientId = process.env.CASTREAM_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.CASTREAM_GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Falta configurar CASTREAM_GOOGLE_CLIENT_ID y CASTREAM_GOOGLE_CLIENT_SECRET en el servidor');
  return { clientId, clientSecret };
}

/** Debe ser idéntica al pedir el permiso y al canjear el código (y estar autorizada en el cliente OAuth). */
export const googleRedirectUri = (origin: string) => `${origin}/api/publisher/google-photos/callback`;

/** El permiso ya no sirve (revocado o vencido): hay que volver a conectar la cuenta. */
export class CuentaGoogleCaida extends Error {}

/** access_token fresco (~1 h) de una cuenta conectada, a partir de su refresh token. */
export async function accessTokenDe(uid: string, accountId: string): Promise<string> {
  const { data } = await castreamDb().from('secrets').select('google_photos_tokens').eq('user_id', uid).maybeSingle();
  const cifrado = data?.google_photos_tokens?.[accountId];
  if (!cifrado) throw new CuentaGoogleCaida('Esta cuenta de Google ya no está conectada. Vuelve a conectarla.');

  const { clientId, clientSecret } = googleApp();
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      refresh_token: decryptToken(cifrado), grant_type: 'refresh_token',
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (json.error === 'invalid_grant') throw new CuentaGoogleCaida('Google retiró el permiso de esta cuenta. Vuelve a conectarla.');
    throw new Error(json.error_description || 'No se pudo renovar el acceso a Google Photos');
  }
  return json.access_token as string;
}

async function picker<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${PICKER}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error?.message || `Google Photos respondió ${res.status}`);
  return json as T;
}

export interface SesionPicker {
  id: string;
  pickerUri: string;
  mediaItemsSet?: boolean;
  pollingConfig?: { pollInterval?: string; timeoutIn?: string };
}

export const crearSesion = (token: string) => picker<SesionPicker>(token, '/sessions', { method: 'POST', body: '{}' });
export const leerSesion = (token: string, id: string) => picker<SesionPicker>(token, `/sessions/${encodeURIComponent(id)}`);
export const borrarSesion = (token: string, id: string) =>
  fetch(`${PICKER}/sessions/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});

export interface ItemElegido {
  id: string;
  type?: 'PHOTO' | 'VIDEO' | 'TYPE_UNSPECIFIED';
  mediaFile: { baseUrl: string; mimeType: string; filename: string; mediaFileMetadata?: { width?: number; height?: number } };
}

/** Una página de lo que la persona eligió en el selector de Google. */
export const listarElegidos = (token: string, sessionId: string, pageSize: number, pageToken?: string) =>
  picker<{ mediaItems?: ItemElegido[]; nextPageToken?: string }>(
    token,
    `/mediaItems?${new URLSearchParams({ sessionId, pageSize: String(pageSize), ...(pageToken ? { pageToken } : {}) })}`,
  );

/** "=d" descarga la foto original; "=dv" el video original. Los baseUrl caducan a la hora. */
export async function descargarElegido(token: string, item: ItemElegido): Promise<Buffer> {
  const video = item.type === 'VIDEO' || item.mediaFile.mimeType.startsWith('video/');
  const res = await fetch(`${item.mediaFile.baseUrl}${video ? '=dv' : '=d'}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Google Photos devolvió ${res.status} al descargar`);
  return Buffer.from(await res.arrayBuffer());
}
