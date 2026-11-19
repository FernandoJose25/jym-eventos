import { NextRequest, NextResponse } from 'next/server';
import { canjearCodigo, guardarTokens, infoCreador, perfil } from '@/lib/castreamTikTok';
import { castreamDb } from '@/lib/publisher';

/**
 * Paso 2: TikTok redirige a castream-app.vercel.app/api/tiktok/callback, que reenvía aquí.
 * Se canjea el código, se guarda la cuenta (destino de publicación) con sus tokens cifrados
 * y se vuelve a la app por su deep link con ?status=ok|cancelled|error.
 *
 * GET /api/publisher/tiktok/callback?code=…&state=…
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const state = q.get('state');
  if (!state) return new NextResponse('Falta state', { status: 400 });

  // El state es de un solo uso: se borra al leerlo.
  const db = castreamDb();
  const { data: fila } = await db.from('oauth_states').delete().eq('state', state).eq('provider', 'tiktok').select().maybeSingle();
  if (!fila) {
    return new NextResponse('El enlace de conexión no es válido o ya se usó. Vuelve a intentarlo desde la app.', { status: 400 });
  }

  const volver = (status: 'ok' | 'cancelled' | 'error', message?: string) => {
    const url = new URL(fila.return_to);
    url.searchParams.set('status', status);
    if (message) url.searchParams.set('message', message);
    return NextResponse.redirect(url.toString());
  };

  if (Date.now() > new Date(fila.expires_at).getTime()) {
    return volver('error', 'La conexión tardó demasiado. Vuelve a intentarlo.');
  }
  const code = q.get('code');
  if (!code) return volver(q.get('error') === 'access_denied' ? 'cancelled' : 'error', q.get('error_description') ?? undefined);

  try {
    const t = await canjearCodigo(code);
    const [yo, creador, { data: perfilApp }] = await Promise.all([
      perfil(t.access),
      infoCreador(t.access).catch(() => null), // sin video.publish no hay datos de creador
      db.from('profiles').select('business_id').eq('id', fila.user_id).single(),
    ]);
    if (!perfilApp) throw new Error('No se encontró tu perfil de CASTREAM.');

    const usuario = creador?.usuario ?? null;
    const { data: cuenta, error } = await db.from('connected_accounts').upsert({
      user_id: fila.user_id,
      business_id: perfilApp.business_id,
      provider: 'tiktok',
      page_id: t.openId,
      external_id: t.openId,
      label: usuario ? `@${usuario}` : (creador?.apodo || yo.nombre || 'TikTok'),
      page_name: creador?.apodo || yo.nombre,
      meta: { usuario, avatar: yo.avatar, scopes: t.scope.split(',') },
    }, { onConflict: 'user_id,provider,page_id' }).select('id').single();
    if (error) throw error;
    await guardarTokens(fila.user_id, cuenta.id, t);

    return volver('ok');
  } catch (e: any) {
    console.error('[publisher/tiktok/callback]', e);
    return volver('error', e.message || 'No se pudo conectar TikTok');
  }
}
