import { NextRequest, NextResponse } from "next/server";
import { cureWindow, fetchHourlyForecast } from "@/lib/weather/nws";

export const runtime = "nodejs";
// Re-fetch at most once per hour — NWS updates forecasts hourly.
export const revalidate = 3600;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const at = searchParams.get("at");

  if (Number.isNaN(lat) || Number.isNaN(lng) || !at) {
    return NextResponse.json(
      { error: "lat, lng, and at are required" },
      { status: 400 }
    );
  }

  try {
    const periods = await fetchHourlyForecast(lat, lng);
    const window = cureWindow(periods, new Date(at));
    return NextResponse.json({ snapshots: window });
  } catch (err) {
    const message = err instanceof Error ? err.message : "weather fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
