import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { verifyToken } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  const auth = await verifyToken(req);
  if (auth.response) return auth.response;

  try {
    const { uid, email, password } = await req.json();
    if (!uid) return NextResponse.json({ error: 'uid requerido' }, { status: 400 });

    // Solo el propio usuario puede cambiar sus credenciales
    if (auth.uid !== uid) {
      return NextResponse.json({ error: 'No autorizado para modificar este usuario' }, { status: 403 });
    }

    const updates: { email?: string; password?: string } = {};
    if (email)    updates.email    = email;
    if (password) updates.password = password;

    await adminAuth.updateUser(uid, updates);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
