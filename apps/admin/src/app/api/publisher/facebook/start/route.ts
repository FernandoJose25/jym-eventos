import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  GRAPH_VERSION, RETURN_SCHEMES, castreamDb, facebookApp, facebookRedirectUri, verifyAppUser,
} from '@/lib/publisher';

// Publicar en Páginas e Instagram + crear Lives. Con Facebook Login for Business
// los permisos vienen de la configuración (FACEBOOK_LOGIN_CONFIG_ID) y no del scope.
const SCOPES = [
  'pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'publish_video',
  'instagram_basic', 'instagram_content_publish',
];
const STATE_TTL_MS = 10 * 60 * 1000;

/**
 * Paso 1 de la vinculación: la app (con su sesión de Supabase) pide la URL del
 * diálogo de Facebook. El `state` ata el login de Facebook a esta cuenta y dice
 * a qué deep link volver; el canje del código ocurre en el servidor, así que el
 * token de Meta nunca llega al cliente.
 *
 * POST /api/publisher/facebook/start  { returnTo: "castream://facebook" }
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAppUser(req);
  if (auth.response) return auth.response;

  const { returnTo } = await req.json().catch(() => ({}));
  if (typeof returnTo !== 'string' || !RETURN_SCHEMES.some(s => returnTo.startsWith(s))) {
    return NextResponse.json({ error: 'returnTo inválido' }, { status: 400 });
  }

  try {
    const { appId } = facebookApp();
    const state = randomBytes(24).toString('base64url');
    const { error } = await castreamDb().from('oauth_states').insert({
      state,
      user_id: auth.uid,
      provider: 'facebook',
      return_to: returnTo,
      expires_at: new Date(Date.now() + STATE_TTL_MS).toISOString(),
    });
    if (error) throw error;

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: facebookRedirectUri(req.nextUrl.origin),
      state,
      response_type: 'code',
    });
    const configId = process.env.FACEBOOK_LOGIN_CONFIG_ID;
    if (configId) params.set('config_id', configId);
    else params.set('scope', SCOPES.join(','));

    return NextResponse.json({ url: `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params}` });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'No se pudo iniciar la vinculación' }, { status: 500 });
  }
}
