import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic',
                       'video/mp4', 'video/webm', 'video/quicktime'];
const MAX_BYTES = 100 * 1024 * 1024; // 100 MB (videos)
const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20 MB (imágenes — límite de Cloudinary free es 10 MB, se comprime en cliente antes de subir)

export async function POST(req: NextRequest) {
  // 1. Verificar que el usuario está autenticado
  const auth = await verifyToken(req);
  if (auth.response) return auth.response;

  const { fileSize, fileType, folder } = await req.json();

  // 2. Validar en el servidor
  const isVideo = typeof fileType === 'string' && fileType.startsWith('video/');
  const limit = isVideo ? MAX_BYTES : MAX_IMAGE_BYTES;
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

  // 3. Generar firma válida
  const timestamp = Math.round(Date.now() / 1000);
  const safeFolder = (folder as string || 'jym').replace(/[^a-zA-Z0-9_/-]/g, '');

  const paramsToSign = `folder=${safeFolder}&timestamp=${timestamp}`;
  const signature = createHash('sha1')
    .update(paramsToSign + apiSecret)
    .digest('hex');

  return NextResponse.json({ timestamp, signature, apiKey, cloudName });
}
