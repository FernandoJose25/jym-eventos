import sharp from 'sharp';
import type { MediaPost } from './castreamPublish';
import { descargar, subir, urlLecturaVerificada } from './castreamStorage';
import { decryptToken, encryptToken } from './googleTokenCrypto';
import { castreamDb } from './publisher';

/**
 * TikTok en CASTREAM (Login Kit + Content Posting API). Los tokens viven cifrados en
 * secrets.tiktok_tokens, uno por cuenta conectada: el de acceso dura 24 h y se renueva solo
 * con el de actualización (365 días). TikTok descarga los archivos por su cuenta desde el
 * dominio verificado de CASTREAM (PULL_FROM_URL), así que los videos no pasan por Vercel.
 *
 * Mientras TikTok no audite la app, "directo" solo publica en privado; "borrador" manda el
 * contenido a la bandeja de TikTok de la persona para que lo publique desde ahí.
 */

const API = 'https://open.tiktokapis.com/v2';
export const TIKTOK_SCOPES = ['user.info.basic', 'video.upload', 'video.publish'];
export const PRIVACIDADES = ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY'] as const;
export type Privacidad = typeof PRIVACIDADES[number];

/** Lo que la persona eligió en la app para TikTok (se guarda en post_targets.options). */
export interface OpcionesTikTok {
  modo: 'borrador' | 'directo';
  privacidad?: Privacidad;
  comentarios?: boolean;
  duo?: boolean;
  stitch?: boolean;
  marcaPropia?: boolean;
  patrocinado?: boolean;
}

export function tiktokApp() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) throw new Error('Falta configurar TikTok (TIKTOK_CLIENT_KEY y TIKTOK_CLIENT_SECRET) en el servidor');
  return { clientKey, clientSecret };
}

/** TikTok vuelve al dominio verificado de CASTREAM, que reenvía a este backend. */
export const tiktokRedirectUri = () => process.env.TIKTOK_REDIRECT_URI || 'https://castream-app.vercel.app/api/tiktok/callback';

export function urlAutorizacion(state: string): string {
  const q = new URLSearchParams({
    client_key: tiktokApp().clientKey,
    scope: TIKTOK_SCOPES.join(','),
    response_type: 'code',
    redirect_uri: tiktokRedirectUri(),
    state,
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${q}`;
}

/* ── Tokens ── */

export interface Tokens { access: string; refresh: string; expiresAt: number; refreshExpiresAt: number; openId: string; scope: string }

async function pedirToken(params: Record<string, string>): Promise<Tokens> {
  const { clientKey, clientSecret } = tiktokApp();
  const res = await fetch(`${API}/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_key: clientKey, client_secret: clientSecret, ...params }),
    cache: 'no-store',
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || d.error || !d.access_token) throw new Error(d.error_description || d.error || `TikTok respondió ${res.status}`);
  const ahora = Date.now();
  return {
    access: d.access_token,
    refresh: d.refresh_token,
    expiresAt: ahora + d.expires_in * 1000,
    refreshExpiresAt: ahora + d.refresh_expires_in * 1000,
    openId: d.open_id,
    scope: d.scope ?? '',
  };
}

export const canjearCodigo = (code: string) =>
  pedirToken({ grant_type: 'authorization_code', code, redirect_uri: tiktokRedirectUri() });

