export const PLAN_LIMITS = {
  free: {
    maxProducts: 0,
    maxCombos: 0,
    maxCategories: 0,
    maxModifierGroups: 0,
    maxCoupons: 0,
    allowMenu: false,
    allowOrders: false,
    allowLogistics: false,
    allowCoupons: false,
    allowCombos: false,
    allowMultipleDeliveryRules: false,
  },
  essential: {
    maxProducts: 10,
    maxCombos: 5,
    maxCategories: 5,
    maxModifierGroups: 10,
    maxCoupons: 2,
    allowMenu: true,
    allowOrders: true,
    allowLogistics: true,
    allowCoupons: true,
    allowCombos: true,
    allowMultipleDeliveryRules: false,
  },
  pro: {
    maxProducts: 30,
    maxCombos: 30,
    maxCategories: 15,
    maxModifierGroups: 20,
    maxCoupons: 10,
    allowMenu: true,
    allowOrders: true,
    allowLogistics: true,
    allowCoupons: true,
    allowCombos: true,
    allowMultipleDeliveryRules: true,
  },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;

export function getPlanLimits(planName: string) {
  return PLAN_LIMITS[planName as PlanName] || PLAN_LIMITS.essential;
}
