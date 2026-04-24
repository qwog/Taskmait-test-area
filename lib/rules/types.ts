export type Severity = "green" | "yellow" | "red";

export type CementType =
  | "Type_I"
  | "Type_II"
  | "Type_IL"
  | "Type_III"
  | "Type_V"
  | "blended";

export type ExposureClass = "F0" | "F1" | "F2" | "F3";

export type JobType =
  | "driveway"
  | "patio"
  | "sidewalk"
  | "slab"
  | "commercial_floor"
  | "other";

export interface MixDesignSnapshot {
  id: string;
  name: string;
  cementType: CementType;
  designStrengthPsi: number;
  wcRatio: number;
  aggregateTopSizeIn?: number;
  targetAirPctMin?: number | null;
  targetAirPctMax?: number | null;
  targetSlumpInMin: number;
  targetSlumpInMax: number;
  admixtures: Array<{ name: string; type?: string }>;
}

export interface WeatherSnapshot {
  timestamp: string; // ISO
  tempF: number;
  humidityPct: number;
  windMph: number;
  source: "forecast" | "actual" | "manual";
}

export interface BatchTicketSnapshot {
  batchedAt?: string;   // ISO
  deliveredAt?: string; // ISO
  hasRetarder: boolean;
}

export interface CurePlanSnapshot {
  insulationPlanned: boolean;
  wetCurePlanned: boolean;
  evaporationRetarderPlanned: boolean;
  heatedEnclosurePlanned: boolean;
  minCureDurationHours: number;
}

export interface RuleContext {
  ambientTempF: number;
  concreteTempF?: number;
  humidityPct: number;
  windMph: number;
  windSpeedAt20InAboveSurface?: number;
  evaporationRateLbft2hr?: number;
  mixDesign: MixDesignSnapshot;
  jobType: JobType;
  exposureClass: ExposureClass;
  scheduledAt: Date;
  forecastCureWindow?: WeatherSnapshot[];
  batchTicket?: BatchTicketSnapshot;
  curePlan?: CurePlanSnapshot;
  // Live test inputs (used during pour-day evaluations).
  measuredSlumpIn?: number;
  measuredAirPct?: number;
}

export interface RuleResult {
  triggered: boolean;
  severity: Severity;
  message: string;
  mitigation?: string;
}

export interface Rule {
  id: string;
  version: string;
  category: "weather" | "mix" | "placement" | "cure" | "type_il_specific";
  title: string;
  citation: string;
  severity: "yellow" | "red";
  inputs: (keyof RuleContext)[];
  evaluate: (ctx: RuleContext) => RuleResult;
}

export interface RuleEvaluation {
  ruleId: string;
  ruleVersion: string;
  triggered: boolean;
  severity: Severity;
  title: string;
  message: string;
  citation: string;
  mitigation?: string;
  inputsSnapshot: Record<string, unknown>;
}

export interface PrePourEvaluation {
  level: Severity;
  evaluations: RuleEvaluation[];
  mitigations: string[];
}

export const FLATWORK_JOB_TYPES: ReadonlyArray<JobType> = [
  "driveway",
  "patio",
  "sidewalk",
  "slab",
  "commercial_floor",
];

export function isFlatwork(job: JobType): boolean {
  return FLATWORK_JOB_TYPES.includes(job);
}

export function highestSeverity(evals: RuleEvaluation[]): Severity {
  if (evals.some((e) => e.triggered && e.severity === "red")) return "red";
  if (evals.some((e) => e.triggered && e.severity === "yellow")) return "yellow";
  return "green";
}
