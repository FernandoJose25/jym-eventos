import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';
import { contactoLimiter, checkLimit, ipDe } from '@/lib/rateLimit';

const ContactoSchema = z.object({
  nombre: z.string().trim().min(2).max(100),
  telefono: z.string().trim().min(6).max(30),
  correo: z.string().trim().email().max(150),
  distrito: z.string().trim().max(100).optional().default(''),
  tipoEvento: z.string().trim().max(100).optional().default(''),
  fechaEvento: z.string().trim().max(20).optional().default(''),
  invitados: z.string().trim().max(50).optional().default(''),
  presupuesto: z.string().trim().max(50).optional().default(''),
  mensaje: z.string().trim().max(2000).optional().default(''),
  // Honeypot: campo oculto que solo un bot que autorellena inputs completa.
  _web: z.string().optional().default(''),
});

export async function POST(req: NextRequest) {
  const limit = await checkLimit(contactoLimiter, ipDe(req));
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = ContactoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }
  const { _web, ...form } = parsed.data;

  // Honeypot relleno → probablemente un bot. Respondemos éxito falso para
  // no delatar que fue detectado, pero no creamos el documento.
  if (_web) {
    return NextResponse.json({ ok: true });
  }

  const now = new Date();
  const fechaLegible = now.toLocaleString('es-PE', {
    timeZone: 'America/Lima', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const origen = req.headers.get('referer')
    ? new URL(req.headers.get('referer')!).pathname
    : '/contacto';

  await adminDb.collection('mensajes').add({
    ...form,
    fechaEnvio: now.toISOString(),
    fechaLegible,
    estado: 'pendiente',
    leido: false,
    origen,
  });

  try {
    await fetch(`${req.nextUrl.origin}/api/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, fechaLegible }),
    });
  } catch {
    // Best effort — igual que el comportamiento anterior, un fallo de
    // notificación no debe impedir confirmar el envío al usuario.
  }

  return NextResponse.json({ ok: true });
}
