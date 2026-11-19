import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-server';
import {
  CANALES, castreamDb, compararVersiones, esCanal, esVersion, type AppVersionConfig,
} from '@/lib/publisher';

/**
 * Panel Versiones (solo admin del panel). app_config guarda la versión vigente
 * por canal, que la app lee directo de Supabase; app_config_history guarda cada
 * publicación.
 */

/* ── GET: versión vigente + historial de cada canal ── */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.response) return auth.response;

  try {
    const db = castreamDb();
    const [actuales, historial] = await Promise.all([
      db.from('app_config').select('*'),
      db.from('app_config_history').select('*').order('published_at', { ascending: false }).limit(60),
    ]);
    if (actuales.error) throw actuales.error;
    if (historial.error) throw historial.error;

    const canales = CANALES.map(canal => ({
      canal,
      actual: (actuales.data as AppVersionConfig[]).find(a => a.channel === canal) ?? null,
      historial: historial.data.filter(h => h.channel === canal).slice(0, 20),
    }));
    return NextResponse.json({ canales });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'No se pudieron leer las versiones' }, { status: 500 });
  }
}

/* ── POST: publicar una versión en un canal ── */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => ({}));
  const { channel, latestVersion, minVersion, downloadUrl, forceUpdate } = body;
  const changelog: string[] = Array.isArray(body.changelog)
    ? body.changelog.map((l: unknown) => String(l).trim()).filter(Boolean)
    : [];

  if (!esCanal(channel)) return NextResponse.json({ error: 'Canal inválido' }, { status: 400 });
  if (!esVersion(latestVersion) || !esVersion(minVersion)) {
    return NextResponse.json({ error: 'Las versiones deben tener formato 1.2.3' }, { status: 400 });
  }
  if (compararVersiones(minVersion, latestVersion) > 0) {
    return NextResponse.json({ error: 'La versión mínima no puede ser mayor que la última' }, { status: 400 });
  }
  // android-play se actualiza por la API de Play, no descargando un binario.
  const url = typeof downloadUrl === 'string' ? downloadUrl.trim() : '';
  if (channel !== 'android-play' && !/^https:\/\/\S+$/.test(url)) {
    return NextResponse.json({ error: 'La URL de descarga debe empezar con https://' }, { status: 400 });
  }

  try {
    const db = castreamDb();
    const { data: previa } = await db.from('app_config').select('latest_version').eq('channel', channel).maybeSingle();
    if (previa && compararVersiones(latestVersion, previa.latest_version) < 0) {
      return NextResponse.json({ error: `La versión vigente ya es ${previa.latest_version}; publica una igual o mayor` }, { status: 400 });
    }

    const config: AppVersionConfig = {
      channel,
      latest_version: latestVersion,
      min_version: minVersion,
      changelog,
      download_url: url,
      force_update: forceUpdate === true,
      published_at: new Date().toISOString(),
    };
    const { error } = await db.from('app_config').upsert(config);
    if (error) throw error;
    // El historial es informativo: si fallara, la versión ya quedó publicada.
    await db.from('app_config_history').insert({ ...config, published_by: auth.uid });

    return NextResponse.json({ ok: true, config });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'No se pudo publicar' }, { status: 500 });
  }
}
