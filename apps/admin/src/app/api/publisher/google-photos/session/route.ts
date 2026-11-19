import { NextRequest, NextResponse } from 'next/server';
import { CuentaGoogleCaida, accessTokenDe, crearSesion, leerSesion } from '@/lib/castreamGoogle';
import { cuentaPropia } from '@/lib/castreamImport';
import { verifyAppUser } from '@/lib/publisher';

const ms = (s?: string, def = 3000) => (s ? Math.round(parseFloat(s) * 1000) || def : def);

const errorCuenta = (e: any) => NextResponse.json(
  { error: e.message || 'Error con Google Photos', reconectar: e instanceof CuentaGoogleCaida },
  { status: e instanceof CuentaGoogleCaida ? 409 : 502 },
);

/**
 * POST { accountId }            → abre una sesión del selector de Google Photos: { sessionId, pickerUri, pollMs }
 * GET  ?accountId=…&sessionId=… → { listo: true } cuando la persona terminó de elegir en Google.
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAppUser(req);
  if (auth.response) return auth.response;

  const { accountId } = await req.json().catch(() => ({}));
  const cuenta = await cuentaPropia(auth.uid, accountId, 'google_photos');
  if (!cuenta) return NextResponse.json({ error: 'Cuenta de Google Photos no encontrada' }, { status: 404 });

  try {
    const sesion = await crearSesion(await accessTokenDe(auth.uid, cuenta.id));
    return NextResponse.json({
      sessionId: sesion.id,
      // /autoclose: Google cierra su pestaña sola cuando la persona pulsa "Listo".
      pickerUri: `${sesion.pickerUri.replace(/\/$/, '')}/autoclose`,
      pollMs: ms(sesion.pollingConfig?.pollInterval),
    });
  } catch (e) {
    return errorCuenta(e);
  }
}

export async function GET(req: NextRequest) {
  const auth = await verifyAppUser(req);
  if (auth.response) return auth.response;

  const q = req.nextUrl.searchParams;
  const cuenta = await cuentaPropia(auth.uid, q.get('accountId'), 'google_photos');
  const sessionId = q.get('sessionId');
  if (!cuenta || !sessionId) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });

  try {
    const sesion = await leerSesion(await accessTokenDe(auth.uid, cuenta.id), sessionId);
    return NextResponse.json({ listo: !!sesion.mediaItemsSet });
  } catch (e) {
    return errorCuenta(e);
  }
}
