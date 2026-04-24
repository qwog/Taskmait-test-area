import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { runRules, summarize } from "@/lib/rules/engine";
import type {
  CurePlanSnapshot,
  MixDesignSnapshot,
  RuleContext,
} from "@/lib/rules/types";
import { createServerSupabase } from "@/lib/supabase/server";
import type {
  BatchTicketRow,
  JobRow,
  MixDesignRow,
  PourRow,
} from "@/lib/supabase/types";
import { cureWindow, fetchHourlyForecast } from "@/lib/weather/nws";

export const runtime = "nodejs";

const bodySchema = z.object({ pourId: z.string().uuid() });

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "pourId required" }, { status: 400 });
  }
  const { pourId } = parsed.data;
  const supabase = createServerSupabase();

  const { data: pour, error: pourErr } = await supabase
    .from("pours")
    .select("*")
    .eq("id", pourId)
    .single<PourRow>();
  if (pourErr || !pour) {
    return NextResponse.json({ error: "pour not found" }, { status: 404 });
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", pour.job_id)
    .single<JobRow>();
  if (!job) {
    return NextResponse.json({ error: "job not found" }, { status: 404 });
  }

  const { data: mix } = pour.mix_design_id
    ? await supabase
        .from("mix_designs")
        .select("*")
        .eq("id", pour.mix_design_id)
        .single<MixDesignRow>()
    : { data: null };
  if (!mix) {
    return NextResponse.json(
      { error: "mix design not set for pour" },
      { status: 400 }
    );
  }

  const { data: batchTicket } = await supabase
    .from("batch_tickets")
    .select("*")
    .eq("pour_id", pourId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<BatchTicketRow>();

  // Weather — pre-pour requires live forecast. If the job is missing coordinates,
  // we surface an actionable error rather than silently skipping weather rules.
  if (job.latitude == null || job.longitude == null) {
    return NextResponse.json(
      { error: "job is missing coordinates; cannot evaluate weather rules" },
      { status: 400 }
    );
  }

  let forecast;
  try {
    const periods = await fetchHourlyForecast(job.latitude, job.longitude);
    forecast = cureWindow(periods, new Date(pour.scheduled_at));
  } catch (err) {
    const message = err instanceof Error ? err.message : "weather unavailable";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const atPour = forecast[0];
  if (!atPour) {
    return NextResponse.json(
      { error: "no forecast for requested pour time" },
      { status: 502 }
    );
  }

  const mixSnap: MixDesignSnapshot = {
    id: mix.id,
    name: mix.name,
    cementType: mix.cement_type,
    designStrengthPsi: mix.design_strength_psi,
    wcRatio: Number(mix.wc_ratio),
    aggregateTopSizeIn: mix.aggregate_top_size_in ?? undefined,
    targetAirPctMin: mix.target_air_pct_min,
    targetAirPctMax: mix.target_air_pct_max,
    targetSlumpInMin: Number(mix.target_slump_in_min),
    targetSlumpInMax: Number(mix.target_slump_in_max),
    admixtures: mix.admixtures ?? [],
  };

  const curePlan: CurePlanSnapshot = {
    insulationPlanned: false,
    wetCurePlanned: false,
    evaporationRetarderPlanned: false,
    heatedEnclosurePlanned: false,
    minCureDurationHours: 72,
  };

  const ctx: RuleContext = {
    ambientTempF: atPour.tempF,
    humidityPct: atPour.humidityPct,
    windMph: atPour.windMph,
    mixDesign: mixSnap,
    jobType: job.job_type,
    exposureClass: job.exposure_class,
    scheduledAt: new Date(pour.scheduled_at),
    forecastCureWindow: forecast,
    curePlan,
    batchTicket: batchTicket
      ? {
          batchedAt: batchTicket.batched_at ?? undefined,
          deliveredAt: batchTicket.delivered_at ?? undefined,
          hasRetarder: (batchTicket.admixtures ?? []).some((a) =>
            /retarder/i.test(a.type ?? a.name)
          ),
        }
      : undefined,
  };

  const evaluations = runRules(ctx);
  const summary = summarize(evaluations);

  // Append-only audit trail.
  await supabase.from("rule_evaluations").insert(
    evaluations.map((e) => ({
      pour_id: pourId,
      rule_id: e.ruleId,
      rule_version: e.ruleVersion,
      triggered: e.triggered,
      severity: e.severity,
      inputs: e.inputsSnapshot,
      output_message: e.message,
      citation: e.citation,
      mitigation: e.mitigation ?? null,
    }))
  );

  await supabase
    .from("pours")
    .update({ pre_pour_risk_level: summary.level })
    .eq("id", pourId);

  return NextResponse.json(summary);
}
