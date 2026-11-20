import { NextRequest, NextResponse } from 'next/server';
import { ErrorLive, terminarLive } from '@/lib/castreamLive';
import { verifyAppUser } from '@/lib/publisher';

/** Termina el Live de Facebook y cierra la sesión (y apaga Upstream si iba a las dos redes). POST { sesionId } */
export async function POST(req: NextRequest) {
  const auth = await verifyAppUser(req);
  if (auth.response) return auth.response;

  const { sesionId } = await req.json().catch(() => ({}));
  try {
    await terminarLive(auth.uid, String(sesionId ?? ''));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'No se pudo terminar la transmisión' }, { status: e instanceof ErrorLive ? 400 : 500 });
  }
}
