import { Rule } from './types';

const flatworkJobTypes = new Set(['driveway', 'patio', 'sidewalk', 'slab', 'commercial_floor']);

export const RULE_VERSION = '1.0.0';

export const ruleCatalog: Rule[] = [
  {
    id: 'HOT_EVAP_RATE_THRESHOLD',
    version: RULE_VERSION,
    category: 'weather',
    title: 'Evaporation rate elevated',
    citation: 'ACI 305R-20 §2.1.4',
    severity: 'yellow',
    inputs: ['evaporationRateLbft2hr'],
    evaluate: (ctx) => {
      const rate = ctx.evaporationRateLbft2hr ?? 0;
      const triggered = rate >= 0.2;
      return {
        triggered,
        severity: triggered ? 'yellow' : 'green',
        message: triggered ? `Evaporation rate ${rate} lb/ft²/hr exceeds 0.2 threshold.` : 'Evaporation rate below elevated-risk threshold.',
        mitigation: triggered ? 'Fog surface, use evaporation retardant, install windbreaks, or reschedule to cooler part of day.' : undefined
      };
    }
  },
  {
    id: 'HOT_EVAP_RATE_SEVERE',
    version: RULE_VERSION,
    category: 'weather',
    title: 'Evaporation rate severe',
    citation: 'ACI 305R-20 §2.1.4',
    severity: 'red',
    inputs: ['evaporationRateLbft2hr'],
    evaluate: (ctx) => {
      const rate = ctx.evaporationRateLbft2hr ?? 0;
      const triggered = rate >= 0.3;
      return {
        triggered,
        severity: triggered ? 'red' : 'green',
        message: triggered ? `Evaporation rate ${rate} lb/ft²/hr exceeds severe threshold.` : 'Evaporation rate below severe threshold.'
      };
    }
  },
  {
    id: 'HOT_DISCHARGE_TEMP',
    version: RULE_VERSION,
    category: 'weather',
    title: 'Concrete discharge temperature too high',
    citation: 'ACI 305.1-14 §3.2',
    severity: 'red',
    inputs: ['concreteTempF'],
    evaluate: (ctx) => {
      const temp = ctx.concreteTempF ?? 0;
      const triggered = temp > 95;
      return { triggered, severity: triggered ? 'red' : 'green', message: triggered ? `Concrete temperature ${temp}°F exceeds 95°F.` : 'Concrete discharge temperature acceptable.' };
    }
  },
  {
    id: 'COLD_PLACEMENT_TEMP',
    version: RULE_VERSION,
    category: 'weather',
    title: 'Ambient placement temperature too low',
    citation: 'ACI 306R-16 §5.1',
    severity: 'red',
    inputs: ['ambientTempF', 'hasColdWeatherProtectionPlan'],
    evaluate: (ctx) => {
      const triggered = ctx.ambientTempF < 40 && !ctx.hasColdWeatherProtectionPlan;
      return { triggered, severity: triggered ? 'red' : 'green', message: triggered ? 'Ambient below 40°F without cold-weather protection plan.' : 'Placement temperature within acceptable range or protected.' };
    }
  },
  {
    id: 'COLD_CURE_FORECAST',
    version: RULE_VERSION,
    category: 'cure',
    title: 'Cold forecast during cure window',
    citation: 'ACI 306R-16 §6.1',
    severity: 'yellow',
    inputs: ['forecastCureWindow'],
    evaluate: (ctx) => {
      const low = Math.min(...(ctx.forecastCureWindow ?? []).map((h) => h.tempF));
      const triggered = Number.isFinite(low) && low < 40;
      return {
        triggered,
        severity: triggered ? 'yellow' : 'green',
        message: triggered ? `Forecast cure window low ${low}°F is below 40°F.` : 'Cure window forecast does not drop below 40°F.',
        mitigation: triggered ? 'Plan insulated blankets, heated enclosure, or accelerating admixture.' : undefined
      };
    }
  },
  {
    id: 'MIX_WC_RATIO_HIGH',
    version: RULE_VERSION,
    category: 'mix',
    title: 'Water-cement ratio high for flatwork',
    citation: 'ACI 332-20 §7.2',
    severity: 'yellow',
    inputs: ['mixDesign.wcRatio', 'jobType'],
    evaluate: (ctx) => {
      const triggered = flatworkJobTypes.has(ctx.jobType) && ctx.mixDesign.wcRatio > 0.45;
      return { triggered, severity: triggered ? 'yellow' : 'green', message: triggered ? `w/c ratio ${ctx.mixDesign.wcRatio} exceeds 0.45 for flatwork.` : 'w/c ratio acceptable for job type.' };
    }
  },
  {
    id: 'MIX_STRENGTH_INSUFFICIENT',
    version: RULE_VERSION,
    category: 'mix',
    title: 'Design strength insufficient',
    citation: 'ACI 318-19 Table 19.3.2.1, ACI 332-20',
    severity: 'red',
    inputs: ['mixDesign.designStrengthPsi', 'exposureClass', 'jobType'],
    evaluate: (ctx) => {
      const exposureMinimums: Record<string, number> = { F0: 3000, F1: 4000, F2: 4500, F3: 5000 };
      const min = Math.max(flatworkJobTypes.has(ctx.jobType) ? 4000 : 0, exposureMinimums[ctx.exposureClass] ?? 0);
      const triggered = ctx.mixDesign.designStrengthPsi < min;
      return { triggered, severity: triggered ? 'red' : 'green', message: triggered ? `Design strength ${ctx.mixDesign.designStrengthPsi} psi below minimum ${min} psi.` : 'Design strength meets minimum requirement.' };
    }
  },
  {
    id: 'MIX_AIR_CONTENT_RANGE',
    version: RULE_VERSION,
    category: 'mix',
    title: 'Air content range unsuitable for exposure',
    citation: 'ACI 318-19 Table 19.3.3.1',
    severity: 'yellow',
    inputs: ['mixDesign.targetAirPctMin', 'mixDesign.targetAirPctMax', 'exposureClass'],
    evaluate: (ctx) => {
      const freeze = ['F1', 'F2', 'F3'].includes(ctx.exposureClass);
      const min = ctx.mixDesign.targetAirPctMin ?? -Infinity;
      const max = ctx.mixDesign.targetAirPctMax ?? Infinity;
      const triggered = freeze && (min < 5 || max > 8);
      return { triggered, severity: triggered ? 'yellow' : 'green', message: triggered ? `Target air range ${min}-${max}% is outside 5-8% for freeze/thaw exposure.` : 'Air content range acceptable for exposure class.' };
    }
  },
  {
    id: 'TYPEIL_TROWEL_WARNING',
    version: RULE_VERSION,
    category: 'type_il_specific',
    title: 'Type IL finishing advisory',
    citation: 'PCA 2024 State-of-the-Art Report; MCA Tech Bulletin 2024',
    severity: 'yellow',
    inputs: ['mixDesign.cementType', 'jobType'],
    evaluate: (ctx) => {
      const triggered = ctx.mixDesign.cementType === 'Type_IL' && flatworkJobTypes.has(ctx.jobType);
      return {
        triggered,
        severity: triggered ? 'yellow' : 'green',
        message: triggered ? 'Type IL mix selected for flatwork. Delay finishing until bleed sheen dissipates.' : 'Type IL finishing advisory not applicable.',
        mitigation: triggered ? 'Type IL bleeds less than Type I. Do not begin finishing while bleed water present. Wait for sheen to dissipate naturally.' : undefined
      };
    }
  },
  {
    id: 'TYPEIL_SCALING_RISK',
    version: RULE_VERSION,
    category: 'type_il_specific',
    title: 'Type IL scaling risk conditions',
    citation: 'MCA Scaling Tech Bulletin 07012024; ASCC PLC Alert',
    severity: 'red',
    inputs: ['mixDesign.cementType', 'exposureClass', 'humidityPct', 'hasSufficientCurePlan'],
    evaluate: (ctx) => {
      const triggered = ctx.mixDesign.cementType === 'Type_IL' && ['F2', 'F3'].includes(ctx.exposureClass) && ctx.humidityPct < 50 && !ctx.hasSufficientCurePlan;
      return { triggered, severity: triggered ? 'red' : 'green', message: triggered ? 'Type IL + low humidity + freeze/thaw exposure without robust cure plan increases scaling risk.' : 'Type IL scaling risk trigger not met.' };
    }
  },
  {
    id: 'DELIVERY_DISCHARGE_WINDOW',
    version: RULE_VERSION,
    category: 'placement',
    title: 'Delivery discharge window exceeded',
    citation: 'ASTM C94 §11.7',
    severity: 'red',
    inputs: ['batchedAt', 'deliveredAt', 'hasRetarder', 'ambientTempF'],
    evaluate: (ctx) => {
      if (!ctx.batchedAt || !ctx.deliveredAt) return { triggered: false, severity: 'green', message: 'Delivery timing not available.' };
      const minutes = (ctx.deliveredAt.getTime() - ctx.batchedAt.getTime()) / 60000;
      const limit = ctx.ambientTempF >= 90 ? 60 : 90;
      const triggered = !ctx.hasRetarder && minutes > limit;
      return { triggered, severity: triggered ? 'red' : 'green', message: triggered ? `Discharge window ${minutes.toFixed(0)} min exceeds ${limit} min.` : 'Delivery discharge window within limits.' };
    }
  },
  {
    id: 'TEST_SLUMP_OUT_OF_SPEC',
    version: RULE_VERSION,
    category: 'placement',
    title: 'Measured slump out of design target range',
    citation: 'ASTM C143; ACI 301-20 §4.2.2.3',
    severity: 'yellow',
    inputs: ['measuredSlumpIn', 'mixDesign.targetSlumpInMin', 'mixDesign.targetSlumpInMax'],
    evaluate: (ctx) => {
      if (ctx.measuredSlumpIn == null) return { triggered: false, severity: 'green', message: 'No slump measurement provided.' };
      const min = ctx.mixDesign.targetSlumpInMin ?? -Infinity;
      const max = ctx.mixDesign.targetSlumpInMax ?? Infinity;
      const triggered = ctx.measuredSlumpIn < min || ctx.measuredSlumpIn > max;
      return { triggered, severity: triggered ? 'yellow' : 'green', message: triggered ? `Measured slump ${ctx.measuredSlumpIn} in outside target ${min}-${max} in.` : 'Measured slump within target range.' };
    }
  }
];
