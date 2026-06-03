import { NextResponse } from 'next/server';

const TOKEN   = process.env.VERCEL_API_TOKEN;
const PROJ_ID = process.env.VERCEL_PROJECT_ID;
const TEAM_ID = process.env.VERCEL_TEAM_ID;

export async function GET(req: Request) {
  if (!TOKEN || !PROJ_ID) {
    return NextResponse.json({ configured: false });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || '7d';

  const hdr  = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
  const base = 'https://api.vercel.com/v1/analytics';
  const qs   = `projectId=${PROJ_ID}&period=${period}${TEAM_ID ? `&teamId=${TEAM_ID}` : ''}`;

  try {
    const [pv, vis, paths, dev, brow, ctry] = await Promise.allSettled([
      fetch(`${base}/page-views?${qs}`,           { headers: hdr, cache: 'no-store' }).then(r => r.json()),
      fetch(`${base}/visitors?${qs}`,             { headers: hdr, cache: 'no-store' }).then(r => r.json()),
      fetch(`${base}/top-paths?${qs}&limit=10`,   { headers: hdr, cache: 'no-store' }).then(r => r.json()),
      fetch(`${base}/devices?${qs}`,              { headers: hdr, cache: 'no-store' }).then(r => r.json()),
      fetch(`${base}/browsers?${qs}`,             { headers: hdr, cache: 'no-store' }).then(r => r.json()),
      fetch(`${base}/countries?${qs}`,            { headers: hdr, cache: 'no-store' }).then(r => r.json()),
    ]);

    return NextResponse.json({
      configured: true,
      pageViews: pv.status    === 'fulfilled' ? pv.value    : null,
      visitors:  vis.status   === 'fulfilled' ? vis.value   : null,
      topPaths:  paths.status === 'fulfilled' ? paths.value : null,
      devices:   dev.status   === 'fulfilled' ? dev.value   : null,
      browsers:  brow.status  === 'fulfilled' ? brow.value  : null,
      countries: ctry.status  === 'fulfilled' ? ctry.value  : null,
    });
  } catch (err) {
    return NextResponse.json({ configured: true, error: String(err) }, { status: 500 });
  }
}
