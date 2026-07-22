import { NextRequest, NextResponse } from 'next/server';
import { estaBloqueado, registrarFallo, limpiarFallos, ipDe } from '@/lib/rateLimit';

// Freno de fuerza bruta REAL del login. A diferencia de /api/session (que
// solo corre tras una contraseña ya aceptada por Firebase), este endpoint se
// llama desde el cliente en cada intento, incluidos los fallidos, para poder
// contar los fallos y bloquear antes de dejar seguir probando claves.
//
// Acciones (campo `accion` del body):
//   'check' → ¿esta IP+correo está bloqueada? No modifica el contador.
//   'fail'  → registra un intento fallido (contraseña incorrecta).
//   'success' → login válido: limpia el contador de fallos.
//
// Nota de seguridad: este contador NO reemplaza la protección de Firebase
// Auth (auth/too-many-requests), la complementa con un umbral más estricto
// (5 fallos / 5 min por IP+correo) y bajo nuestro control.
export async function POST(req: NextRequest) {
  const { accion, email } = await req.json().catch(() => ({}));
  const correo = String(email || '').toLowerCase().trim();
  const ip = ipDe(req);

  if (!correo) {
    return NextResponse.json({ error: 'Falta correo' }, { status: 400 });
  }

  if (accion === 'check') {
    const estado = await estaBloqueado(ip, correo);
    if (estado.bloqueado) {
      return NextResponse.json(
        { bloqueado: true, error: 'Demasiados intentos. Espera unos minutos.' },
        { status: 429, headers: { 'Retry-After': String(estado.retryAfterSeconds) } }
      );
    }
    return NextResponse.json({ bloqueado: false });
  }

  if (accion === 'fail') {
    await registrarFallo(ip, correo);
    return NextResponse.json({ ok: true });
  }

  if (accion === 'success') {
    await limpiarFallos(ip, correo);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
}
