export const PLAN_LIMITS = {
  free: {
    maxProducts: 0,
    maxModifierGroups: 0,
    allowCoupons: false,
    allowCombos: false,
    allowMultipleDeliveryRules: false,
    allowMenu: false,
  },
  essential: {
    maxProducts: 10,
    maxModifierGroups: 3, // per product
    allowCoupons: false,
    allowCombos: false,
    allowMultipleDeliveryRules: false, // only 1 rule (fixed global)
    allowMenu: true,
  },
  pro: {
    maxProducts: 50,
    maxModifierGroups: Infinity,
    allowCoupons: true,
    allowCombos: true,
    allowMultipleDeliveryRules: true,
    allowMenu: true,
  },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;

export function getPlanLimits(planName: string) {
  return PLAN_LIMITS[planName as PlanName] || PLAN_LIMITS.essential;
}
