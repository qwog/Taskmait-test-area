import { WeatherSnapshot } from '@/lib/rules/types';

function parseWindMph(raw: string | null | undefined): number {
  if (!raw) return 0;
  const match = raw.match(/(\d+)(?:\s*to\s*(\d+))?\s*mph/i);
  if (!match) return 0;
  const min = Number(match[1]);
  const max = match[2] ? Number(match[2]) : min;
  return (min + max) / 2;
}

export async function getNwsForecastWindow(args: { lat: number; lng: number; at: string; userAgent: string }): Promise<WeatherSnapshot[]> {
  const point = await fetch(`https://api.weather.gov/points/${args.lat},${args.lng}`, { headers: { 'User-Agent': args.userAgent, Accept: 'application/geo+json' } });
  if (!point.ok) throw new Error(`NWS points failed: ${point.status}`);
  const pointJson = await point.json();
  const url = pointJson?.properties?.forecastHourly;
  if (!url) throw new Error('NWS points missing forecastHourly URL');

  const hourly = await fetch(url, { headers: { 'User-Agent': args.userAgent, Accept: 'application/geo+json' } });
  if (!hourly.ok) throw new Error(`NWS hourly failed: ${hourly.status}`);
  const hourlyJson = await hourly.json();

  const start = new Date(args.at);
  const minTime = new Date(start.getTime() - 72 * 60 * 60 * 1000);
  const maxTime = new Date(start.getTime() + 72 * 60 * 60 * 1000);

  return (hourlyJson?.properties?.periods ?? [])
    .map((p: any) => ({
      timestamp: p.startTime,
      tempF: Number(p.temperature),
      humidityPct: Number(p.relativeHumidity?.value ?? 0),
      windMph: parseWindMph(p.windSpeed)
    }))
    .filter((p: WeatherSnapshot) => {
      const ts = new Date(p.timestamp);
      return ts >= minTime && ts <= maxTime;
    });
}
