import { randomBytes } from 'crypto';
import { tokenDePagina } from './castreamPublish';
import { GRAPH_VERSION, castreamDb } from './publisher';

/**
 * En vivo de CASTREAM. Facebook Live se crea por API en la Página (live_videos) y devuelve
 * su URL RTMPS. TikTok no tiene API de Live: la persona pega el servidor y la clave de su
 * LIVE Producer. Con TikTok, el celular publica una sola señal en el relay (CASTREAM_RELAY_RTMP),
 * que la reparte a ambas redes y lee el chat de TikTok; solo con Facebook va directo.
 * Los comentarios de Facebook los trae tickLive() mientras la app transmite.
 */

const FB = `https://graph.facebook.com/${GRAPH_VERSION}`;

export class ErrorLive extends Error {}

async function fb<T>(metodo: 'GET' | 'POST', path: string, params: Record<string, string>): Promise<T> {
  const q = new URLSearchParams(params);
  const res = metodo === 'GET'
    ? await fetch(`${FB}${path}?${q}`, { cache: 'no-store' })
    : await fetch(`${FB}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: q });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new ErrorLive(data.error?.error_user_msg || data.error?.message || `Facebook respondió ${res.status}`);
  return data as T;
}

export const relayDisponible = () => !!process.env.CASTREAM_RELAY_RTMP;

export interface PedidoLive {
  cuentaFacebookId: string;
  titulo: string;
  tiktok?: { servidor: string; clave: string; usuario?: string } | null;
}

/** RTMP de TikTok a partir de lo que muestra LIVE Producer (servidor + clave). */
function rtmpTikTok(servidor: string, clave: string): string {
  const s = servidor.trim().replace(/\/+$/, '');
  const k = clave.trim().replace(/^\/+/, '');
  if (!/^rtmps?:\/\/[^/\s]+/i.test(s) || !k || /\s/.test(k)) {
    throw new ErrorLive('Revisa el servidor y la clave de TikTok: cópialos tal cual de LIVE Producer.');
  }
  return `${s}/${k}`;
}

export async function iniciarLive(uid: string, businessId: string, p: PedidoLive) {
  const db = castreamDb();
  const { data: cuenta } = await db.from('connected_accounts')
    .select('id, page_id, eligible_for_live, ineligible_reason')
    .eq('id', p.cuentaFacebookId).eq('user_id', uid).eq('provider', 'facebook').maybeSingle();
  if (!cuenta) throw new ErrorLive('La Página ya no está conectada: revísala en Tus redes.');
  if (cuenta.eligible_for_live === false) throw new ErrorLive(cuenta.ineligible_reason || 'Esta Página no puede transmitir en vivo.');

  const relay = process.env.CASTREAM_RELAY_RTMP?.replace(/\/+$/, '');
  const tiktokRtmp = p.tiktok ? rtmpTikTok(p.tiktok.servidor, p.tiktok.clave) : null;
  if (tiktokRtmp && !relay) throw new ErrorLive('Para transmitir también a TikTok falta activar el servidor de transmisión de CASTREAM.');

  const token = await tokenDePagina(uid, cuenta.page_id);
  const titulo = p.titulo.trim().slice(0, 254) || 'En vivo';
  const live = await fb<{ id: string; secure_stream_url?: string; stream_url?: string }>('POST', `/${cuenta.page_id}/live_videos`, {
    status: 'LIVE_NOW', title: titulo, description: titulo, access_token: token,
  });
  const facebookRtmp = live.secure_stream_url ?? live.stream_url;
  if (!facebookRtmp) throw new ErrorLive('Facebook no entregó la dirección para transmitir.');
  const info = await fb<{ permalink_url?: string }>('GET', `/${live.id}`, { fields: 'permalink_url', access_token: token })
    .catch(() => ({ permalink_url: undefined }));
  const facebookUrl = info.permalink_url ? `https://www.facebook.com${info.permalink_url}` : null;

  const { data: sesion, error } = await db.from('live_sessions').insert({
    user_id: uid,
    business_id: businessId,
    facebook_account_id: cuenta.id,
    facebook_live_id: live.id,
    facebook_url: facebookUrl,
    tiktok: !!tiktokRtmp,
    tiktok_usuario: p.tiktok?.usuario?.trim().replace(/^@/, '') || null,
    titulo,
    relay: !!tiktokRtmp,
  }).select('id').single();
  if (error) throw error;

  const ingestKey = randomBytes(18).toString('base64url');
  const { error: e2 } = await db.from('live_secrets').insert({
    session_id: sesion.id, ingest_key: ingestKey, facebook_rtmp: facebookRtmp, tiktok_rtmp: tiktokRtmp,
  });
  if (e2) throw e2;

  return {
    sesionId: sesion.id as string,
    // Con TikTok: una sola señal al relay; si no, directo a Facebook.
    ingesta: tiktokRtmp ? `${relay}/live/${sesion.id}?key=${ingestKey}` : facebookRtmp,
    facebookUrl,
  };
}

async function leerSesion(uid: string, sesionId: string) {
  const db = castreamDb();
  const { data: s } = await db.from('live_sessions')
    .select('id, status, facebook_live_id, facebook_account_id, started_at').eq('id', sesionId).eq('user_id', uid).maybeSingle();
  if (!s) throw new ErrorLive('Transmisión no encontrada.');
  const { data: cuenta } = await db.from('connected_accounts').select('page_id').eq('id', s.facebook_account_id ?? '').maybeSingle();
  return { s, pageId: cuenta?.page_id as string | undefined };
}

export async function terminarLive(uid: string, sesionId: string) {
  const db = castreamDb();
  const { s, pageId } = await leerSesion(uid, sesionId);
  if (s.status !== 'terminado' && s.facebook_live_id && pageId) {
    const token = await tokenDePagina(uid, pageId);
    await fb('POST', `/${s.facebook_live_id}`, { end_live_video: 'true', access_token: token })
      .catch(e => console.error('[live/end] Facebook', e)); // si ya terminó por su lado, igual se cierra aquí
  }
  await db.from('live_sessions').update({ status: 'terminado', ended_at: new Date().toISOString() }).eq('id', s.id);
  await db.from('live_secrets').delete().eq('session_id', s.id);
}

interface ComentarioFB { id: string; message?: string; created_time?: string; from?: { name?: string } }

/**
 * Mientras se transmite: marca la sesión en vivo, guarda los comentarios nuevos de Facebook
 * en el chat unido y devuelve cuántas personas miran en Facebook.
 */
export async function tickLive(uid: string, sesionId: string, conectado: boolean) {
  const db = castreamDb();
  const { s, pageId } = await leerSesion(uid, sesionId);
  if (s.status === 'terminado') return { vistas: null, errorComentarios: null, terminado: true };
  if (conectado && s.status === 'preparando') {
    await db.from('live_sessions').update({ status: 'en_vivo', started_at: new Date().toISOString() }).eq('id', s.id);
  }
  if (!s.facebook_live_id || !pageId) return { vistas: null, errorComentarios: null, terminado: false };

  const token = await tokenDePagina(uid, pageId);
  const [estado, comentarios] = await Promise.allSettled([
    fb<{ live_views?: number }>('GET', `/${s.facebook_live_id}`, { fields: 'live_views', access_token: token }),
    fb<{ data: ComentarioFB[] }>('GET', `/${s.facebook_live_id}/comments`, {
      fields: 'id,message,created_time,from{name}', order: 'reverse_chronological', live_filter: 'no_filter', limit: '50', access_token: token,
    }),
  ]);

  let errorComentarios: string | null = null;
  if (comentarios.status === 'fulfilled') {
    const nuevos = comentarios.value.data.filter(c => c.message).map(c => ({
      session_id: s.id,
      user_id: uid,
      platform: 'facebook',
      external_id: c.id,
      author: c.from?.name ?? 'Alguien en Facebook',
      message: c.message!,
      created_at: c.created_time ? new Date(c.created_time).toISOString() : undefined,
    }));
    if (nuevos.length) {
      await db.from('live_messages').upsert(nuevos, { onConflict: 'session_id,platform,external_id', ignoreDuplicates: true });
    }
  } else {
    errorComentarios = `No se pudieron leer los comentarios de Facebook: ${comentarios.reason?.message ?? 'error'}`;
  }

  return {
    vistas: estado.status === 'fulfilled' ? estado.value.live_views ?? null : null,
    errorComentarios,
    terminado: false,
  };
}
