import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { verifyToken } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  const auth = await verifyToken(req);
  if (auth.response) return auth.response;

  try {
    const { uid } = await req.json();
    if (!uid) return NextResponse.json({ error: 'uid requerido' }, { status: 400 });

    // No se puede eliminar a uno mismo
    if (auth.uid === uid) {
      return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 403 });
    }

    await adminAuth.deleteUser(uid);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
