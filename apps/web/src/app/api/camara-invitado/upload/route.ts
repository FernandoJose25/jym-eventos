// apps/web/src/app/api/camara-invitado/upload/route.ts
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getCamaraLinkByToken } from '@/lib/camaraInvitado';
import { camaraSignLimiter, checkLimit } from '@/lib/rateLimit';
import { adminStorage } from '@/lib/firebase-admin';

// Ya no recibe el archivo — Vercel limita el body de una función serverless
// a ~4.5 MB, y un video de invitado puede pesar hasta 40 MB. En vez de eso,
// esta ruta valida todo (token, álbum activo, tipo/tamaño, rate limit) y
// devuelve una URL firmada de Google Cloud Storage; el celular del invitado
// sube el archivo DIRECTO a esa URL (fuera de Vercel), y recién después el
// cliente confirma en Firestore. El servidor nunca toca los bytes, pero la
// URL solo se emite tras pasar las mismas validaciones que antes.
//
// La URL firmada incluye x-goog-acl:public-read en la firma — el cliente
// debe mandar ese mismo header en el PUT para que el objeto quede público
// desde el momento en que se crea (si no, la foto sube pero no carga en la
// web, 403 al leer).
//
// Todo el handler va envuelto en try/catch: si algo revienta (Storage,
// Upstash), el invitado siempre recibe JSON con un mensaje real en vez de
// un 500 crudo que el cliente no puede parsear.
//
// REQUIERE: CORS configurado en el bucket para aceptar PUT desde el dominio
// público (ver nota al final del archivo con el comando gsutil).

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/webm', 'video/quicktime'];
const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_VIDEO_BYTES = 40 * 1024 * 1024; // 40 MB (~15s de video de celular)

const EXT_BY_TYPE: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
};

export async function POST(req: NextRequest) {
    try {
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
        if (typeof fileType !== 'string' || !ALLOWED_TYPES.includes(fileType)) {
            return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 });
        }

        const ext = EXT_BY_TYPE[fileType] || 'bin';
        const path = `invitados/${link.albumId}/${Date.now()}-${randomUUID()}.${ext}`;

        const bucket = adminStorage.bucket();
        const [uploadUrl] = await bucket.file(path).getSignedUrl({
            version: 'v4',
            action: 'write',
            // 10 min de margen: celular con datos móviles lentos subiendo un video de 40 MB.
            expires: Date.now() + 10 * 60 * 1000,
            contentType: fileType,
            extensionHeaders: { 'x-goog-acl': 'public-read' },
        });

        // Mismo formato de URL pública que usa el resto de la app para Storage
        // (ver next.config.ts: bucket con lectura pública vía storage.googleapis.com).
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${path}`;

        return NextResponse.json({
            uploadUrl,
            contentType: fileType,
            url: publicUrl,
            albumId: link.albumId,
            albumTipoEvento: link.albumTipoEvento,
            tipo: isVideo ? 'video' : 'imagen',
        });
    } catch (e) {
        console.error('[camara-invitado/upload] Error:', e);
        return NextResponse.json(
            { error: 'No se pudo autorizar la subida. Intenta de nuevo.' },
            { status: 500 }
        );
    }
}
