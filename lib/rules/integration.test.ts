/**
 * Integration-level coverage of the engine orchestration path used by
 * /api/rules/evaluate. We stub the data layer by building RuleContexts
 * directly, so the same pipeline runs end-to-end without Supabase.
 */

import { describe, expect, it } from "vitest";
import { runRules, summarize } from "./engine";
import type {
  MixDesignSnapshot,
  RuleContext,
  WeatherSnapshot,
} from "./types";

const mix: MixDesignSnapshot = {
  id: "mix-1",
  name: "flatwork",
  cementType: "Type_IL",
  designStrengthPsi: 4000,
  wcRatio: 0.44,
  targetAirPctMin: 5,
  targetAirPctMax: 7,
  targetSlumpInMin: 3,
  targetSlumpInMax: 5,
  admixtures: [{ name: "Daravair AT60", type: "air-entrainer" }],
};

function ctx(partial: Partial<RuleContext>): RuleContext {
  return {
    ambientTempF: 75,
    concreteTempF: 78,
    humidityPct: 55,
    windMph: 4,
    mixDesign: mix,
    jobType: "driveway",
    exposureClass: "F2",
    scheduledAt: new Date("2026-06-01T15:00:00Z"),
    ...partial,
  };
}

describe("integration: pre-pour evaluation pipeline", () => {
  it("green summer pour with Type I mix", () => {
    const result = summarize(
      runRules(
        ctx({
          mixDesign: { ...mix, cementType: "Type_I" },
          exposureClass: "F1",
        })
      )
    );
    expect(result.level).toBe("green");
  });

  it("yellow for Type IL flatwork on F1 — trowel-warning fires, nothing red", () => {
    const result = summarize(runRules(ctx({ exposureClass: "F1" })));
    expect(result.level).toBe("yellow");
    const triggered = result.evaluations.filter((e) => e.triggered);
    expect(triggered.map((e) => e.ruleId)).toContain("TYPEIL_TROWEL_WARNING");
  });

  it("red when hot/dry/windy + Type IL in F2 exposure with no cure plan", () => {
    const result = summarize(
      runRules(
        ctx({
          ambientTempF: 98,
          concreteTempF: 92,
          humidityPct: 25,
          windMph: 15,
        })
      )
    );
    expect(result.level).toBe("red");
    expect(result.mitigations.length).toBeGreaterThan(0);
  });

  it("propagates cure-window forecast into cold-cure rule", () => {
    const forecast: WeatherSnapshot[] = [0, 12, 24, 48, 60].map((h) => ({
      timestamp: new Date(Date.now() + h * 3_600_000).toISOString(),
      tempF: h > 24 ? 32 : 55,
      humidityPct: 60,
      windMph: 5,
      source: "forecast",
    }));
    const result = summarize(
      runRules(ctx({ forecastCureWindow: forecast }))
    );
    const fired = result.evaluations.find(
      (e) => e.ruleId === "COLD_CURE_FORECAST"
    );
    expect(fired?.triggered).toBe(true);
  });

  it("writes a complete audit record per rule — id, version, inputs, citation", () => {
    const evals = runRules(ctx({}));
    for (const e of evals) {
      expect(e.ruleId).toMatch(/^[A-Z_]+$/);
      expect(e.ruleVersion).toMatch(/^\d+\.\d+\.\d+$/);
      expect(e.citation).toMatch(/\S/);
      expect(typeof e.inputsSnapshot).toBe("object");
    }
  });
});
