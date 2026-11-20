import { NextRequest, NextResponse } from 'next/server';
import { publicarPost, type MediaPost } from '@/lib/castreamPublish';
import { existe } from '@/lib/castreamStorage';
import { castreamDb, verifyAppUser } from '@/lib/publisher';

export const maxDuration = 60;

/**
 * Paso 2 de publicar: el teléfono terminó de subir. Se comprueba que estén todos los
 * archivos y se arranca cada red; el avance sigue en post_targets (la app lo ve en vivo).
 *
 * Si tiene hora programada en el futuro, queda en 'programado' y la publica el cron.
 * Con { ahora: true } se publica ya una que estaba programada.
 *
 * POST { postId, ahora? } → { programado, destinos: [{ id, network, status, external_url, error }] }
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAppUser(req);
  if (auth.response) return auth.response;

  const { postId, ahora } = await req.json().catch(() => ({}));
  const db = castreamDb();
  const { data: post } = await db.from('posts').select('id, status, media, scheduled_at')
    .eq('id', typeof postId === 'string' ? postId : '').eq('user_id', auth.uid).maybeSingle();
  if (!post) return NextResponse.json({ error: 'Publicación no encontrada' }, { status: 404 });
  const yaProgramada = post.status === 'programado' && ahora === true;
  if (post.status !== 'subiendo' && !yaProgramada) return NextResponse.json({ error: 'Esta publicación ya se envió' }, { status: 409 });
  const destinosDe = async () => (await db.from('post_targets')
    .select('id, network, account_label, status, external_url, error').eq('post_id', post.id)).data ?? [];

  try {
    const faltan = (await Promise.all((post.media as MediaPost[]).map(async m => (await existe(m.key) ? null : m.key)))).filter(Boolean);
    if (faltan.length) return NextResponse.json({ error: 'Algún archivo no terminó de subir. Vuelve a intentarlo.' }, { status: 409 });

    if (!yaProgramada && post.scheduled_at && new Date(post.scheduled_at).getTime() > Date.now()) {
      await db.from('posts').update({ status: 'programado' }).eq('id', post.id);
      return NextResponse.json({ programado: true, destinos: await destinosDe() });
    }
    if (yaProgramada) {
      const { data: tomada } = await db.from('posts').update({ status: 'publicando' })
        .eq('id', post.id).eq('status', 'programado').select('id').maybeSingle();
      if (!tomada) return NextResponse.json({ error: 'Esta publicación ya se envió' }, { status: 409 });
    }
    await publicarPost(post.id);
    return NextResponse.json({ programado: false, destinos: await destinosDe() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'No se pudo publicar' }, { status: 500 });
  }
}
