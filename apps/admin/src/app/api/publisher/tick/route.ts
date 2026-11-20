import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { avanzarPendientes, publicarProgramados } from '@/lib/castreamPublish';
import { verifyAppUser } from '@/lib/publisher';

export const maxDuration = 60;

const esCron = (req: NextRequest) => {
  const esperado = process.env.CASTREAM_CRON_SECRET;
  const recibido = req.headers.get('x-cron-secret');
  return !!esperado && !!recibido && recibido.length === esperado.length &&
    timingSafeEqual(Buffer.from(recibido), Buffer.from(esperado));
};

/**
 * Revisa los destinos que las redes siguen procesando (videos, contenedores de Instagram).
 * Lo llama un cron de Supabase cada minuto (header x-cron-secret: todos los usuarios, y además
 * publica las programadas cuya hora llegó) y la app mientras alguien mira el estado (solo sus
 * publicaciones).
 *
 * POST → { revisados, programados? }
 */
export async function POST(req: NextRequest) {
  if (esCron(req)) {
    const programados = await publicarProgramados();
    return NextResponse.json({ revisados: await avanzarPendientes(), programados });
  }

  const auth = await verifyAppUser(req);
  if (auth.response) return auth.response;
  return NextResponse.json({ revisados: await avanzarPendientes(auth.uid) });
}
