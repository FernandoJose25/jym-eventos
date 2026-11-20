import { randomBytes } from 'crypto';
import { tokenDePagina } from './castreamPublish';
import { GRAPH_VERSION, castreamDb } from './publisher';
import { pararAmbas, prepararAmbas, upstreamDisponible } from './castreamUpstream';

/**
 * En vivo de CASTREAM. Facebook Live se crea por API en la Página (live_videos) y devuelve
 * su URL RTMPS. TikTok no tiene API de Live: la persona pega el servidor y la clave de su
 * LIVE Producer. A una sola red, el celular transmite directo; a las dos a la vez, manda una
 * sola señal a Upstream.so (servicio en línea gratuito, UPSTREAM_API_KEY), que la reparte.
 * Los comentarios de Facebook los trae tickLive() mientras la app transmite; los de TikTok los
 * lee el celular directo de Euler Stream con un pase temporal (paseChatTikTok).
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

export const relayDisponible = upstreamDisponible;

export interface PedidoLive {
  /** null: solo TikTok. */
  cuentaFacebookId: string | null;
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
  if (!p.cuentaFacebookId && !p.tiktok) throw new ErrorLive('Elige dónde transmitir.');
  const tiktokRtmp = p.tiktok ? rtmpTikTok(p.tiktok.servidor, p.tiktok.clave) : null;
  const ambas = !!p.cuentaFacebookId && !!tiktokRtmp;
  if (ambas && !upstreamDisponible()) throw new ErrorLive('Transmitir a Facebook y TikTok a la vez todavía no está configurado. Por ahora elige una sola red.');
  const titulo = p.titulo.trim().slice(0, 254) || 'En vivo';

  let facebook: { cuentaId: string; liveId: string; rtmp: string; url: string | null } | null = null;
  let ingestaAmbas: string | null = null;
  if (p.cuentaFacebookId) {
    const { data: cuenta } = await db.from('connected_accounts')
      .select('id, page_id, eligible_for_live, ineligible_reason')
      .eq('id', p.cuentaFacebookId).eq('user_id', uid).eq('provider', 'facebook').maybeSingle();
    if (!cuenta) throw new ErrorLive('La Página ya no está conectada: revísala en Tus redes.');
    if (cuenta.eligible_for_live === false) throw new ErrorLive(cuenta.ineligible_reason || 'Esta Página no puede transmitir en vivo.');
    const token = await tokenDePagina(uid, cuenta.page_id);
    const live = await fb<{ id: string; secure_stream_url?: string; stream_url?: string }>('POST', `/${cuenta.page_id}/live_videos`, {
      status: 'LIVE_NOW', title: titulo, description: titulo, access_token: token,
    });
    const rtmp = live.secure_stream_url ?? live.stream_url;
    if (!rtmp) throw new ErrorLive('Facebook no entregó la dirección para transmitir.');
    const info = await fb<{ permalink_url?: string }>('GET', `/${live.id}`, { fields: 'permalink_url', access_token: token })
      .catch(() => ({ permalink_url: undefined }));
    facebook = { cuentaId: cuenta.id, liveId: live.id, rtmp, url: info.permalink_url ? `https://www.facebook.com${info.permalink_url}` : null };

    if (ambas) {
      // Otro live a la vez de otra persona usa el único stream de Upstream; uno propio que quedó
      // abierto (la app se cerró sin terminar) se puede apagar.
      const ocupado = async () => {
        const { data } = await db.from('live_sessions').select('id').eq('relay', true).neq('status', 'terminado')
          .neq('user_id', uid).gte('created_at', new Date(Date.now() - 6 * 3600_000).toISOString()).limit(1);
        return !!data?.length;
      };
      try {
        ingestaAmbas = await prepararAmbas(rtmp, tiktokRtmp!, ocupado);
      } catch (e) {
        await fb('POST', `/${live.id}`, { end_live_video: 'true', access_token: token }).catch(() => {});
        throw new ErrorLive(e instanceof Error && e.message === 'OCUPADO'
          ? 'Ahora mismo hay otro live a Facebook y TikTok a la vez. Espera a que termine o transmite a una sola red.'
          : `No se pudo preparar la transmisión a las dos redes: ${e instanceof Error ? e.message : e}`);
      }
      await db.from('live_sessions').update({ status: 'terminado', ended_at: new Date().toISOString() })
        .eq('user_id', uid).eq('relay', true).neq('status', 'terminado');
    }
  }

  const { data: sesion, error } = await db.from('live_sessions').insert({
    user_id: uid,
    business_id: businessId,
    facebook_account_id: facebook?.cuentaId ?? null,
    facebook_live_id: facebook?.liveId ?? null,
    facebook_url: facebook?.url ?? null,
    tiktok: !!tiktokRtmp,
    tiktok_usuario: p.tiktok?.usuario?.trim().replace(/^@/, '') || null,
    titulo,
    relay: ambas,
  }).select('id').single();
  if (error) throw error;

  const ingestKey = randomBytes(18).toString('base64url');
  const { error: e2 } = await db.from('live_secrets').insert({
    session_id: sesion.id, ingest_key: ingestKey, facebook_rtmp: facebook?.rtmp ?? null, tiktok_rtmp: tiktokRtmp,
  });
  if (e2) throw e2;

  return {
    sesionId: sesion.id as string,
    // A las dos: una sola señal a Upstream. A una: directo a esa red.
    ingesta: ingestaAmbas ?? facebook?.rtmp ?? tiktokRtmp!,
    facebookUrl: facebook?.url ?? null,
  };
}

async function leerSesion(uid: string, sesionId: string) {
  const db = castreamDb();
  const { data: s } = await db.from('live_sessions')
    .select('id, status, relay, facebook_live_id, facebook_account_id, started_at').eq('id', sesionId).eq('user_id', uid).maybeSingle();
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
  if (s.status !== 'terminado' && s.relay) await pararAmbas().catch(e => console.error('[live/end] Upstream', e));
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
  // Solo TikTok: no hay nada que traer de Facebook.
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

/**
 * URL del WebSocket de Euler Stream con un pase (JWT) válido 2 minutos, solo para el @usuario
 * de esta transmisión y una conexión a la vez. El celular la usa para leer el chat de TikTok.
 */
export async function paseChatTikTok(uid: string, sesionId: string): Promise<string | null> {
  const { data: s } = await castreamDb().from('live_sessions')
    .select('tiktok_usuario, status').eq('id', sesionId).eq('user_id', uid).maybeSingle();
  if (!s) throw new ErrorLive('Transmisión no encontrada.');
  if (!s.tiktok_usuario || s.status === 'terminado') return null;
  const clave = process.env.EULER_API_KEY;
  const cuenta = process.env.EULER_ACCOUNT_ID;
  if (!clave || !cuenta) throw new ErrorLive('Falta configurar el chat de TikTok en el servidor.');
  const res = await fetch(`https://tiktok.eulerstream.com/accounts/${cuenta}/jwt/create`, {
    method: 'POST',
    headers: { 'x-api-key': clave, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      expireAfter: 120,
      name: `castream-${sesionId.slice(0, 8)}`,
      websockets: { allowedCreators: [s.tiktok_usuario], maxWebSockets: 1 },
    }),
    cache: 'no-store',
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || !d.token) throw new ErrorLive(d.message || 'No se pudo abrir el chat de TikTok.');
  return `wss://ws.eulerstream.com?uniqueId=${encodeURIComponent(s.tiktok_usuario)}&jwtKey=${encodeURIComponent(d.token)}`;
}
