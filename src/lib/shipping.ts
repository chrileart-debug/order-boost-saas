import { haversineDistance } from "./haversine";

export type DeliveryRule = {
  id: string;
  type: string; // 'free' | 'fixed_zip' | 'fixed_global' | 'per_km'
  value: number;
  min_cep: string | null;
  max_cep: string | null;
  min_km: number | null;
  max_km: number | null;
  is_active: boolean;
  name: string;
};

export type ShippingResult = {
  fee: number;
  label: string;
  blocked: boolean;
};

/**
 * Given an array of delivery rules, customer CEP digits, and
 * the distance in KM between customer and establishment,
 * return the best matching rule result.
 *
 * Priority: 1) CEP-specific (free / fixed_zip), 2) per_km, 3) fixed_global
 */
export function resolveShipping(
  rules: DeliveryRule[],
  customerCepDigits: string,
  distanceKm: number | null
): ShippingResult {
  const active = rules.filter((r) => r.is_active);
  if (active.length === 0) {
    return { fee: 0, label: "Frete grátis", blocked: false };
  }

  // 1) Check CEP-specific rules (free or fixed_zip)
  const cepRules = active.filter((r) => r.type === "free" || r.type === "fixed_zip");
  for (const rule of cepRules) {
    if (rule.min_cep && rule.max_cep && customerCepDigits) {
      if (customerCepDigits >= rule.min_cep && customerCepDigits <= rule.max_cep) {
        if (rule.type === "free") {
          return { fee: 0, label: rule.name || "Frete GRÁTIS", blocked: false };
        }
        return {
          fee: Number(rule.value),
          label: rule.name || `Frete: R$ ${Number(rule.value).toFixed(2)}`,
          blocked: false,
        };
      }
    }
  }

  // 2) Check per_km rules (distance brackets)
  const kmRules = active
    .filter((r) => r.type === "per_km")
    .sort((a, b) => (Number(a.min_km) || 0) - (Number(b.min_km) || 0));
  if (kmRules.length > 0 && distanceKm !== null) {
    for (const rule of kmRules) {
      const minKm = Number(rule.min_km) || 0;
      const maxKm = rule.max_km != null ? Number(rule.max_km) : null;
      if (maxKm != null && distanceKm > maxKm) continue;
      if (distanceKm < minKm) continue;
      // Distance falls within this bracket — value is a fixed fee
      const fee = Number(rule.value);
      return {
        fee,
        label: rule.name || `Frete: R$ ${fee.toFixed(2)} (${distanceKm.toFixed(1)} km)`,
        blocked: false,
      };
    }
    // No bracket matched — blocked
    return {
      fee: 0,
      label: "Ops! Não entregamos nesta distância.",
      blocked: true,
    };
  }

  // 3) Check fixed_global
  const globalRules = active.filter((r) => r.type === "fixed_global");
  if (globalRules.length > 0) {
    const rule = globalRules[0];
    return {
      fee: Number(rule.value),
      label: rule.name || `Frete: R$ ${Number(rule.value).toFixed(2)}`,
      blocked: false,
    };
  }

  // No matching rule — blocked
  return {
    fee: 0,
    label: "Ops! Não entregamos nesta região.",
    blocked: true,
  };
}
