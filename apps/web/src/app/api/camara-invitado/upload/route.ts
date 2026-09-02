// apps/web/src/app/api/camara-invitado/upload/route.ts
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getCamaraLinkByToken } from '@/lib/camaraInvitado';
import { camaraSignLimiter, checkLimit } from '@/lib/rateLimit';
import { adminStorage } from '@/lib/firebase-admin';

// Reemplaza al viejo endpoint de firma de Cloudinary: ahora el invitado manda
// el archivo directo aquí (multipart) y el servidor lo sube a Firebase
// Storage con el Admin SDK, que ignora storage.rules (esa regla exige auth
// admin — el invitado nunca toca el bucket directo). Toda la validación que
// antes protegía la firma sigue igual: token existe, álbum activo, tipo de
// archivo permitido, tamaño, permiso de video y rate limiting.
//
// Todo el handler va envuelto en try/catch: si algo revienta (Storage,
// Firestore, Upstash), el invitado siempre recibe JSON con un mensaje real
// en vez de un 500 crudo que el cliente no puede parsear.

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
        const form = await req.formData();
        const token = form.get('token');
        const file = form.get('file');

        if (typeof token !== 'string' || !token) {
            return NextResponse.json({ error: 'Falta token' }, { status: 400 });
        }
        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'Falta el archivo a subir' }, { status: 400 });
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

        const isVideo = file.type.startsWith('video/');
        if (isVideo && !link.permiteVideo) {
            return NextResponse.json({ error: 'Este álbum no acepta videos' }, { status: 403 });
        }

        const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
        if (!file.size || file.size > limit) {
            return NextResponse.json({ error: 'Tamaño de archivo no válido' }, { status: 400 });
        }
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = EXT_BY_TYPE[file.type] || 'bin';
        const path = `invitados/${link.albumId}/${Date.now()}-${randomUUID()}.${ext}`;

        const bucket = adminStorage.bucket();
        await bucket.file(path).save(buffer, {
            contentType: file.type,
            resumable: false,
        });

        // Mismo formato de URL pública que usa el resto de la app para Storage
        // (ver next.config.ts: bucket con lectura pública vía storage.googleapis.com).
        const url = `https://storage.googleapis.com/${bucket.name}/${path}`;

        return NextResponse.json({
            url,
            albumId: link.albumId,
            albumTipoEvento: link.albumTipoEvento,
            tipo: isVideo ? 'video' : 'imagen',
        });
    } catch (e) {
        console.error('[camara-invitado/upload] Error:', e);
        return NextResponse.json(
            { error: 'No se pudo subir el archivo. Intenta de nuevo.' },
            { status: 500 }
        );
    }
}
