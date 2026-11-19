import { NextRequest, NextResponse } from 'next/server';
import { encryptToken } from '@/lib/googleTokenCrypto';
import { castreamDb, facebookApp, facebookRedirectUri, graph } from '@/lib/publisher';

/**
 * Paso 2: Facebook redirige aquí tras el login. Se canjea el código por un
 * token de usuario de larga duración (~60 días), se guarda cifrado en
 * secrets y se vuelve a la app por su deep link con ?status=ok|cancelled|error.
 *
 * GET /api/publisher/facebook/callback?code=…&state=…
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const state = q.get('state');
  if (!state) return new NextResponse('Falta state', { status: 400 });

  // El state es de un solo uso: se borra al leerlo.
  const db = castreamDb();
  const { data: fila } = await db.from('oauth_states').delete().eq('state', state).select().maybeSingle();
  if (!fila) {
    return new NextResponse('El enlace de vinculación no es válido o ya se usó. Vuelve a intentarlo desde la app.', { status: 400 });
  }

  const volver = (status: 'ok' | 'cancelled' | 'error', message?: string) => {
    const url = new URL(fila.return_to);
    url.searchParams.set('status', status);
    if (message) url.searchParams.set('message', message);
    return NextResponse.redirect(url.toString());
  };

  if (Date.now() > new Date(fila.expires_at).getTime()) {
    return volver('error', 'La vinculación tardó demasiado. Vuelve a intentarlo.');
  }
  const code = q.get('code');
  if (!code) return volver(q.get('error') === 'access_denied' ? 'cancelled' : 'error', q.get('error_description') ?? undefined);

  try {
    const { appId, appSecret } = facebookApp();
    const corto = await graph<{ access_token: string }>('/oauth/access_token', {
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: facebookRedirectUri(req.nextUrl.origin),
      code,
    });
    const largo = await graph<{ access_token: string; expires_in?: number }>('/oauth/access_token', {
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: corto.access_token,
    });
    const yo = await graph<{ id: string; name: string }>('/me', { fields: 'id,name', access_token: largo.access_token });

    const { error } = await db.from('secrets').upsert({
      user_id: fila.user_id,
      facebook_user_token: encryptToken(largo.access_token),
      facebook_user_id: yo.id,
      facebook_user_name: yo.name,
      facebook_token_expires_at: largo.expires_in ? new Date(Date.now() + largo.expires_in * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;

    return volver('ok');
  } catch (e: any) {
    console.error('[publisher/facebook/callback]', e);
    return volver('error', e.message || 'No se pudo vincular Facebook');
  }
}
