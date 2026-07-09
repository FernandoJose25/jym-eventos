import { NextRequest, NextResponse } from 'next/server';

/**
 * Devuelve el ancho/alto REAL del video original en Cloudinary, consultando
 * la Admin API (requiere API key + secret, por eso vive en el servidor).
 * El selector de calidad del reproductor (CustomVideoPlayer) usa esto para
 * ocultar las opciones de calidad más altas que la resolución nativa del
 * archivo subido — pedir "1080p" a un video subido en 480p no lo mejora,
 * Cloudinary solo puede reducir (downscale), nunca "inventar" resolución.
 *
 * Se cachea 1 hora por URL (los videos no cambian de resolución una vez
 * subidos) para no gastar el límite de la Admin API en cada visita.
 */
export const revalidate = 3600;

function extractPublicId(url: string): string | null {
  // Ejemplo: https://res.cloudinary.com/<cloud>/video/upload/v169.../jym/foo/bar.mp4
  //  -> public_id = jym/foo/bar
  const m = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.[a-zA-Z0-9]+(?:\?.*)?$/);
  return m ? m[1] : null;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Falta el parámetro url' }, { status: 400 });
  if (!url.includes('res.cloudinary.com')) {
    return NextResponse.json({ width: null, height: null });
  }

  const publicId = extractPublicId(url);
  if (!publicId) return NextResponse.json({ width: null, height: null });

  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  if (!apiKey || !apiSecret || !cloudName) {
    // Sin credenciales configuradas en este proyecto de Vercel: no bloqueamos
    // el reproductor, simplemente no filtramos calidades (comportamiento
    // anterior — se ven todas las opciones).
    return NextResponse.json({ width: null, height: null });
  }

  try {
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    const path = publicId.split('/').map(encodeURIComponent).join('/');
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/video/upload/${path}`,
      { headers: { Authorization: `Basic ${auth}` }, next: { revalidate: 3600 } }
    );
    if (!res.ok) return NextResponse.json({ width: null, height: null });
    const data = await res.json();
    return NextResponse.json({ width: data.width ?? null, height: data.height ?? null });
  } catch (e) {
    console.error('[video-meta] error', e);
    return NextResponse.json({ width: null, height: null });
  }
}
