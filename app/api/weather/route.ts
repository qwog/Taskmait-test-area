import { NextRequest, NextResponse } from 'next/server';
import { getNwsForecastWindow } from '@/lib/weather/nws';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get('lat'));
  const lng = Number(searchParams.get('lng'));
  const at = searchParams.get('at');

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !at) {
    return NextResponse.json({ error: 'lat, lng, and at are required' }, { status: 400 });
  }

  try {
    const weather = await getNwsForecastWindow({
      lat,
      lng,
      at,
      userAgent: process.env.NWS_USER_AGENT ?? 'PourGuard/1.0 (contact@pourguard.app)'
    });

    return NextResponse.json({ weather }, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600' } });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
