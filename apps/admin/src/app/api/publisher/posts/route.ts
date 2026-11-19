import { NextRequest, NextResponse } from 'next/server';
import { urlSubida } from '@/lib/castreamStorage';
import { castreamDb, verifyAppUser } from '@/lib/publisher';

/**
 * Paso 1 de publicar: registra la publicación con sus redes de destino y devuelve un
 * enlace de subida por archivo. El teléfono sube los originales directo al depósito
 * (sin pasar por Vercel) y luego llama a /api/publisher/posts/publish.
 *
 * POST { caption, media: [{ type, mime, size, width?, height? }], destinos: [connected_account_id] }
 *   → { postId, uploads: [{ key, url }] }
 */

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'video/mp4': 'mp4', 'video/quicktime': 'mov' };
const MAX_FOTOS = 10;
const MAX_VIDEO_BYTES = 1024 * 1024 * 1024;
const MAX_TEXTO = 2200; // límite de Instagram

interface MediaIn { type?: unknown; mime?: unknown; size?: unknown; width?: unknown; height?: unknown }

export async function POST(req: NextRequest) {
  const auth = await verifyAppUser(req);
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => ({}));
  const caption = typeof body.caption === 'string' ? body.caption : '';
  const media: MediaIn[] = Array.isArray(body.media) ? body.media : [];
  const destinos: string[] = Array.isArray(body.destinos) ? body.destinos.filter((d: unknown) => typeof d === 'string') : [];

  const malo = (error: string) => NextResponse.json({ error }, { status: 400 });
  if (caption.length > MAX_TEXTO) return malo(`El texto pasa de ${MAX_TEXTO} caracteres (límite de Instagram).`);
  if (!media.length) return malo('Elige al menos una foto o un video.');
  if (!destinos.length) return malo('Elige al menos una red.');
  const videos = media.filter(m => m.type === 'video').length;
  if (videos && media.length > 1) return malo('Un video se publica solo: no lo mezcles con otras fotos o videos.');
  if (media.length > MAX_FOTOS) return malo(`Máximo ${MAX_FOTOS} fotos por publicación.`);
  for (const m of media) {
    if (typeof m.mime !== 'string' || !EXT[m.mime]) return malo('Formato no soportado: usa fotos JPG/PNG o videos MP4/MOV.');
    if (typeof m.size !== 'number' || m.size <= 0) return malo('No se pudo leer el tamaño de un archivo.');
    if (m.type === 'video' && m.size > MAX_VIDEO_BYTES) return malo('El video pesa más de 1 GB.');
  }

  const db = castreamDb();
  const { data: cuentas } = await db.from('connected_accounts')
    .select('id, provider, label').eq('user_id', auth.uid).in('id', destinos).in('provider', ['facebook', 'instagram']);
  if (!cuentas || cuentas.length !== destinos.length) return malo('Alguna red elegida ya no está conectada.');

  const { data: post, error } = await db.from('posts').insert({ user_id: auth.uid, business_id: auth.businessId, caption }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const archivos = media.map((m, i) => ({
    key: `${auth.businessId}/${post.id}/${i}.${EXT[m.mime as string]}`,
    type: m.type === 'video' ? 'video' : 'image',
    mime: m.mime as string,
    size: m.size as number,
    width: typeof m.width === 'number' ? m.width : null,
    height: typeof m.height === 'number' ? m.height : null,
  }));

  try {
    const [uploads] = await Promise.all([
      Promise.all(archivos.map(async a => ({ key: a.key, url: await urlSubida(a.key) }))),
      db.from('posts').update({ media: archivos }).eq('id', post.id).then(r => { if (r.error) throw r.error; }),
      db.from('post_targets').insert(cuentas.map(c => ({
        post_id: post.id, user_id: auth.uid, network: c.provider, connected_account_id: c.id, account_label: c.label,
      }))).then(r => { if (r.error) throw r.error; }),
    ]);
    return NextResponse.json({ postId: post.id, uploads });
  } catch (e: any) {
    await db.from('posts').delete().eq('id', post.id);
    return NextResponse.json({ error: e.message || 'No se pudo preparar la publicación' }, { status: 500 });
  }
}
