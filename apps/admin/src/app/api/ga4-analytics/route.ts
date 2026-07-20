import { NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

const PROPERTY_ID = process.env.GA4_PROPERTY_ID;

function getClient() {
  return new BetaAnalyticsDataClient({
    credentials: {
      client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
  });
}

function periodToDays(period: string) {
  return period === '7d' ? 7 : period === '30d' ? 30 : 90;
}

// Agrupa el nombre de canal/fuente de GA4 en algo legible para el dueño del negocio
function friendlyChannel(sourceMedium: string, channelGroup: string) {
  const s = sourceMedium.toLowerCase();
  if (s.includes('facebook') || s.includes('fb')) return 'Facebook';
  if (s.includes('instagram') || s.includes('ig')) return 'Instagram';
  if (s.includes('tiktok')) return 'TikTok';
  if (s.includes('whatsapp')) return 'WhatsApp';
  if (s.includes('google') && channelGroup.toLowerCase().includes('organic')) return 'Google (búsqueda)';
  if (channelGroup) return channelGroup;
  return sourceMedium || 'Directo';
}

export async function GET(req: Request) {
  if (!PROPERTY_ID || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL || !process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    return NextResponse.json({ configured: false });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || '7d';
  const days = periodToDays(period);
  const dateRanges = [{ startDate: `${days}daysAgo`, endDate: 'today' }];

  try {
    const client = getClient();
    const property = `properties/${PROPERTY_ID}`;

    const [totals, byDay, byPage, byDevice, byBrowser, byChannel] = await Promise.all([
      client.runReport({
        property,
        dateRanges,
        metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }, { name: 'sessions' }, { name: 'averageSessionDuration' }],
      }),
      client.runReport({
        property,
        dateRanges,
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),
      client.runReport({
        property,
        dateRanges,
        dimensions: [{ name: 'pagePathPlusQueryString' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10,
      }),
      client.runReport({
        property,
        dateRanges,
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'totalUsers' }],
        orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
      }),
      client.runReport({
        property,
        dateRanges,
        dimensions: [{ name: 'browser' }],
        metrics: [{ name: 'totalUsers' }],
        orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
        limit: 6,
      }),
      client.runReport({
        property,
        dateRanges,
        dimensions: [{ name: 'sessionSourceMedium' }, { name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10,
      }),
    ]);

    const t = totals[0].rows?.[0]?.metricValues ?? [];
    const pageViews = Number(t[0]?.value ?? 0);
    const users = Number(t[1]?.value ?? 0);
    const sessions = Number(t[2]?.value ?? 0);
    const avgDuration = Number(t[3]?.value ?? 0);

    const dayData = (byDay[0].rows ?? []).map(r => ({
      date: r.dimensionValues?.[0]?.value ?? '',
      value: Number(r.metricValues?.[0]?.value ?? 0),
    }));

    const pageData = (byPage[0].rows ?? []).map(r => ({
      name: r.dimensionValues?.[0]?.value ?? '/',
      value: Number(r.metricValues?.[0]?.value ?? 0),
    }));

    const deviceData = (byDevice[0].rows ?? []).map(r => ({
      name: r.dimensionValues?.[0]?.value ?? '?',
      value: Number(r.metricValues?.[0]?.value ?? 0),
    }));

    const browserData = (byBrowser[0].rows ?? []).map(r => ({
      name: r.dimensionValues?.[0]?.value ?? '?',
      value: Number(r.metricValues?.[0]?.value ?? 0),
    }));

    // Agrupa por canal legible (Facebook, Instagram, TikTok, Google, Directo, etc.) sumando sesiones duplicadas
    const channelMap = new Map<string, number>();
    for (const r of byChannel[0].rows ?? []) {
      const sourceMedium = r.dimensionValues?.[0]?.value ?? '';
      const channelGroup = r.dimensionValues?.[1]?.value ?? '';
      const sessions = Number(r.metricValues?.[0]?.value ?? 0);
      const label = friendlyChannel(sourceMedium, channelGroup);
      channelMap.set(label, (channelMap.get(label) ?? 0) + sessions);
    }
    const channelData = Array.from(channelMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return NextResponse.json({
      configured: true,
      totals: { pageViews, users, sessions, avgDuration },
      byDay: dayData,
      byPage: pageData,
      byDevice: deviceData,
      byBrowser: browserData,
      byChannel: channelData,
    });
  } catch (e: any) {
    return NextResponse.json({
      configured: true,
      error: true,
      message: e?.message || String(e),
    });
  }
}
