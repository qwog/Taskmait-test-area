import { menzelEvaporationRate } from "./menzel";
import type { Rule, RuleContext, RuleResult } from "./types";
import { isFlatwork } from "./types";

const ok = (): RuleResult => ({
  triggered: false,
  severity: "green",
  message: "No issue detected.",
});

function evapRate(ctx: RuleContext): number {
  if (typeof ctx.evaporationRateLbft2hr === "number") {
    return ctx.evaporationRateLbft2hr;
  }
  const concreteTempF = ctx.concreteTempF ?? ctx.ambientTempF + 5;
  return menzelEvaporationRate({
    concreteTempF,
    ambientTempF: ctx.ambientTempF,
    humidityPct: ctx.humidityPct,
    windMph: ctx.windSpeedAt20InAboveSurface ?? ctx.windMph,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. HOT_EVAP_RATE_THRESHOLD
// ─────────────────────────────────────────────────────────────────────────────
const hotEvapThreshold: Rule = {
  id: "HOT_EVAP_RATE_THRESHOLD",
  version: "1.0.0",
  category: "weather",
  title: "Plastic shrinkage cracking risk",
  citation: "ACI 305R-20 §2.1.4",
  severity: "yellow",
  inputs: ["ambientTempF", "humidityPct", "windMph"],
  evaluate(ctx) {
    const rate = evapRate(ctx);
    if (rate < 0.2 || rate >= 0.3) return ok();
    return {
      triggered: true,
      severity: "yellow",
      message: `Evaporation rate ${rate.toFixed(
        2
      )} lb/ft²/hr exceeds ACI plastic-shrinkage threshold (0.2).`,
      mitigation:
        "Fog surface, use evaporation retardant, install windbreaks, or reschedule to cooler part of day.",
    };
  },
};

// 2. HOT_EVAP_RATE_SEVERE
const hotEvapSevere: Rule = {
  id: "HOT_EVAP_RATE_SEVERE",
  version: "1.0.0",
  category: "weather",
  title: "Severe evaporation rate — do not pour",
  citation: "ACI 305R-20 §2.1.4",
  severity: "red",
  inputs: ["ambientTempF", "humidityPct", "windMph"],
  evaluate(ctx) {
    const rate = evapRate(ctx);
    if (rate < 0.3) return ok();
    return {
      triggered: true,
      severity: "red",
      message: `Evaporation rate ${rate.toFixed(
        2
      )} lb/ft²/hr ≥ 0.30 — placement not recommended without full mitigation plan.`,
      mitigation:
        "Reschedule or implement combined mitigations: fogging, windbreaks, retarder, night pour, and continuous wet cure.",
    };
  },
};

// 3. HOT_DISCHARGE_TEMP
const hotDischargeTemp: Rule = {
  id: "HOT_DISCHARGE_TEMP",
  version: "1.0.0",
  category: "placement",
  title: "Concrete discharge temperature too high",
  citation: "ACI 305.1-14 §3.2",
  severity: "red",
  inputs: ["concreteTempF"],
  evaluate(ctx) {
    if (typeof ctx.concreteTempF !== "number") return ok();
    if (ctx.concreteTempF <= 95) return ok();
    return {
      triggered: true,
      severity: "red",
      message: `Concrete discharge temp ${ctx.concreteTempF.toFixed(
        1
      )}°F exceeds 95°F limit.`,
      mitigation:
        "Reject load or cool via ice substitution, liquid nitrogen, or chilled water at the plant.",
    };
  },
};

// 4. COLD_PLACEMENT_TEMP
const coldPlacement: Rule = {
  id: "COLD_PLACEMENT_TEMP",
  version: "1.0.0",
  category: "weather",
  title: "Cold weather placement without protection",
  citation: "ACI 306R-16 §5.1",
  severity: "red",
  inputs: ["ambientTempF"],
  evaluate(ctx) {
    if (ctx.ambientTempF >= 40) return ok();
    const plan = ctx.curePlan;
    const hasProtection =
      plan?.insulationPlanned || plan?.heatedEnclosurePlanned;
    if (hasProtection) return ok();
    return {
      triggered: true,
      severity: "red",
      message: `Ambient temperature ${ctx.ambientTempF.toFixed(
        1
      )}°F is below 40°F with no cold-weather protection plan.`,
      mitigation:
        "Heat mix water, use accelerator, and plan insulated blankets or a heated enclosure before placement.",
    };
  },
};

// 5. COLD_CURE_FORECAST
const coldCureForecast: Rule = {
  id: "COLD_CURE_FORECAST",
  version: "1.0.0",
  category: "cure",
  title: "Freezing conditions forecast during cure window",
  citation: "ACI 306R-16 §6.1",
  severity: "yellow",
  inputs: ["forecastCureWindow"],
  evaluate(ctx) {
    const forecast = ctx.forecastCureWindow ?? [];
    if (forecast.length === 0) return ok();
    const min = Math.min(...forecast.map((f) => f.tempF));
    if (min >= 40) return ok();
    return {
      triggered: true,
      severity: "yellow",
      message: `Forecast low ${min.toFixed(
        1
      )}°F during first 72 hours of cure.`,
      mitigation:
        "Plan insulated blankets, heated enclosure, or accelerating admixture.",
    };
  },
};

// 6. MIX_WC_RATIO_HIGH
const wcRatioHigh: Rule = {
  id: "MIX_WC_RATIO_HIGH",
  version: "1.0.0",
  category: "mix",
  title: "W/C ratio high for flatwork",
  citation: "ACI 332-20 §7.2",
  severity: "yellow",
  inputs: ["mixDesign", "jobType"],
  evaluate(ctx) {
    if (!isFlatwork(ctx.jobType)) return ok();
    if (ctx.mixDesign.wcRatio <= 0.45) return ok();
    return {
      triggered: true,
      severity: "yellow",
      message: `W/C ratio ${ctx.mixDesign.wcRatio.toFixed(
        2
      )} exceeds 0.45 for residential flatwork.`,
      mitigation:
        "Request a lower-w/c mix or water-reducer. High w/c increases shrinkage cracking and scaling risk.",
    };
  },
};

// 7. MIX_STRENGTH_INSUFFICIENT
const EXPOSURE_MIN_PSI: Record<string, number> = {
  F0: 2500,
  F1: 3500,
  F2: 4500,
  F3: 4500,
};
const strengthInsufficient: Rule = {
  id: "MIX_STRENGTH_INSUFFICIENT",
  version: "1.0.0",
  category: "mix",
  title: "Design strength insufficient",
  citation: "ACI 318-19 Table 19.3.2.1; ACI 332-20",
  severity: "red",
  inputs: ["mixDesign", "jobType", "exposureClass"],
  evaluate(ctx) {
    const psi = ctx.mixDesign.designStrengthPsi;
    const flatworkMin = isFlatwork(ctx.jobType) ? 4000 : 2500;
    const exposureMin = EXPOSURE_MIN_PSI[ctx.exposureClass] ?? 2500;
    const min = Math.max(flatworkMin, exposureMin);
    if (psi >= min) return ok();
    return {
      triggered: true,
      severity: "red",
      message: `Design strength ${psi} psi is below ${min} psi minimum (flatwork/exposure ${ctx.exposureClass}).`,
      mitigation: `Specify a mix with at least ${min} psi design strength.`,
    };
  },
};

// 8. MIX_AIR_CONTENT_RANGE
const airContentRange: Rule = {
  id: "MIX_AIR_CONTENT_RANGE",
  version: "1.0.0",
  category: "mix",
  title: "Air content outside freeze/thaw range",
  citation: "ACI 318-19 Table 19.3.3.1",
  severity: "yellow",
  inputs: ["mixDesign", "exposureClass"],
  evaluate(ctx) {
    if (ctx.exposureClass === "F0") return ok();
    const { targetAirPctMin, targetAirPctMax } = ctx.mixDesign;
    if (targetAirPctMin == null || targetAirPctMax == null) {
      return {
        triggered: true,
        severity: "yellow",
        message: `Exposure ${ctx.exposureClass} requires entrained air but mix design has no air target.`,
        mitigation: "Add an air-entraining admixture targeting 5–8%.",
      };
    }
    if (targetAirPctMin >= 5 && targetAirPctMax <= 8) return ok();
    return {
      triggered: true,
      severity: "yellow",
      message: `Target air ${targetAirPctMin}–${targetAirPctMax}% is outside the 5–8% range for exposure ${ctx.exposureClass}.`,
      mitigation: "Adjust air-entraining admixture dose to target 5–8%.",
    };
  },
};

// 9. TYPEIL_TROWEL_WARNING (always-on informational warning for Type IL flatwork)
const typeIlTrowel: Rule = {
  id: "TYPEIL_TROWEL_WARNING",
  version: "1.0.0",
  category: "type_il_specific",
  title: "Type IL finishing window differs from Type I",
  citation: "PCA 2024 State-of-the-Art Report; MCA Tech Bulletin 2024",
  severity: "yellow",
  inputs: ["mixDesign", "jobType"],
  evaluate(ctx) {
    if (ctx.mixDesign.cementType !== "Type_IL") return ok();
    if (!isFlatwork(ctx.jobType)) return ok();
    return {
      triggered: true,
      severity: "yellow",
      message:
        "Type IL (PLC) bleeds less than Type I. Premature finishing can seal bleed water and cause delamination.",
      mitigation:
        "Do not begin finishing while any bleed water is present. Wait for sheen to dissipate naturally; resist the urge to close the surface early.",
    };
  },
};

// 10. TYPEIL_SCALING_RISK
const typeIlScaling: Rule = {
  id: "TYPEIL_SCALING_RISK",
  version: "1.0.0",
  category: "type_il_specific",
  title: "Type IL scaling risk in low humidity + freeze/thaw",
  citation: "MCA Scaling Tech Bulletin 07012024; ASCC PLC Alert",
  severity: "red",
  inputs: ["mixDesign", "exposureClass", "humidityPct", "curePlan"],
  evaluate(ctx) {
    if (ctx.mixDesign.cementType !== "Type_IL") return ok();
    if (ctx.exposureClass !== "F2" && ctx.exposureClass !== "F3") return ok();
    if (ctx.humidityPct >= 50) return ok();
    const plan = ctx.curePlan;
    const adequateCure =
      plan?.wetCurePlanned && (plan?.minCureDurationHours ?? 0) >= 168; // 7 days
    if (adequateCure) return ok();
    return {
      triggered: true,
      severity: "red",
      message: `Type IL + ${ctx.exposureClass} exposure + ${ctx.humidityPct.toFixed(
        0
      )}% RH without a 7-day wet cure has documented scaling risk.`,
      mitigation:
        "Plan a continuous 7-day wet cure, use a penetrating sealer after 28-day strength, and verify deicer exposure is delayed at least one winter.",
    };
  },
};

// 11. DELIVERY_DISCHARGE_WINDOW
const deliveryWindow: Rule = {
  id: "DELIVERY_DISCHARGE_WINDOW",
  version: "1.0.0",
  category: "placement",
  title: "Discharge window exceeded",
  citation: "ASTM C94 §11.7",
  severity: "red",
  inputs: ["batchTicket", "ambientTempF"],
  evaluate(ctx) {
    const bt = ctx.batchTicket;
    if (!bt?.batchedAt || !bt?.deliveredAt) return ok();
    const mins =
      (new Date(bt.deliveredAt).getTime() - new Date(bt.batchedAt).getTime()) /
      60000;
    if (mins <= 0) return ok();
    const hot = ctx.ambientTempF >= 85;
    const limit = bt.hasRetarder ? 90 : hot ? 60 : 90;
    if (mins <= limit) return ok();
    return {
      triggered: true,
      severity: "red",
      message: `Truck in transit ${mins.toFixed(0)} min — exceeds ${limit}-min limit${
        hot ? " (hot weather)" : ""
      }${bt.hasRetarder ? "" : " without retarder"}.`,
      mitigation:
        "Reject load per ASTM C94 unless mixer time and revolutions are documented within tolerance.",
    };
  },
};

// 12. TEST_SLUMP_OUT_OF_SPEC
const slumpOutOfSpec: Rule = {
  id: "TEST_SLUMP_OUT_OF_SPEC",
  version: "1.0.0",
  category: "placement",
  title: "Measured slump out of specification",
  citation: "ASTM C143; ACI 301-20 §4.2.2.3",
  severity: "yellow",
  inputs: ["measuredSlumpIn", "mixDesign"],
  evaluate(ctx) {
    if (typeof ctx.measuredSlumpIn !== "number") return ok();
    const { targetSlumpInMin, targetSlumpInMax } = ctx.mixDesign;
    if (
      ctx.measuredSlumpIn >= targetSlumpInMin &&
      ctx.measuredSlumpIn <= targetSlumpInMax
    ) {
      return ok();
    }
    return {
      triggered: true,
      severity: "yellow",
      message: `Measured slump ${ctx.measuredSlumpIn}" outside target ${targetSlumpInMin}–${targetSlumpInMax}".`,
      mitigation:
        "Do not add unauthorized water. Consult mix designer; document any field adjustments.",
    };
  },
};

export const RULE_CATALOG: readonly Rule[] = Object.freeze([
  hotEvapThreshold,
  hotEvapSevere,
  hotDischargeTemp,
  coldPlacement,
  coldCureForecast,
  wcRatioHigh,
  strengthInsufficient,
  airContentRange,
  typeIlTrowel,
  typeIlScaling,
  deliveryWindow,
  slumpOutOfSpec,
]);

export function findRule(id: string): Rule | undefined {
  return RULE_CATALOG.find((r) => r.id === id);
}
