import { NextRequest, NextResponse } from 'next/server';
import { ErrorLive, tickLive } from '@/lib/castreamLive';
import { verifyAppUser } from '@/lib/publisher';

/**
 * La app lo llama cada pocos segundos mientras transmite: trae los comentarios nuevos de
 * Facebook al chat unido y devuelve las vistas. POST { sesionId, conectado }
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAppUser(req);
  if (auth.response) return auth.response;

  const { sesionId, conectado } = await req.json().catch(() => ({}));
  try {
    return NextResponse.json(await tickLive(auth.uid, String(sesionId ?? ''), conectado === true));
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'No se pudo revisar la transmisión' }, { status: e instanceof ErrorLive ? 400 : 500 });
  }
}
