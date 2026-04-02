export const PLAN_LIMITS = {
  essential: {
    maxProducts: 10,
    maxModifierGroups: 3, // per product
    allowCoupons: false,
    allowCombos: false,
    allowMultipleDeliveryRules: false, // only 1 rule (fixed global)
  },
  pro: {
    maxProducts: 50,
    maxModifierGroups: Infinity,
    allowCoupons: true,
    allowCombos: true,
    allowMultipleDeliveryRules: true,
  },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;

export function getPlanLimits(planName: string) {
  return PLAN_LIMITS[planName as PlanName] || PLAN_LIMITS.essential;
}
