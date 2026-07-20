import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { loginLimiter, checkLimit, ipDe } from '@/lib/rateLimit';

const SESSION_COOKIE = 'jym_admin_session';
const EXPIRES_IN_MS = 5 * 24 * 60 * 60 * 1000; // 5 días (máximo permitido por Firebase: 14 días)

// Se llama justo después de signInWithEmailAndPassword en el cliente, para
// canjear el ID token de Firebase por una cookie httpOnly de sesión que
// middleware.ts pueda revisar en el servidor sin decodificar nada (Edge
// Runtime no tiene los bindings necesarios para verificar JWTs de Firebase).
export async function POST(req: NextRequest) {
  const { idToken, email } = await req.json().catch(() => ({}));
  if (typeof idToken !== 'string' || !idToken) {
    return NextResponse.json({ error: 'Falta idToken' }, { status: 400 });
  }

  const limitKey = `${ipDe(req)}:${String(email || '').toLowerCase().trim()}`;
  const limit = await checkLimit(loginLimiter, limitKey);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera unos minutos.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  try {
    // Vuelve a verificar el ID token del lado del servidor antes de emitir
    // la cookie — no basta con que el cliente diga "ya inicié sesión".
    await adminAuth.verifyIdToken(idToken);
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: EXPIRES_IN_MS });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: EXPIRES_IN_MS / 1000,
      path: '/',
    });
    return res;
  } catch {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
