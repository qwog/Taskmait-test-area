export const TIERS = {
  trial: { included: 5, overage: 0 },
  solo: { included: 10, overage: 30 },
  crew: { included: 40, overage: 30 },
  pro: { included: 120, overage: 30 },
  enterprise: { included: Infinity, overage: 0 },
} as const;

export type TierKey = keyof typeof TIERS;

export const TIER_PRICE_MONTHLY: Record<TierKey, number> = {
  trial: 0,
  solo: 149,
  crew: 399,
  pro: 899,
  enterprise: 0,
};

export function shouldPromptUpgrade(tier: TierKey, poursThisPeriod: number): boolean {
  const { included } = TIERS[tier];
  return poursThisPeriod >= Math.max(1, Math.floor(included * 0.8));
}
