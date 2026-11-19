import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { SCOPE_FOTOS, googleApp, googleRedirectUri } from '@/lib/castreamGoogle';
import { RETURN_SCHEMES, castreamDb, verifyAppUser } from '@/lib/publisher';

const STATE_TTL_MS = 10 * 60 * 1000;

/**
 * Conectar una cuenta de Google Photos (se pueden conectar varias, cada una con su
 * etiqueta). Como con Facebook, el código se canjea en el servidor y el refresh token
 * nunca llega al teléfono.
 *
 * POST /api/publisher/google-photos/start  { returnTo: "castream://google-photos", label?: "Bodas" }
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAppUser(req);
  if (auth.response) return auth.response;

  const { returnTo, label } = await req.json().catch(() => ({}));
  if (typeof returnTo !== 'string' || !RETURN_SCHEMES.some(s => returnTo.startsWith(s))) {
    return NextResponse.json({ error: 'returnTo inválido' }, { status: 400 });
  }

  try {
    const { clientId } = googleApp();
    const state = randomBytes(24).toString('base64url');
    const { error } = await castreamDb().from('oauth_states').insert({
      state,
      user_id: auth.uid,
      provider: 'google_photos',
      return_to: returnTo,
      expires_at: new Date(Date.now() + STATE_TTL_MS).toISOString(),
      payload: { label: typeof label === 'string' ? label.trim().slice(0, 40) : '' },
    });
    if (error) throw error;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: googleRedirectUri(req.nextUrl.origin),
      response_type: 'code',
      scope: SCOPE_FOTOS,
      access_type: 'offline',
      // consent: asegura el refresh token; select_account: deja sumar otra cuenta distinta.
      prompt: 'consent select_account',
      include_granted_scopes: 'true',
      state,
    });
    return NextResponse.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'No se pudo iniciar la conexión con Google' }, { status: 500 });
  }
}
