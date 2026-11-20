import { NextRequest, NextResponse } from 'next/server';
import { ErrorLive, paseChatTikTok } from '@/lib/castreamLive';
import { verifyAppUser } from '@/lib/publisher';

/**
 * Pase temporal para leer el chat de TikTok desde el celular (Euler Stream), sin entregarle
 * la clave de la cuenta. POST { sesionId } → { url } (null si la transmisión no va a TikTok)
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAppUser(req);
  if (auth.response) return auth.response;

  const { sesionId } = await req.json().catch(() => ({}));
  try {
    return NextResponse.json({ url: await paseChatTikTok(auth.uid, String(sesionId ?? '')) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'No se pudo abrir el chat de TikTok' }, { status: e instanceof ErrorLive ? 400 : 500 });
  }
}
