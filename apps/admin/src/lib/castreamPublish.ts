import sharp from 'sharp';
import { borrar, descargar, subir, urlLectura } from './castreamStorage';
import { type OpcionesTikTok, clavesTikTok, estadoTikTok, iniciarTikTok, tokenTikTok } from './castreamTikTok';
import { decryptToken } from './googleTokenCrypto';
import { GRAPH_VERSION, castreamDb, graph } from './publisher';

/**
 * Motor de publicación de CASTREAM. Cada destino (una Página de Facebook, una cuenta
 * de Instagram o de TikTok) avanza por su cuenta: pendiente → procesando → publicado |
 * borrador (bandeja de TikTok) | error.
 * Facebook e Instagram descargan el original del depósito con un enlace firmado; los
 * videos y los contenedores de Instagram se procesan en la red y se revisan con
 * avanzarPendientes() (lo llama la app mientras mira el estado y un cron cada minuto).
 * Cuando todos los destinos terminan, se borran los archivos del depósito.
 */

export interface MediaPost {
  key: string;
  type: 'image' | 'video';
  mime: string;
  size: number;
  width?: number | null;
  height?: number | null;
}

interface Post { id: string; user_id: string; caption: string; media: MediaPost[]; created_at: string; files_deleted: boolean }
interface Destino { id: string; post_id: string; user_id: string; network: 'facebook' | 'instagram' | 'tiktok'; connected_account_id: string | null; status: string; work_id: string | null; attempts: number; options: Record<string, unknown> }
interface Cuenta { page_id: string; meta: { facebookPageId?: string; usuario?: string | null } }

const FB = `https://graph.facebook.com/${GRAPH_VERSION}`;
const FB_VIDEO = `https://graph-video.facebook.com/${GRAPH_VERSION}`;
const TERMINALES = ['publicado', 'borrador', 'error'];
/** Más que esto procesando en la red se da por fallido (videos largos incluidos). */
const LIMITE_PROCESO_MS = 3 * 60 * 60 * 1000;

async function graphPost<T>(base: string, path: string, params: Record<string, string>): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error?.error_user_msg || data.error?.message || `Meta respondió ${res.status}`);
  return data as T;
}

