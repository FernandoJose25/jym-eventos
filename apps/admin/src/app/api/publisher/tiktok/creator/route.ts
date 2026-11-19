import { NextRequest, NextResponse } from 'next/server';
import { ErrorTikTok, infoCreador, tokenTikTok } from '@/lib/castreamTikTok';
import { castreamDb, verifyAppUser } from '@/lib/publisher';

/**
 * Lo que TikTok permite ahora a la cuenta (apodo, privacidades, interacciones, duración
 * máxima). TikTok exige mostrarlo cada vez que se prepara una publicación directa.
 *
 * GET /api/publisher/tiktok/creator?id=<connected_account_id>
 */
export async function GET(req: NextRequest) {
  const auth = await verifyAppUser(req);
  if (auth.response) return auth.response;

  const id = req.nextUrl.searchParams.get('id') ?? '';
  const { data: cuenta } = await castreamDb().from('connected_accounts').select('id')
    .eq('id', id).eq('user_id', auth.uid).eq('provider', 'tiktok').maybeSingle();
  if (!cuenta) return NextResponse.json({ error: 'Cuenta de TikTok no encontrada' }, { status: 404 });

  try {
    return NextResponse.json(await infoCreador(await tokenTikTok(auth.uid, cuenta.id)));
  } catch (e: any) {
    // Límite diario, cuenta bloqueada, token vencido…: la app muestra el motivo y no deja publicar directo.
    const status = e instanceof ErrorTikTok ? 409 : 502;
    return NextResponse.json({ error: e.message || 'No se pudo consultar TikTok' }, { status });
  }
}
