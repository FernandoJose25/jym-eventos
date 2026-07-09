import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';
import { adminDb } from '@/lib/firebase-admin';
import { decryptToken } from '@/lib/googleTokenCrypto';

/**
 * Dado el correo de una cuenta de Google Photos ya conectada, usa su
 * refresh_token guardado para pedirle a Google un access_token fresco
 * (dura ~1h) SIN volver a mostrar el popup de login. Esto es lo que
 * mantiene la sesión "siempre iniciada" entre visitas al panel.
 */
export async function POST(req: NextRequest) {
  const auth = await verifyToken(req);
  if (auth.response) return auth.response;

  const { email } = await req.json();
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Falta el correo de la cuenta' }, { status: 400 });
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_PHOTOS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_PHOTOS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Falta configurar GOOGLE_PHOTOS_CLIENT_SECRET en el servidor' }, { status: 500 });
  }

  const docRef = adminDb.collection('googlePhotosAccounts').doc(auth.uid).collection('accounts').doc(email);
  const snap = await docRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: 'Esa cuenta no está conectada' }, { status: 404 });
  }

  try {
    const refreshToken = decryptToken(snap.data()!.encRefreshToken);
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      // invalid_grant = el usuario revocó el acceso desde su cuenta de Google
      // (o el refresh token expiró porque la app de OAuth sigue en modo
      // "Testing" en Google Cloud Console). Borramos la cuenta guardada para
      // que el panel la vuelva a pedir en vez de fallar en silencio.
      if (data.error === 'invalid_grant') await docRef.delete();
      console.error('[google-photos/token] refresh error', data);
      return NextResponse.json({ error: data.error_description || 'La sesión de Google expiró, vuelve a conectar la cuenta' }, { status: 401 });
    }

    return NextResponse.json({ accessToken: data.access_token, expiresIn: data.expires_in });
  } catch (e: any) {
    console.error('[google-photos/token] POST error', e);
    return NextResponse.json({ error: e.message || 'Error renovando el acceso a Google Photos' }, { status: 500 });
  }
}
