import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { QcRecord, type QcRecordData } from "@/lib/pdf/QcRecord";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabase();

  const { data: pour } = await supabase
    .from("pours")
    .select(
      "id, org_id, scheduled_at, jobs(client_name, address, job_type, exposure_class), mix_designs(name, cement_type, design_strength_psi, wc_ratio), organizations(name, logo_url)"
    )
    .eq("id", params.id)
    .single();
  if (!pour) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [events, tests, rules, weather] = await Promise.all([
    supabase
      .from("pour_logs")
      .select("timestamp, event_type")
      .eq("pour_id", params.id)
      .order("timestamp"),
    supabase
      .from("quality_tests")
      .select("test_type, value, unit, result_status")
      .eq("pour_id", params.id),
    supabase
      .from("rule_evaluations")
      .select("triggered, severity, output_message, citation, rule_id")
      .eq("pour_id", params.id),
    supabase
      .from("weather_snapshots")
      .select("temp_f, humidity_pct, wind_mph, evaporation_rate_lbft2hr")
      .eq("pour_id", params.id)
      .order("timestamp")
      .limit(1)
      .maybeSingle(),
  ]);

  const j = (pour as any).jobs as {
    client_name: string;
    address: string;
    job_type: string;
    exposure_class: string;
  } | null;
  const m = (pour as any).mix_designs as {
    name: string;
    cement_type: string;
    design_strength_psi: number;
    wc_ratio: number;
  } | null;
  const org = (pour as any).organizations as {
    name: string;
    logo_url: string | null;
  } | null;

  const data: QcRecordData = {
    orgName: org?.name ?? "PourGuard",
    orgLogoUrl: org?.logo_url,
    generatedAt: new Date(),
    job: {
      clientName: j?.client_name ?? "",
      address: j?.address ?? "",
      jobType: j?.job_type ?? "",
      exposureClass: j?.exposure_class ?? "",
    },
    mix: {
      name: m?.name ?? "",
      cementType: m?.cement_type ?? "",
      designStrengthPsi: m?.design_strength_psi ?? 0,
      wcRatio: Number(m?.wc_ratio ?? 0),
    },
    weather: weather.data
      ? {
          tempF: Number(weather.data.temp_f),
          humidityPct: Number(weather.data.humidity_pct),
          windMph: Number(weather.data.wind_mph),
          evapRate: weather.data.evaporation_rate_lbft2hr
            ? Number(weather.data.evaporation_rate_lbft2hr)
            : undefined,
        }
      : null,
    events: (events.data ?? []) as Array<{ timestamp: string; event_type: string }>,
    tests: (tests.data ?? []) as Array<{
      test_type: string;
      value: number;
      unit: string;
      result_status?: string;
    }>,
    rules: (rules.data ?? []).map((r: any) => ({
      triggered: r.triggered,
      severity: r.severity,
      title: r.rule_id.replace(/_/g, " "),
      citation: r.citation ?? "",
      message: r.output_message ?? "",
    })),
    photoUrls: [],
  };

  const buffer = await renderToBuffer(QcRecord({ data }));

  // Persist to storage + update pour row.
  const path = `${pour.id}/qc_record.pdf`;
  const admin = createServiceSupabase();
  await admin.storage.from("pours").upload(path, buffer, {
    contentType: "application/pdf",
    upsert: true,
  });
  const { data: pub } = admin.storage.from("pours").getPublicUrl(path);
  await admin.from("pours").update({ pdf_url: pub.publicUrl }).eq("id", pour.id);

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="pour-${pour.id}.pdf"`,
    },
  });
}
