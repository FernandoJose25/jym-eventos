import { NextRequest, NextResponse } from 'next/server';
import { guardarTokens, revocar, tokenTikTok } from '@/lib/castreamTikTok';
import { decryptToken } from '@/lib/googleTokenCrypto';
import { castreamDb, verifyAppUser } from '@/lib/publisher';

/**
 * Desconecta una cuenta de Google Photos, un álbum de iCloud o una cuenta de TikTok.
 * Revoca el permiso en Google/TikTok y borra el token; lo ya importado se queda en la
 * galería (sin origen).
 *
 * DELETE /api/publisher/accounts?id=…
 */
export async function DELETE(req: NextRequest) {
  const auth = await verifyAppUser(req);
  if (auth.response) return auth.response;

  const db = castreamDb();
  const id = req.nextUrl.searchParams.get('id');
  const { data: cuenta } = await db.from('connected_accounts').select('id, provider')
    .eq('id', id ?? '').eq('user_id', auth.uid).in('provider', ['google_photos', 'icloud', 'tiktok']).maybeSingle();
  if (!cuenta) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });

  if (cuenta.provider === 'tiktok') {
    const token = await tokenTikTok(auth.uid, cuenta.id).catch(() => null);
    if (token) await revocar(token);
    await guardarTokens(auth.uid, cuenta.id, null);
  }

  if (cuenta.provider === 'google_photos') {
    const { data: secretos } = await db.from('secrets').select('google_photos_tokens').eq('user_id', auth.uid).maybeSingle();
    const { [cuenta.id]: cifrado, ...resto } = secretos?.google_photos_tokens ?? {};
    if (cifrado) {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(decryptToken(cifrado))}`, { method: 'POST' })
        .catch(() => {}); // si Google no responde, igual se borra aquí
      await db.from('secrets').update({ google_photos_tokens: resto, updated_at: new Date().toISOString() }).eq('user_id', auth.uid);
    }
  }

  const { error } = await db.from('connected_accounts').delete().eq('id', cuenta.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
