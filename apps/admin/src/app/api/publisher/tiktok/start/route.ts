import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { urlAutorizacion } from '@/lib/castreamTikTok';
import { RETURN_SCHEMES, castreamDb, verifyAppUser } from '@/lib/publisher';

const STATE_TTL_MS = 10 * 60 * 1000;

/**
 * Paso 1 de conectar TikTok: la app pide la URL de autorización. El `state` ata el login de
 * TikTok a esta cuenta y dice a qué deep link volver; el canje del código ocurre en el
 * servidor, así que los tokens de TikTok nunca llegan al teléfono.
 *
 * POST /api/publisher/tiktok/start  { returnTo: "castream://tiktok" }
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAppUser(req);
  if (auth.response) return auth.response;

  const { returnTo } = await req.json().catch(() => ({}));
  if (typeof returnTo !== 'string' || !RETURN_SCHEMES.some(s => returnTo.startsWith(s))) {
    return NextResponse.json({ error: 'returnTo inválido' }, { status: 400 });
  }

  try {
    const state = randomBytes(24).toString('base64url');
    const url = urlAutorizacion(state);
    const { error } = await castreamDb().from('oauth_states').insert({
      state,
      user_id: auth.uid,
      provider: 'tiktok',
      return_to: returnTo,
      expires_at: new Date(Date.now() + STATE_TTL_MS).toISOString(),
    });
    if (error) throw error;
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'No se pudo iniciar la conexión con TikTok' }, { status: 500 });
  }
}
