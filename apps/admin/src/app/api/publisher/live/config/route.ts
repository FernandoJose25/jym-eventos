import { NextRequest, NextResponse } from 'next/server';
import { relayDisponible } from '@/lib/castreamLive';
import { verifyAppUser } from '@/lib/publisher';

/** Qué destinos de En vivo están disponibles (TikTok necesita el relay). GET /api/publisher/live/config */
export async function GET(req: NextRequest) {
  const auth = await verifyAppUser(req);
  if (auth.response) return auth.response;
  return NextResponse.json({ tiktok: relayDisponible() });
}
