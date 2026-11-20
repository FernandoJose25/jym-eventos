import { NextRequest, NextResponse } from 'next/server';
import { ErrorLive, iniciarLive } from '@/lib/castreamLive';
import { verifyAppUser } from '@/lib/publisher';

// A las dos redes puede esperar a que Upstream apague un stream que quedó abierto.
export const maxDuration = 60;

/**
 * Crea la transmisión: el Live de Facebook en la Página y, si va también a TikTok, prepara
 * Upstream para repartir la señal. Devuelve la URL a la que el celular manda la señal.
 *
 * POST { cuentaFacebookId?, titulo, tiktok?: { servidor, clave, usuario? } } → { sesionId, ingesta, facebookUrl }
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAppUser(req);
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => ({}));
  const tiktok = body.tiktok && typeof body.tiktok === 'object'
    ? { servidor: String(body.tiktok.servidor ?? ''), clave: String(body.tiktok.clave ?? ''), usuario: String(body.tiktok.usuario ?? '') }
    : null;

  try {
    return NextResponse.json(await iniciarLive(auth.uid, auth.businessId, {
      cuentaFacebookId: typeof body.cuentaFacebookId === 'string' ? body.cuentaFacebookId : null,
      titulo: typeof body.titulo === 'string' ? body.titulo : '',
      tiktok,
    }));
  } catch (e: any) {
    console.error('[live/start]', e);
    return NextResponse.json({ error: e.message || 'No se pudo iniciar la transmisión' }, { status: e instanceof ErrorLive ? 400 : 500 });
  }
}
