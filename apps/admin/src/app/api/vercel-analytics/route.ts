import { NextResponse } from 'next/server';

const TOKEN   = process.env.VERCEL_API_TOKEN;
const PROJ_ID = process.env.VERCEL_PROJECT_ID;
const TEAM_ID = process.env.VERCEL_TEAM_ID;

const BASE = 'https://vercel.com/api/web/insights';

function periodToRange(period: string) {
  const now  = Date.now();
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  return { from: now - days * 86_400_000, to: now };
}

export async function GET(req: Request) {
  if (!TOKEN || !PROJ_ID) {
    return NextResponse.json({ configured: false });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || '7d';
  const { from, to } = periodToRange(period);

  const hdr = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

  const qs = new URLSearchParams({
    projectId:   PROJ_ID,
    from:        String(from),
    to:          String(to),
    environment: 'production',
    ...(TEAM_ID ? { teamId: TEAM_ID } : {}),
  });

  try {
    const [timeseries, paths, devices, browsers, countries] = await Promise.allSettled([
      fetch(`${BASE}/timeseries?${qs}`,       { headers: hdr, cache: 'no-store' }).then(r => r.json()),
      fetch(`${BASE}/stats/path?${qs}&limit=10`, { headers: hdr, cache: 'no-store' }).then(r => r.json()),
      fetch(`${BASE}/stats/device?${qs}`,     { headers: hdr, cache: 'no-store' }).then(r => r.json()),
      fetch(`${BASE}/stats/browser?${qs}`,    { headers: hdr, cache: 'no-store' }).then(r => r.json()),
      fetch(`${BASE}/stats/country?${qs}`,    { headers: hdr, cache: 'no-store' }).then(r => r.json()),
    ]);

    const ts = timeseries.status === 'fulfilled' ? timeseries.value : null;

    /* Derivar totales del timeseries */
    const tsData: { key: string; visitors: number; pageViews: number }[] =
      Array.isArray(ts?.data) ? ts.data : [];

    const totalVisitors  = tsData.reduce((s: number, d: any) => s + (d.visitors  || 0), 0);
    const totalPageViews = tsData.reduce((s: number, d: any) => s + (d.pageViews || 0), 0);

    return NextResponse.json({
      configured: true,
      visitors:  { total: totalVisitors,  data: tsData.map((d: any) => ({ key: d.key, value: d.visitors  || 0 })) },
      pageViews: { total: totalPageViews, data: tsData.map((d: any) => ({ key: d.key, value: d.pageViews || 0 })) },
      topPaths:  paths.status    === 'fulfilled' ? paths.value    : null,
      devices:   devices.status  === 'fulfilled' ? devices.value  : null,
      browsers:  browsers.status === 'fulfilled' ? browsers.value : null,
      countries: countries.status === 'fulfilled' ? countries.value : null,
    });
  } catch (err) {
    return NextResponse.json({ configured: true, error: String(err) }, { status: 500 });
  }
}
