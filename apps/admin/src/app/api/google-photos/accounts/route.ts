import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';
import { adminDb } from '@/lib/firebase-admin';
import { encryptToken, decryptToken } from '@/lib/googleTokenCrypto';

/**
 * Sesión persistente de Google Photos ("como iCloud"): en vez del token
 * temporal de 1 hora que da el Picker de Google por defecto, aquí usamos el
 * flujo OAuth de "código de autorización" (access_type=offline) para
 * obtener un refresh_token que NO expira hasta que el usuario presione
 * "Desconectar" (o lo revoque desde su cuenta de Google). El refresh_token
 * se guarda cifrado en Firestore, uno por cada admin (por su uid) y puede
 * haber varias cuentas de Google guardadas a la vez para poder alternar
 * entre ellas sin volver a iniciar sesión.
 *
 * Colección: googlePhotosAccounts/{adminUid}/accounts/{email}
 */

function accountsCol(uid: string) {
  return adminDb.collection('googlePhotosAccounts').doc(uid).collection('accounts');
}

function decodeIdTokenEmail(idToken: string): string | null {
  try {
    const payloadB64 = idToken.split('.')[1];
    const json = Buffer.from(payloadB64, 'base64').toString('utf8');
    const payload = JSON.parse(json);
    return typeof payload.email === 'string' ? payload.email : null;
  } catch {
    return null;
  }
}

/* ── GET: listar cuentas conectadas (sin exponer tokens) ── */
export async function GET(req: NextRequest) {
  const auth = await verifyToken(req);
  if (auth.response) return auth.response;

  const snap = await accountsCol(auth.uid).get();
  const cuentas = snap.docs.map(d => ({
    email: d.id,
    connectedAt: d.data().connectedAt || null,
  }));
  return NextResponse.json({ cuentas });
}

/* ── POST: intercambiar un "code" de Google por tokens y guardar la cuenta ── */
export async function POST(req: NextRequest) {
  const auth = await verifyToken(req);
  if (auth.response) return auth.response;

  const { code } = await req.json();
  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Falta el código de autorización' }, { status: 400 });
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_PHOTOS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_PHOTOS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Falta configurar GOOGLE_PHOTOS_CLIENT_SECRET en el servidor' }, { status: 500 });
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        // El code client de Google Identity Services en modo popup usa
        // internamente 'postmessage' como redirect_uri — no requiere que
        // esté registrado en la consola de Google Cloud.
        redirect_uri: 'postmessage',
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('[google-photos/accounts] token exchange error', tokenData);
      return NextResponse.json({ error: tokenData.error_description || 'Google rechazó la autorización' }, { status: 400 });
    }

    const { access_token, refresh_token, expires_in, id_token } = tokenData;
    if (!refresh_token) {
      // Pasa si el usuario ya había dado consentimiento antes sin 'prompt=consent'.
      return NextResponse.json({
        error: 'Google no devolvió un token persistente. Vuelve a intentar y acepta el permiso cuando te lo pida (a veces hay que elegir "Agregar otra cuenta" para forzarlo).',
      }, { status: 400 });
    }

    const email = id_token ? decodeIdTokenEmail(id_token) : null;
    if (!email) {
      return NextResponse.json({ error: 'No se pudo identificar el correo de la cuenta de Google' }, { status: 400 });
    }

    await accountsCol(auth.uid).doc(email).set({
      encRefreshToken: encryptToken(refresh_token),
      connectedAt: new Date().toISOString(),
    });

    return NextResponse.json({ email, accessToken: access_token, expiresIn: expires_in });
  } catch (e: any) {
    console.error('[google-photos/accounts] POST error', e);
    return NextResponse.json({ error: e.message || 'Error conectando la cuenta de Google Photos' }, { status: 500 });
  }
}

/* ── DELETE: desconectar una cuenta (revoca en Google + borra de Firestore) ── */
export async function DELETE(req: NextRequest) {
  const auth = await verifyToken(req);
  if (auth.response) return auth.response;

  const email = req.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ error: 'Falta el correo de la cuenta' }, { status: 400 });

  const docRef = accountsCol(auth.uid).doc(email);
  const snap = await docRef.get();
  if (snap.exists) {
    try {
      const refreshToken = decryptToken(snap.data()!.encRefreshToken);
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, { method: 'POST' });
    } catch (e) {
      // Si falla la revocación en Google igual borramos localmente para que
      // deje de aparecer como "conectada" en el panel.
      console.error('[google-photos/accounts] revoke error', e);
    }
  }
  await docRef.delete();

  return NextResponse.json({ ok: true });
}
