/**
 * Thin wrapper around the National Weather Service API.
 * NWS requires a descriptive User-Agent identifying the application.
 * Docs: https://www.weather.gov/documentation/services-web-api
 */

import type { WeatherSnapshot } from "@/lib/rules/types";

const USER_AGENT =
  process.env.NWS_USER_AGENT ?? "PourGuard/1.0 (contact@pourguard.app)";

interface NwsHourlyPeriod {
  startTime: string;
  temperature: number;
  temperatureUnit: "F" | "C";
  relativeHumidity?: { value: number | null };
  windSpeed: string; // e.g. "10 mph" or "5 to 15 mph"
  windDirection?: string;
}

async function nwsFetch(url: string): Promise<Response> {
  return fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/geo+json" },
    // Revalidate hourly; Vercel/Next will cache at the edge.
    next: { revalidate: 3600 },
  });
}

export function parseWindMph(windSpeed: string): number {
  // "10 mph" -> 10 ; "5 to 15 mph" -> 10 (mid-point)
  const parts = windSpeed.match(/(\d+)(?:\s*to\s*(\d+))?/i);
  if (!parts) return 0;
  const lo = Number(parts[1]);
  const hi = parts[2] ? Number(parts[2]) : lo;
  return (lo + hi) / 2;
}

export async function fetchHourlyForecast(
  latitude: number,
  longitude: number
): Promise<NwsHourlyPeriod[]> {
  const pointsUrl = `https://api.weather.gov/points/${latitude.toFixed(
    4
  )},${longitude.toFixed(4)}`;
  const pointsRes = await nwsFetch(pointsUrl);
  if (!pointsRes.ok) {
    throw new Error(`NWS /points failed: ${pointsRes.status}`);
  }
  const points = (await pointsRes.json()) as {
    properties: { forecastHourly: string };
  };
  const hourlyRes = await nwsFetch(points.properties.forecastHourly);
  if (!hourlyRes.ok) {
    throw new Error(`NWS /forecast/hourly failed: ${hourlyRes.status}`);
  }
  const hourly = (await hourlyRes.json()) as {
    properties: { periods: NwsHourlyPeriod[] };
  };
  return hourly.properties.periods;
}

export function toSnapshot(period: NwsHourlyPeriod): WeatherSnapshot {
  const tempF =
    period.temperatureUnit === "F"
      ? period.temperature
      : (period.temperature * 9) / 5 + 32;
  return {
    timestamp: period.startTime,
    tempF,
    humidityPct: period.relativeHumidity?.value ?? 50,
    windMph: parseWindMph(period.windSpeed),
    source: "forecast",
  };
}

/**
 * Filter the forecast to the 72-hour cure window starting at `at`.
 * Returns snapshots ordered chronologically.
 */
export function cureWindow(
  periods: NwsHourlyPeriod[],
  at: Date,
  hours = 72
): WeatherSnapshot[] {
  const start = at.getTime();
  const end = start + hours * 3_600_000;
  return periods
    .map(toSnapshot)
    .filter((s) => {
      const t = new Date(s.timestamp).getTime();
      return t >= start && t <= end;
    })
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
}
