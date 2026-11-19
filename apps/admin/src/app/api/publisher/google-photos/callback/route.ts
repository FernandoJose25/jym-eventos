import { NextRequest, NextResponse } from 'next/server';
import { googleApp, googleRedirectUri } from '@/lib/castreamGoogle';
import { encryptToken } from '@/lib/googleTokenCrypto';
import { castreamDb } from '@/lib/publisher';

/**
 * Google vuelve aquí tras el permiso. Se canjea el código por el refresh token, se
 * registra (o actualiza) la cuenta en connected_accounts y se vuelve a la app con
 * ?status=ok|cancelled|error.
 *
 * GET /api/publisher/google-photos/callback?code=…&state=…
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const state = q.get('state');
  if (!state) return new NextResponse('Falta state', { status: 400 });

  const db = castreamDb();
  const { data: fila } = await db.from('oauth_states').delete().eq('state', state).select().maybeSingle();
  if (!fila || fila.provider !== 'google_photos') {
    return new NextResponse('El enlace de conexión no es válido o ya se usó. Vuelve a intentarlo desde la app.', { status: 400 });
  }

  const volver = (status: 'ok' | 'cancelled' | 'error', message?: string) => {
    const url = new URL(fila.return_to);
    url.searchParams.set('status', status);
    if (message) url.searchParams.set('message', message);
    return NextResponse.redirect(url.toString());
  };

  if (Date.now() > new Date(fila.expires_at).getTime()) return volver('error', 'La conexión tardó demasiado. Vuelve a intentarlo.');
  const code = q.get('code');
  if (!code) return volver(q.get('error') === 'access_denied' ? 'cancelled' : 'error', q.get('error') ?? undefined);

  try {
    const { clientId, clientSecret } = googleApp();
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: googleRedirectUri(req.nextUrl.origin), grant_type: 'authorization_code',
      }),
    });
    const tokens = await res.json();
    if (!res.ok) throw new Error(tokens.error_description || 'Google rechazó la autorización');
    if (!tokens.refresh_token) throw new Error('Google no entregó un permiso permanente. Vuelve a intentarlo y acepta el acceso.');
    if (!String(tokens.scope || '').includes('photospicker')) {
      return volver('error', 'Falta marcar el permiso de Google Photos en la pantalla de Google.');
    }

    const claims = JSON.parse(Buffer.from(String(tokens.id_token).split('.')[1], 'base64url').toString('utf8'));
    const email: string = claims.email;
    if (!email) throw new Error('No se pudo identificar la cuenta de Google');

    const { data: perfil } = await db.from('profiles').select('business_id').eq('id', fila.user_id).single();
    if (!perfil) throw new Error('Perfil no encontrado');

    const label = (fila.payload?.label as string) || email;
    const { data: cuenta, error } = await db.from('connected_accounts').upsert({
      user_id: fila.user_id,
      business_id: perfil.business_id,
      provider: 'google_photos',
      external_id: email,
      label,
      meta: { email },
    }, { onConflict: 'user_id,provider,external_id' }).select('id').single();
    if (error) throw error;

    const { data: secretos } = await db.from('secrets').select('google_photos_tokens').eq('user_id', fila.user_id).maybeSingle();
    const { error: errSecreto } = await db.from('secrets').upsert({
      user_id: fila.user_id,
      google_photos_tokens: { ...(secretos?.google_photos_tokens ?? {}), [cuenta.id]: encryptToken(tokens.refresh_token) },
      updated_at: new Date().toISOString(),
    });
    if (errSecreto) throw errSecreto;

    return volver('ok');
  } catch (e: any) {
    console.error('[publisher/google-photos/callback]', e);
    return volver('error', e.message || 'No se pudo conectar Google Photos');
  }
}
