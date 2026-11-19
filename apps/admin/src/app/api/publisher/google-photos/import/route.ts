import { NextRequest, NextResponse } from 'next/server';
import {
  CuentaGoogleCaida, accessTokenDe, borrarSesion, descargarElegido, listarElegidos,
} from '@/lib/castreamGoogle';
import { cuentaPropia, importarLote } from '@/lib/castreamImport';
import { verifyAppUser } from '@/lib/publisher';

export const maxDuration = 60;

/** Archivos por llamada: con descarga + subida, cuatro caben de sobra en el límite de la función. */
const POR_LOTE = 4;

/**
 * Importa lo elegido en el selector, un lote por llamada. La app repite con el
 * nextPageToken hasta que no venga; al terminar se cierra la sesión en Google.
 *
 * POST { accountId, sessionId, pageToken? } → { importados, omitidos, errores, nextPageToken }
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAppUser(req);
  if (auth.response) return auth.response;

  const { accountId, sessionId, pageToken } = await req.json().catch(() => ({}));
  const cuenta = await cuentaPropia(auth.uid, accountId, 'google_photos');
  if (!cuenta || typeof sessionId !== 'string') return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });

  try {
    const token = await accessTokenDe(auth.uid, cuenta.id);
    const pagina = await listarElegidos(token, sessionId, POR_LOTE, typeof pageToken === 'string' ? pageToken : undefined);
    const resultado = await importarLote(cuenta, (pagina.mediaItems ?? []).map(item => ({
      sourceId: item.id,
      filename: item.mediaFile.filename,
      tipo: item.type === 'VIDEO' || item.mediaFile.mimeType.startsWith('video/') ? 'video' : 'image',
      width: item.mediaFile.mediaFileMetadata?.width ?? null,
      height: item.mediaFile.mediaFileMetadata?.height ?? null,
      descargar: () => descargarElegido(token, item),
    })));
    if (!pagina.nextPageToken) await borrarSesion(token, sessionId);
    return NextResponse.json({ ...resultado, nextPageToken: pagina.nextPageToken ?? null });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || 'No se pudo importar', reconectar: e instanceof CuentaGoogleCaida },
      { status: e instanceof CuentaGoogleCaida ? 409 : 502 },
    );
  }
}
