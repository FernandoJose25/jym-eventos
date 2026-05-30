import { adminAuth } from './firebase-admin';
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
