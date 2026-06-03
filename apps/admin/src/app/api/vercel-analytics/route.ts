import { NextResponse } from 'next/server';

const TOKEN   = process.env.VERCEL_API_TOKEN;
const PROJ_ID = process.env.VERCEL_PROJECT_ID;
const TEAM_ID = process.env.VERCEL_TEAM_ID;

function periodToRange(period: string) {
  const now  = Date.now();
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  return { from: now - days * 86_400_000, to: now };
}

async function vFetch(path: string, qs: URLSearchParams, token: string) {
  const url = `https://vercel.com/api${path}?${qs}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return { _error: res.status, _url: url };
  return res.json();
}

export async function GET(req: Request) {
  if (!TOKEN || !PROJ_ID) return NextResponse.json({ configured: false });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || '7d';
  const { from, to } = periodToRange(period);

  const base = new URLSearchParams({
    projectId:   PROJ_ID,
    from:        String(from),
    to:          String(to),
    filter:      '{}',
    environment: 'production',
    ...(TEAM_ID ? { teamId: TEAM_ID } : {}),
  });

  const [timeseries, paths, devices, browsers, countries, os] = await Promise.allSettled([
    vFetch('/web/insights/timeseries',  base, TOKEN),
    vFetch('/web/insights/stats/path',  new URLSearchParams({ ...Object.fromEntries(base), limit: '10' }), TOKEN),
    vFetch('/web/insights/stats/device',  base, TOKEN),
    vFetch('/web/insights/stats/browser', base, TOKEN),
    vFetch('/web/insights/stats/country', base, TOKEN),
    vFetch('/web/insights/stats/os',      base, TOKEN),
  ]);

  const ts     = timeseries.status === 'fulfilled' ? timeseries.value : null;
  const tsData: any[] = Array.isArray(ts?.data) ? ts.data : [];

  /* Vercel timeseries: cada item tiene { key: "YYYY-MM-DD", total: N, devices?: {...} } */
  const totalPageViews = tsData.reduce((s: number, d: any) => s + (d.total ?? d.pageViews ?? 0), 0);

  /* Visitantes únicos: Vercel puede devolverlos en un campo "visitors" o no devolverlos */
  const totalVisitors  = tsData.reduce((s: number, d: any) => s + (d.visitors ?? d.uniques ?? 0), 0);

  const pvChart  = tsData.map((d: any) => ({ key: d.key, value: d.total ?? d.pageViews ?? 0 }));
  const visChart = tsData.map((d: any) => ({ key: d.key, value: d.visitors ?? d.uniques ?? 0 }));

  const pick = (r: PromiseSettledResult<any>) =>
    r.status === 'fulfilled' ? r.value : null;

  return NextResponse.json({
    configured:  true,
    pageViews:   { total: totalPageViews, data: pvChart  },
    visitors:    { total: totalVisitors,  data: visChart },
    topPaths:    pick(paths),
    devices:     pick(devices),
    browsers:    pick(browsers),
    countries:   pick(countries),
    os:          pick(os),
    /* incluir raw para diagnóstico */
    _raw: { timeseries: ts },
  });
}
