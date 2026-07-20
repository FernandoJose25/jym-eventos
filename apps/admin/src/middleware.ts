import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'jym_admin_session';

// Defensa en profundidad: evita que el HTML/JS de /dashboard/** se sirva a
// un visitante sin sesión (antes solo se protegía client-side en
// dashboard/layout.tsx, con el consiguiente "flash" del bundle protegido).
// No decodifica la cookie — Edge Runtime no tiene los bindings para
// verificar JWTs de Firebase Admin. La autorización real de datos sigue
// viviendo en Firestore Rules; esto solo evita servir la página de más.
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has(SESSION_COOKIE);
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
