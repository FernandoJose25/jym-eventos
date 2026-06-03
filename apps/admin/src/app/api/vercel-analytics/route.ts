import { NextResponse } from 'next/server';

const TOKEN   = process.env.VERCEL_API_TOKEN;
const PROJ_ID = process.env.VERCEL_PROJECT_ID;
const TEAM_ID = process.env.VERCEL_TEAM_ID;

function periodToRange(period: string) {
  const now  = Date.now();
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  return { from: now - days * 86_400_000, to: now };
}

async function tryFetch(url: string, token: string) {
  try {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const text = await r.text();
    try { return { status: r.status, data: JSON.parse(text) }; }
    catch { return { status: r.status, data: text }; }
  } catch (e) {
    return { status: 0, data: String(e) };
  }
}

export async function GET(req: Request) {
  if (!TOKEN || !PROJ_ID) return NextResponse.json({ configured: false });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || '7d';
  const { from, to } = periodToRange(period);

  const teamQs = TEAM_ID ? `&teamId=${TEAM_ID}` : '';

  /* Probar múltiples variantes del endpoint — devolvemos la que funcione */
  const candidates = [
    /* Variante 1: api.vercel.com v6 (Analytics General) */
    `https://api.vercel.com/v6/analytics?projectId=${PROJ_ID}&from=${from}&to=${to}${teamQs}`,
    /* Variante 2: api.vercel.com Web Analytics */
    `https://api.vercel.com/v1/web/analytics?projectId=${PROJ_ID}&from=${from}&to=${to}${teamQs}`,
    /* Variante 3: vercel.com API v2 insights */
    `https://vercel.com/api/v2/insights?projectId=${PROJ_ID}&from=${from}&to=${to}${teamQs}`,
    /* Variante 4: vercel.com API web insights sin versión */
    `https://vercel.com/api/web/insights?projectId=${PROJ_ID}&from=${from}&to=${to}${teamQs}`,
  ];

  const probe: Record<string, any> = {};
  let found: any = null;

  for (const url of candidates) {
    const res = await tryFetch(url, TOKEN);
    const key = url.replace(`https://`, '').split('?')[0];
    probe[key] = { status: res.status, preview: typeof res.data === 'object' ? JSON.stringify(res.data).slice(0, 200) : String(res.data).slice(0, 200) };
    if (res.status === 200 && typeof res.data === 'object' && !res.data.error) {
      found = { url, data: res.data };
      break;
    }
  }

  if (!found) {
    /* Ningún endpoint funcionó — devolver diagnóstico completo */
    return NextResponse.json({
      configured: true,
      pageViews:  { total: 0, data: [] },
      visitors:   { total: 0, data: [] },
      topPaths:   null, devices: null, browsers: null, countries: null, os: null,
      _debug: { message: 'Ningún endpoint devolvió 200. Verifica el plan o el Project ID.', probe },
    });
  }

  /* Parsear la respuesta encontrada */
  const d = found.data;

  const extract = (obj: any): any[] =>
    Array.isArray(obj?.data) ? obj.data :
    Array.isArray(obj?.events) ? obj.events :
    Array.isArray(obj) ? obj : [];

  const val = (item: any) =>
    item.total ?? item.value ?? item.count ?? item.visitors ?? item.pageViews ?? item.events ?? 0;

  const ts   = d.timeseries ?? d.series ?? d;
  const rows = extract(ts);

  const pvTotal  = d.pageViews ?? d.totalPageViews ?? rows.reduce((s: number, r: any) => s + (r.pageViews ?? r.total ?? r.value ?? 0), 0);
  const visTotal = d.visitors  ?? d.totalVisitors  ?? rows.reduce((s: number, r: any) => s + (r.visitors ?? r.uniques ?? 0), 0);

  const pvChart  = rows.map((r: any) => ({ key: r.key ?? r.date ?? r.day ?? '', value: r.pageViews ?? r.total ?? r.value ?? 0 }));

  /* Stats separadas */
  const fetchStat = async (path: string) => {
    const url = `https://api.vercel.com${path}?projectId=${PROJ_ID}&from=${from}&to=${to}${teamQs}`;
    const r = await tryFetch(url, TOKEN);
    return r.status === 200 ? r.data : null;
  };

  const [paths, devices, browsers, countries, os] = await Promise.all([
    fetchStat('/v1/web/analytics/path'),
    fetchStat('/v1/web/analytics/device'),
    fetchStat('/v1/web/analytics/browser'),
    fetchStat('/v1/web/analytics/country'),
    fetchStat('/v1/web/analytics/os'),
  ]);

  return NextResponse.json({
    configured: true,
    pageViews:  { total: pvTotal, data: pvChart },
    visitors:   { total: visTotal, data: [] },
    topPaths:   paths,
    devices,
    browsers,
    countries,
    os,
    _debug: { foundUrl: found.url, probe },
  });
}