/** Guarda (o borra, con null) los tokens cifrados de una cuenta. */
export async function guardarTokens(uid: string, cuentaId: string, t: Tokens | null) {
  const db = castreamDb();
  const { data } = await db.from('secrets').select('tiktok_tokens').eq('user_id', uid).maybeSingle();
  const tokens: Record<string, string> = { ...(data?.tiktok_tokens ?? {}) };
  if (t) tokens[cuentaId] = encryptToken(JSON.stringify(t));
  else delete tokens[cuentaId];
  const { error } = await db.from('secrets').upsert({ user_id: uid, tiktok_tokens: tokens, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** Token de acceso vigente de una cuenta; si está por vencer, lo renueva y lo guarda. */
export async function tokenTikTok(uid: string, cuentaId: string): Promise<string> {
  const { data } = await castreamDb().from('secrets').select('tiktok_tokens').eq('user_id', uid).maybeSingle();
  const cifrado = data?.tiktok_tokens?.[cuentaId];
  if (!cifrado) throw new Error('TikTok ya no está conectado: vuelve a conectarlo en Tus redes.');
  const t: Tokens = JSON.parse(decryptToken(cifrado));
  if (t.expiresAt - Date.now() > 5 * 60 * 1000) return t.access;
  if (t.refreshExpiresAt <= Date.now()) throw new Error('La conexión con TikTok venció: vuelve a conectarla en Tus redes.');
  const nuevo = await pedirToken({ grant_type: 'refresh_token', refresh_token: t.refresh });
  await guardarTokens(uid, cuentaId, nuevo);
  return nuevo.access;
}

export async function revocar(token: string) {
  const { clientKey, clientSecret } = tiktokApp();
  await fetch(`${API}/oauth/revoke/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_key: clientKey, client_secret: clientSecret, token }),
  }).catch(() => {}); // si TikTok no responde, igual se borra aquí
}

/* ── Llamadas a la API ── */

const MENSAJES: Record<string, string> = {
  access_token_invalid: 'La conexión con TikTok venció: vuelve a conectarla en Tus redes.',
  scope_not_authorized: 'Falta un permiso de TikTok: vuelve a conectarlo y acepta todos los permisos.',
  unaudited_client_can_only_post_to_private_accounts:
    'TikTok todavía no aprueba a CASTREAM para publicar directo en cuentas públicas. Envíalo a tus borradores de TikTok.',
  spam_risk_too_many_posts: 'Llegaste al límite diario de publicaciones de TikTok. Inténtalo mañana o publica desde la app de TikTok.',
  spam_risk_user_banned_from_posting: 'TikTok no permite publicar desde esta cuenta por ahora.',
  reached_active_user_cap: 'TikTok alcanzó el límite diario de cuentas que publican con CASTREAM. Inténtalo mañana.',
  url_ownership_unverified: 'TikTok no reconoció el origen del archivo.',
  privacy_level_option_mismatch: 'Elige de nuevo quién puede ver la publicación en TikTok.',
  rate_limit_exceeded: 'TikTok recibió demasiadas solicitudes. Inténtalo en un minuto.',
};

export class ErrorTikTok extends Error {
  constructor(public code: string, message: string) { super(message); }
}

async function tiktok<T>(token: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json; charset=UTF-8' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  // Los ids de publicación son int64: se leen como texto para no perder dígitos.
  const texto = (await res.text()).replace(/([[:,]\s*)(\d{16,})(?=\s*[,\]}])/g, '$1"$2"');
  let d: { data?: T; error?: { code?: string; message?: string } } = {};
  try { d = JSON.parse(texto); } catch { /* respuesta vacía o HTML */ }
  const code = d.error?.code ?? (res.ok ? 'ok' : `http_${res.status}`);
  if (code !== 'ok') throw new ErrorTikTok(code, MENSAJES[code] ?? d.error?.message ?? `TikTok respondió ${res.status}`);
  return d.data as T;
}

export interface PerfilTikTok { openId: string; nombre: string | null; avatar: string | null }

export async function perfil(token: string): Promise<PerfilTikTok> {
  const d = await tiktok<{ user: { open_id: string; display_name?: string; avatar_url?: string } }>(
    token, '/user/info/?fields=open_id,display_name,avatar_url');
  return { openId: d.user.open_id, nombre: d.user.display_name ?? null, avatar: d.user.avatar_url ?? null };
}

/** Lo que TikTok permite a esta cuenta ahora; la app lo muestra antes de publicar directo. */
export interface Creador {
  usuario: string;
  apodo: string;
  avatar: string | null;
  privacidades: Privacidad[];
  sinComentarios: boolean;
  sinDuo: boolean;
  sinStitch: boolean;
  maxSegundos: number;
}

export async function infoCreador(token: string): Promise<Creador> {
  const d = await tiktok<{
    creator_username: string; creator_nickname: string; creator_avatar_url?: string; privacy_level_options: Privacidad[];
    comment_disabled: boolean; duet_disabled: boolean; stitch_disabled: boolean; max_video_post_duration_sec: number;
  }>(token, '/post/publish/creator_info/query/', {});
  return {
    usuario: d.creator_username,
    apodo: d.creator_nickname,
    avatar: d.creator_avatar_url ?? null,
    privacidades: d.privacy_level_options,
    sinComentarios: d.comment_disabled,
    sinDuo: d.duet_disabled,
    sinStitch: d.stitch_disabled,
    maxSegundos: d.max_video_post_duration_sec,
  };
}

/* ── Publicar ── */

const TT_MAX_BYTES = 20 * 1024 * 1024;
const claveTT = (key: string) => `${key}.tt.jpg`;
/** Copias para TikTok que hay que borrar del depósito al terminar. */
export const clavesTikTok = (media: MediaPost[]) => media.filter(m => m.type === 'image').map(m => claveTT(m.key));

/** TikTok acepta fotos JPEG o WebP de hasta 1080p y 20 MB: si el original no cumple, va una copia que sí. */
async function fotoParaTikTok(m: MediaPost): Promise<string> {
  const lados = [m.width ?? 0, m.height ?? 0];
  if (m.mime === 'image/jpeg' && m.size <= TT_MAX_BYTES && Math.min(...lados) > 0 && Math.min(...lados) <= 1080 && Math.max(...lados) <= 1920) {
    return urlLecturaVerificada(m.key);
  }
  const img = sharp(await descargar(m.key)).rotate();
  const md = await img.clone().metadata();
  // .rotate() aplica la orientación EXIF: con 90°/270° se intercambian los lados.
  const [w, h] = (md.orientation ?? 1) >= 5 ? [md.height ?? 0, md.width ?? 0] : [md.width ?? 0, md.height ?? 0];
  const vertical = h >= w;
  const jpg = await img
    .resize({ width: vertical ? 1080 : 1920, height: vertical ? 1920 : 1080, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
  await subir(claveTT(m.key), jpg, 'image/jpeg');
  return urlLecturaVerificada(claveTT(m.key));
}

/** Envía la publicación a TikTok y devuelve el publish_id para seguir su estado. */
export async function iniciarTikTok(token: string, post: { caption: string; media: MediaPost[] }, o: OpcionesTikTok): Promise<string> {
  const directo = o.modo === 'directo';
  if (directo && !(o.privacidad && PRIVACIDADES.includes(o.privacidad))) throw new Error('Elige quién puede ver la publicación en TikTok.');
  const comercial = { brand_organic_toggle: !!o.marcaPropia, brand_content_toggle: !!o.patrocinado };
  const video = post.media.find(m => m.type === 'video');

  if (video) {
    const source_info = { source: 'PULL_FROM_URL', video_url: await urlLecturaVerificada(video.key) };
    const ruta = directo ? '/post/publish/video/init/' : '/post/publish/inbox/video/init/';
    const cuerpo = directo
      ? {
        post_info: {
          title: post.caption, privacy_level: o.privacidad,
          disable_comment: !o.comentarios, disable_duet: !o.duo, disable_stitch: !o.stitch, ...comercial,
        },
        source_info,
      }
      : { source_info };
    return (await tiktok<{ publish_id: string }>(token, ruta, cuerpo)).publish_id;
  }

  const photo_images = await Promise.all(post.media.map(fotoParaTikTok));
  const d = await tiktok<{ publish_id: string }>(token, '/post/publish/content/init/', {
    media_type: 'PHOTO',
    post_mode: directo ? 'DIRECT_POST' : 'MEDIA_UPLOAD',
    post_info: directo
      ? { description: post.caption, privacy_level: o.privacidad, disable_comment: !o.comentarios, ...comercial }
      : { description: post.caption },
    source_info: { source: 'PULL_FROM_URL', photo_cover_index: 0, photo_images },
  });
  return d.publish_id;
}

const FALLOS: Record<string, string> = {
  file_format_check_failed: 'TikTok no acepta el formato del archivo.',
  duration_check_failed: 'El video dura más de lo que TikTok permite a tu cuenta.',
  frame_rate_check_failed: 'TikTok solo acepta videos de 23 a 60 cuadros por segundo.',
  picture_size_check_failed: 'TikTok no acepta el tamaño de la imagen.',
  internal: 'TikTok tuvo un problema interno. Vuelve a intentarlo.',
  video_pull_failed: 'TikTok no pudo descargar el video.',
  photo_pull_failed: 'TikTok no pudo descargar las fotos.',
  publish_cancelled: 'La publicación se canceló.',
  auth_removed: 'Quitaste el acceso de CASTREAM en TikTok: vuelve a conectarlo en Tus redes.',
  spam_risk_too_many_posts: MENSAJES.spam_risk_too_many_posts,
  spam_risk_user_banned_from_posting: MENSAJES.spam_risk_user_banned_from_posting,
  spam_risk_text: 'TikTok marcó el texto como riesgoso. Cámbialo y vuelve a intentarlo.',
  spam_risk: 'TikTok rechazó la publicación por seguridad.',
};

export type EstadoTikTok =
  | { estado: 'procesando' }
  | { estado: 'borrador' }
  | { estado: 'publicado'; postId: string | null }
  | { estado: 'error'; motivo: string };

export async function estadoTikTok(token: string, publishId: string): Promise<EstadoTikTok> {
  const d = await tiktok<{ status: string; fail_reason?: string; publicaly_available_post_id?: string[] }>(
    token, '/post/publish/status/fetch/', { publish_id: publishId });
  if (d.status === 'SEND_TO_USER_INBOX') return { estado: 'borrador' };
  if (d.status === 'PUBLISH_COMPLETE') return { estado: 'publicado', postId: d.publicaly_available_post_id?.[0] ?? null };
  if (d.status === 'FAILED') {
    return { estado: 'error', motivo: FALLOS[d.fail_reason ?? ''] ?? `TikTok no pudo publicar${d.fail_reason ? ` (${d.fail_reason})` : '.'}` };
  }
  return { estado: 'procesando' };
}
