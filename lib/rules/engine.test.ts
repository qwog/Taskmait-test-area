import { describe, expect, it } from "vitest";
import { runRules, summarize } from "./engine";
import type { MixDesignSnapshot, RuleContext } from "./types";

const mix: MixDesignSnapshot = {
  id: "mix-1",
  name: "4000 psi flatwork",
  cementType: "Type_I",
  designStrengthPsi: 4000,
  wcRatio: 0.45,
  targetAirPctMin: 5,
  targetAirPctMax: 7,
  targetSlumpInMin: 3,
  targetSlumpInMax: 5,
  admixtures: [],
};

const baseCtx: RuleContext = {
  ambientTempF: 72,
  concreteTempF: 75,
  humidityPct: 60,
  windMph: 5,
  mixDesign: mix,
  jobType: "driveway",
  exposureClass: "F1",
  scheduledAt: new Date(),
};

describe("runRules", () => {
  it("returns all green under benign conditions", () => {
    const evals = runRules(baseCtx);
    const summary = summarize(evals);
    expect(summary.level).toBe("green");
    expect(summary.evaluations.every((e) => !e.triggered)).toBe(true);
  });

  it("returns red for severe hot conditions", () => {
    const summary = summarize(
      runRules({
        ...baseCtx,
        ambientTempF: 100,
        concreteTempF: 98,
        humidityPct: 20,
        windMph: 15,
      })
    );
    expect(summary.level).toBe("red");
    expect(summary.mitigations.length).toBeGreaterThan(0);
  });

  it("flags yellow for Type IL flatwork even when all else is fine", () => {
    const summary = summarize(
      runRules({
        ...baseCtx,
        mixDesign: { ...mix, cementType: "Type_IL" },
      })
    );
    expect(summary.level).toBe("yellow");
    expect(
      summary.evaluations.some(
        (e) => e.ruleId === "TYPEIL_TROWEL_WARNING" && e.triggered
      )
    ).toBe(true);
  });

  it("red wins over yellow in severity aggregation", () => {
    const summary = summarize(
      runRules({
        ...baseCtx,
        mixDesign: { ...mix, cementType: "Type_IL", designStrengthPsi: 2500 },
      })
    );
    expect(summary.level).toBe("red");
  });

  it("skips rules whose inputs are missing without throwing", () => {
    const { batchTicket: _bt, ...ctxNoBatch } = { ...baseCtx, batchTicket: undefined };
    const evals = runRules(ctxNoBatch);
    // DELIVERY_DISCHARGE_WINDOW requires a batch ticket and should be absent.
    expect(evals.some((e) => e.ruleId === "DELIVERY_DISCHARGE_WINDOW")).toBe(false);
  });

  it("snapshots inputs on every evaluation for audit trail", () => {
    const evals = runRules(baseCtx);
    for (const e of evals) {
      expect(e.inputsSnapshot).toBeDefined();
      expect(typeof e.inputsSnapshot).toBe("object");
    }
  });
});