async function graphGet<T>(base: string, path: string, params: Record<string, string>): Promise<T> {
  const res = await fetch(`${base}${path}?${new URLSearchParams(params)}`, { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error?.message || `Meta respondió ${res.status}`);
  return data as T;
}

async function tokenDePagina(uid: string, fbPageId: string): Promise<string> {
  const { data } = await castreamDb().from('secrets').select('facebook_page_tokens').eq('user_id', uid).maybeSingle();
  const cifrado = data?.facebook_page_tokens?.[fbPageId];
  if (!cifrado) throw new Error('La Página ya no está conectada: vuelve a conectarla en Facebook.');
  return decryptToken(cifrado);
}

/**
 * Id de la cuenta en la red, el token que publica y el host de la API. Instagram publica
 * con el token de la Página de Facebook a la que está vinculado (inicio de sesión unificado).
 */
async function contexto(d: Destino) {
  const { data: cuenta } = await castreamDb().from('connected_accounts')
    .select('page_id, meta').eq('id', d.connected_account_id ?? '').eq('user_id', d.user_id).maybeSingle<Cuenta>();
  if (!cuenta) throw new Error('La cuenta de destino ya no está conectada.');
  const fbPageId = d.network === 'instagram' ? cuenta.meta.facebookPageId : cuenta.page_id;
  if (!fbPageId) throw new Error('No se encontró la Página de Facebook de esta cuenta.');
  return { id: cuenta.page_id, token: await tokenDePagina(d.user_id, fbPageId), base: FB };
}

/** TikTok publica con su propio token (se renueva solo); el usuario arma el enlace al resultado. */
async function contextoTikTok(d: Destino) {
  const { data: cuenta } = await castreamDb().from('connected_accounts')
    .select('page_id, meta').eq('id', d.connected_account_id ?? '').eq('user_id', d.user_id).maybeSingle<Cuenta>();
  if (!cuenta) throw new Error('La cuenta de TikTok ya no está conectada.');
  return { token: await tokenTikTok(d.user_id, d.connected_account_id!), usuario: cuenta.meta.usuario ?? null };
}

/* ── Instagram exige JPEG, máx. 8 MB y proporción entre 4:5 y 1.91:1 ── */

const IG_MIN = 4 / 5;
const IG_MAX = 1.91;
const IG_MAX_BYTES = 8 * 1024 * 1024;
const claveIG = (key: string) => `${key}.ig.jpg`;

/**
 * Enlace de una foto que Instagram acepte. Si el original ya cumple, va tal cual; si no
 * (3:4 de iPhone, PNG, >8 MB), se genera una copia recortada al centro en JPEG de alta
 * calidad, sin bajar resolución salvo que pase el límite de peso.
 */
async function fotoParaInstagram(m: MediaPost): Promise<string> {
  const proporcion = m.width && m.height ? m.width / m.height : 1;
  if (m.mime === 'image/jpeg' && m.size <= IG_MAX_BYTES && proporcion >= IG_MIN && proporcion <= IG_MAX) {
    return urlLectura(m.key);
  }
  const original = sharp(await descargar(m.key)).rotate();
  const { width = 1080, height = 1080 } = await original.clone().metadata().then(md =>
    // .rotate() aplica la orientación EXIF: con 90°/270° se intercambian los lados.
    (md.orientation ?? 1) >= 5 ? { width: md.height, height: md.width } : { width: md.width, height: md.height });
  const p = width / height;
  const [w, h] = p < IG_MIN ? [width, Math.round(width / IG_MIN)] : p > IG_MAX ? [Math.round(height * IG_MAX), height] : [width, height];
  let jpg = await original.clone().resize({ width: w, height: h, fit: 'cover', position: 'centre' }).jpeg({ quality: 95, mozjpeg: true }).toBuffer();
  if (jpg.length > IG_MAX_BYTES) {
    jpg = await original.clone().resize({ width: Math.min(w, 2160), height: Math.round(Math.min(w, 2160) * h / w), fit: 'cover' }).jpeg({ quality: 92 }).toBuffer();
  }
  await subir(claveIG(m.key), jpg, 'image/jpeg');
  return urlLectura(claveIG(m.key));
}

/* ── Primer paso de cada red ── */

type Cambio = Partial<Pick<Destino, 'status' | 'work_id' | 'attempts'>> & { external_id?: string; external_url?: string; error?: string | null };

async function iniciar(d: Destino, post: Post): Promise<Cambio> {
  if (d.network === 'tiktok') {
    const { token } = await contextoTikTok(d);
    return { status: 'procesando', work_id: await iniciarTikTok(token, post, d.options as unknown as OpcionesTikTok) };
  }
  const { id, token, base } = await contexto(d);
  const video = post.media.find(m => m.type === 'video');

  if (d.network === 'facebook') {
    if (video) {
      const v = await graphPost<{ id: string }>(FB_VIDEO, `/${id}/videos`, { file_url: await urlLectura(video.key), description: post.caption, access_token: token });
      return { status: 'procesando', work_id: v.id };
    }
    if (post.media.length === 1) {
      const f = await graphPost<{ id: string; post_id?: string }>(FB, `/${id}/photos`, { url: await urlLectura(post.media[0].key), caption: post.caption, access_token: token });
      const pid = f.post_id ?? f.id;
      return { status: 'publicado', external_id: pid, external_url: `https://www.facebook.com/${pid}` };
    }
    // Varias fotos: se suben sin publicar y se publican juntas en una sola entrada.
    const fotos = await Promise.all(post.media.map(async m =>
      graphPost<{ id: string }>(FB, `/${id}/photos`, { url: await urlLectura(m.key), published: 'false', access_token: token })));
    const entrada = await graphPost<{ id: string }>(FB, `/${id}/feed`, {
      message: post.caption, attached_media: JSON.stringify(fotos.map(f => ({ media_fbid: f.id }))), access_token: token,
    });
    return { status: 'publicado', external_id: entrada.id, external_url: `https://www.facebook.com/${entrada.id}` };
  }

  if (d.network === 'instagram') {
    if (video) {
      const c = await graphPost<{ id: string }>(base, `/${id}/media`, {
        media_type: 'REELS', video_url: await urlLectura(video.key), caption: post.caption, share_to_feed: 'true', access_token: token,
      });
      return { status: 'procesando', work_id: c.id };
    }
    if (post.media.length === 1) {
      const c = await graphPost<{ id: string }>(base, `/${id}/media`, { image_url: await fotoParaInstagram(post.media[0]), caption: post.caption, access_token: token });
      return { status: 'procesando', work_id: c.id };
    }
    const hijos = await Promise.all(post.media.map(async m =>
      graphPost<{ id: string }>(base, `/${id}/media`, { image_url: await fotoParaInstagram(m), is_carousel_item: 'true', access_token: token })));
    const c = await graphPost<{ id: string }>(base, `/${id}/media`, {
      media_type: 'CAROUSEL', children: hijos.map(h => h.id).join(','), caption: post.caption, access_token: token,
    });
    return { status: 'procesando', work_id: c.id };
  }

  throw new Error('Red no soportada.');
}

/* ── Revisión de lo que la red sigue procesando ── */

async function avanzar(d: Destino, post: Post): Promise<Cambio | null> {
  if (Date.now() - new Date(post.created_at).getTime() > LIMITE_PROCESO_MS) {
    return { status: 'error', error: 'La red tardó demasiado en procesar el archivo.' };
  }

  if (d.network === 'tiktok') {
    const { token, usuario } = await contextoTikTok(d);
    const e = await estadoTikTok(token, d.work_id!);
    if (e.estado === 'borrador') return { status: 'borrador' };
    if (e.estado === 'error') return { status: 'error', error: e.motivo };
    if (e.estado === 'publicado') {
      // Sin id público (privado o en revisión de TikTok) se enlaza al perfil.
      const tipo = post.media.some(m => m.type === 'video') ? 'video' : 'photo';
      const perfil = usuario ? `https://www.tiktok.com/@${usuario}` : undefined;
      return {
        status: 'publicado',
        external_id: e.postId ?? d.work_id!,
        external_url: e.postId && perfil ? `${perfil}/${tipo}/${e.postId}` : perfil,
      };
    }
    return { attempts: d.attempts + 1 };
  }

  const { id, token, base } = await contexto(d);

  if (d.network === 'facebook') {
    const v = await graph<{ status?: { video_status?: string }; permalink_url?: string }>(`/${d.work_id}`, { fields: 'status,permalink_url', access_token: token });
    const estado = v.status?.video_status;
    if (estado === 'ready') return { status: 'publicado', external_id: d.work_id!, external_url: `https://www.facebook.com${v.permalink_url ?? `/${d.work_id}`}` };
    if (estado === 'error' || estado === 'upload_failed') return { status: 'error', error: 'Facebook no pudo procesar el video.' };
    return { attempts: d.attempts + 1 };
  }

  if (d.network === 'instagram') {
    const c = await graphGet<{ status_code?: string; status?: string }>(base, `/${d.work_id}`, { fields: 'status_code,status', access_token: token });
    if (c.status_code === 'FINISHED') {
      const pub = await graphPost<{ id: string }>(base, `/${id}/media_publish`, { creation_id: d.work_id!, access_token: token });
      const media = await graphGet<{ permalink?: string }>(base, `/${pub.id}`, { fields: 'permalink', access_token: token }).catch(() => ({ permalink: undefined }));
      return { status: 'publicado', external_id: pub.id, external_url: media.permalink };
    }
    if (c.status_code === 'ERROR' || c.status_code === 'EXPIRED') {
      return { status: 'error', error: `Instagram rechazó el archivo${c.status ? `: ${c.status}` : '.'}` };
    }
    return { attempts: d.attempts + 1 };
  }
  return null;
}

/* ── Orquestación ── */

const guardar = (d: Destino, cambio: Cambio) =>
  castreamDb().from('post_targets').update({ ...cambio, updated_at: new Date().toISOString() }).eq('id', d.id);

async function leerPost(postId: string): Promise<Post> {
  const { data, error } = await castreamDb().from('posts').select('id, user_id, caption, media, created_at, files_deleted').eq('id', postId).single();
  if (error) throw error;
  return data as Post;
}

/** Si todos los destinos terminaron: estado final del post y limpieza del depósito. */
async function cerrarSiTermino(post: Post) {
  const db = castreamDb();
  const { data } = await db.from('post_targets').select('status').eq('post_id', post.id);
  const estados = (data ?? []).map(t => t.status);
  if (!estados.length || estados.some(s => !TERMINALES.includes(s))) return;
  const errores = estados.filter(s => s === 'error').length;
  const status = errores === 0 ? 'terminado' : errores === estados.length ? 'error' : 'parcial';
  if (!post.files_deleted) await borrar([...post.media.flatMap(m => [m.key, claveIG(m.key)]), ...clavesTikTok(post.media)]);
  await db.from('posts').update({ status, files_deleted: true }).eq('id', post.id);
}

/** Arranca cada red del post (los archivos ya están en el depósito). */
export async function publicarPost(postId: string): Promise<void> {
  const db = castreamDb();
  await db.from('posts').update({ status: 'publicando' }).eq('id', postId);
  const post = await leerPost(postId);
  const { data } = await db.from('post_targets').select('*').eq('post_id', postId).eq('status', 'pendiente');
  await Promise.all(((data ?? []) as Destino[]).map(async d => {
    await guardar(d, { status: 'subiendo' });
    try {
      const cambio = await iniciar(d, post);
      await guardar(d, { ...cambio, error: null });
      // Las fotos de Instagram suelen quedar listas al instante: se intenta publicar ya.
      if (cambio.status === 'procesando') {
        const sig = await avanzar({ ...d, ...cambio } as Destino, post).catch(() => null);
        if (sig) await guardar(d, sig);
      }
    } catch (e: any) {
      await guardar(d, { status: 'error', error: e.message || 'No se pudo publicar' });
    }
  }));
  await cerrarSiTermino(await leerPost(postId));
}

/** Revisa lo que sigue procesando en las redes (de un usuario o de todos, para el cron). */
export async function avanzarPendientes(userId?: string): Promise<number> {
  let q = castreamDb().from('post_targets').select('*').eq('status', 'procesando').order('updated_at').limit(25);
  if (userId) q = q.eq('user_id', userId);
  const { data } = await q;
  const destinos = (data ?? []) as Destino[];
  const posts = new Map<string, Post>();
  for (const d of destinos) {
    try {
      const post = posts.get(d.post_id) ?? await leerPost(d.post_id);
      posts.set(d.post_id, post);
      const cambio = await avanzar(d, post);
      if (cambio) await guardar(d, cambio);
    } catch (e: any) {
      await guardar(d, { attempts: d.attempts + 1, error: e.message });
    }
  }
  for (const post of posts.values()) await cerrarSiTermino(post);
  return destinos.length;
}
