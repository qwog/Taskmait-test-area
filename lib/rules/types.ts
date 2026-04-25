export type RuleCategory = 'weather' | 'mix' | 'placement' | 'cure' | 'type_il_specific';
export type Severity = 'green' | 'yellow' | 'red';

export interface MixDesignSnapshot {
  id?: string;
  cementType: 'Type_I' | 'Type_II' | 'Type_IL' | 'Type_III' | 'Type_V' | 'blended';
  designStrengthPsi: number;
  wcRatio: number;
  targetAirPctMin?: number | null;
  targetAirPctMax?: number | null;
  targetSlumpInMin?: number | null;
  targetSlumpInMax?: number | null;
  admixtures?: string[];
}

export interface WeatherSnapshot {
  timestamp: string;
  tempF: number;
  humidityPct: number;
  windMph: number;
}

export interface RuleContext {
  ambientTempF: number;
  concreteTempF?: number;
  humidityPct: number;
  windMph: number;
  windSpeedAt20InAboveSurface?: number;
  evaporationRateLbft2hr?: number;
  mixDesign: MixDesignSnapshot;
  jobType: string;
  exposureClass: 'F0' | 'F1' | 'F2' | 'F3';
  scheduledAt: Date;
  forecastCureWindow?: WeatherSnapshot[];
  hasColdWeatherProtectionPlan?: boolean;
  hasSufficientCurePlan?: boolean;
  deliveredAt?: Date;
  batchedAt?: Date;
  hasRetarder?: boolean;
  measuredSlumpIn?: number;
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
  category: RuleCategory;
  title: string;
  citation: string;
  severity: 'yellow' | 'red';
  inputs: string[];
  evaluate: (ctx: RuleContext) => RuleResult;
}

export interface RuleEvaluation {
  pourId: string;
  ruleId: string;
  ruleVersion: string;
  evaluatedAt: string;
  triggered: boolean;
  severity: Severity;
  inputs: Record<string, unknown>;
  outputMessage: string;
  citation: string;
  mitigation?: string;
}

export interface PourLogEvent {
  eventType: string;
  timestamp?: string;
  payload?: Record<string, unknown>;
}
