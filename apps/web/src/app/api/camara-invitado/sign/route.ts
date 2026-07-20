import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getCamaraLinkByToken } from '@/lib/camaraInvitado';
import { camaraSignLimiter, checkLimit } from '@/lib/rateLimit';

// Firma pública de subidas a Cloudinary para invitados sin sesión, restringida
// a un álbum concreto. Solo firma si el token existe y su link sigue activo —
// así "apagar" el QR desde el admin corta la subida al instante, aunque el
// invitado tenga la página ya abierta en su celular.

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/webm', 'video/quicktime'];
const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_VIDEO_BYTES = 40 * 1024 * 1024; // 40 MB (~15s de video de celular)

export async function POST(req: NextRequest) {
  const { token, fileSize, fileType } = await req.json();

  if (typeof token !== 'string' || !token) {
    return NextResponse.json({ error: 'Falta token' }, { status: 400 });
  }

  const rateLimitResult = await checkLimit(camaraSignLimiter, token);
  if (!rateLimitResult.ok) {
    return NextResponse.json(
      { error: 'Demasiadas subidas seguidas. Espera un momento.' },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfterSeconds) } }
    );
  }

  const link = await getCamaraLinkByToken(token);
  if (!link || !link.activo) {
    return NextResponse.json({ error: 'Este álbum ya no está recibiendo fotos' }, { status: 403 });
  }

  const isVideo = typeof fileType === 'string' && fileType.startsWith('video/');
  if (isVideo && !link.permiteVideo) {
    return NextResponse.json({ error: 'Este álbum no acepta videos' }, { status: 403 });
  }

  const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (!fileSize || fileSize > limit) {
    return NextResponse.json({ error: 'Tamaño de archivo no válido' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(fileType)) {
    return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 });
  }

  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  if (!apiSecret || !apiKey || !cloudName) {
    return NextResponse.json({ error: 'Cloudinary no configurado en el servidor' }, { status: 500 });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = `invitados/${link.albumId}`;

  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = createHash('sha1').update(paramsToSign + apiSecret).digest('hex');

  return NextResponse.json({
    timestamp, signature, apiKey, cloudName, folder,
    albumId: link.albumId,
    albumTipoEvento: link.albumTipoEvento,
    resourceType: isVideo ? 'video' : 'image',
  });
}
