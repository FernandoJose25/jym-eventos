import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { uid, email, password } = await req.json();
    if (!uid) return NextResponse.json({ error: 'uid requerido' }, { status: 400 });

    const updates: { email?: string; password?: string } = {};
    if (email)    updates.email    = email;
    if (password) updates.password = password;

    await adminAuth.updateUser(uid, updates);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
