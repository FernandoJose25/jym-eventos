import { adminAuth, adminDb } from './firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

export async function verifyToken(req: NextRequest): Promise<
  { uid: string; response?: never } | { uid?: never; response: NextResponse }
> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    return { response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) };
  }
  try {
    const decoded = await adminAuth.verifyIdToken(header.slice(7));
    return { uid: decoded.uid };
  } catch {
    return { response: NextResponse.json({ error: 'Token inválido' }, { status: 401 }) };
  }
}

// Para rutas que solo puede ejecutar un usuario con rol 'admin' en Firestore
// (usuarios/{uid}.rol) — verifyToken por sí solo solo confirma que hay una
// sesión válida, no que esa cuenta tenga privilegios de administrador.
export async function requireAdmin(req: NextRequest): Promise<
  { uid: string; response?: never } | { uid?: never; response: NextResponse }
> {
  const auth = await verifyToken(req);
  if (auth.response) return auth;

  const snap = await adminDb.collection('usuarios').doc(auth.uid).get();
  if (snap.data()?.rol !== 'admin') {
    return { response: NextResponse.json({ error: 'Requiere rol de administrador' }, { status: 403 }) };
  }
  return { uid: auth.uid };
}
