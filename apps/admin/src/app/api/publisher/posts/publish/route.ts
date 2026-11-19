import { NextRequest, NextResponse } from 'next/server';
import { publicarPost, type MediaPost } from '@/lib/castreamPublish';
import { existe } from '@/lib/castreamStorage';
import { castreamDb, verifyAppUser } from '@/lib/publisher';

export const maxDuration = 60;

/**
 * Paso 2 de publicar: el teléfono terminó de subir. Se comprueba que estén todos los
 * archivos y se arranca cada red; el avance sigue en post_targets (la app lo ve en vivo).
 *
 * POST { postId } → { destinos: [{ id, network, status, external_url, error }] }
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAppUser(req);
  if (auth.response) return auth.response;

  const { postId } = await req.json().catch(() => ({}));
  const db = castreamDb();
  const { data: post } = await db.from('posts').select('id, status, media')
    .eq('id', typeof postId === 'string' ? postId : '').eq('user_id', auth.uid).maybeSingle();
  if (!post) return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 });
  if (post.status !== 'subiendo') return NextResponse.json({ error: 'Esta publicación ya se envió' }, { status: 409 });

  try {
    const faltan = (await Promise.all((post.media as MediaPost[]).map(async m => (await existe(m.key) ? null : m.key)))).filter(Boolean);
    if (faltan.length) return NextResponse.json({ error: 'Algún archivo no terminó de subir. Vuelve a intentarlo.' }, { status: 409 });

    await publicarPost(post.id);
    const { data: destinos } = await db.from('post_targets')
      .select('id, network, account_label, status, external_url, error').eq('post_id', post.id);
    return NextResponse.json({ destinos });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'No se pudo publicar' }, { status: 500 });
  }
}
