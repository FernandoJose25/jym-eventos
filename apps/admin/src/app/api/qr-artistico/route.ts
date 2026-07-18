import { NextRequest, NextResponse } from 'next/server';
import { generarQrArtistico } from '@/lib/qrArtistico';

export const runtime = 'nodejs';

/**
 * Genera el PNG del QR "sello dorado" a partir de la URL a codificar.
 * GET /api/qr-artistico?data=<url>&size=1000
 * Público (no requiere auth): la URL codificada ya es pública por diseño
 * (es el mismo link que va impreso en el QR), y esto solo renderiza una imagen.
 */
export async function GET(req: NextRequest) {
  const data = req.nextUrl.searchParams.get('data');
  if (!data) return NextResponse.json({ error: 'Falta el parámetro "data"' }, { status: 400 });

  const sizeParam = Number(req.nextUrl.searchParams.get('size'));
  const size = Number.isFinite(sizeParam) && sizeParam > 0 ? Math.min(sizeParam, 2000) : 1000;

  try {
    const png = await generarQrArtistico(data, { size });
    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (e) {
    console.error('[qr-artistico] Error generando QR:', e);
    return NextResponse.json({ error: 'No se pudo generar el QR' }, { status: 500 });
  }
}
