import { NextRequest, NextResponse } from 'next/server';
import { cancelarProgramado } from '@/lib/castreamPublish';
import { verifyAppUser } from '@/lib/publisher';

/** Cancela una publicación programada (borra sus archivos). POST { postId } */
export async function POST(req: NextRequest) {
  const auth = await verifyAppUser(req);
  if (auth.response) return auth.response;

  const { postId } = await req.json().catch(() => ({}));
  const ok = await cancelarProgramado(auth.uid, String(postId ?? ''));
  if (!ok) return NextResponse.json({ error: 'Esta publicación ya no está programada.' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
