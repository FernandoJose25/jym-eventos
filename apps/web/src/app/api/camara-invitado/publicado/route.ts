import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCamaraLinkByToken } from '@/lib/camaraInvitado';
import { camaraPublicadoLimiter, checkLimit } from '@/lib/rateLimit';

// Se llama justo después de que un invitado sube una foto/video, para que el
// álbum se vea actualizado al instante en la web pública en vez de esperar
// hasta 1 hora de caché ISR. No requiere secret: solo revalida rutas públicas
// y exige un token de Cámara Invitado activo.

export async function POST(req: NextRequest) {
  const { token } = await req.json().catch(() => ({}));
  if (typeof token !== 'string' || !token) {
    return NextResponse.json({ error: 'Falta token' }, { status: 400 });
  }

  const limit = await checkLimit(camaraPublicadoLimiter, token);
  if (!limit.ok) {
    return NextResponse.json({ ok: true }); // no bloqueamos al invitado, solo dejamos de revalidar de más
  }

  const link = await getCamaraLinkByToken(token);
  if (!link) return NextResponse.json({ error: 'Token inválido' }, { status: 404 });

  revalidatePath('/galeria');
  revalidatePath('/albumes');
  if (link.albumSlug) revalidatePath(`/albumes/${link.albumSlug}`);

  return NextResponse.json({ ok: true });
}
