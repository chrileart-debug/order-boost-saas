/**
 * Calculate distance in KM between two lat/lng points using the Haversine formula.
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Calculate shipping fee based on establishment rules.
 */
export function calculateShipping(
  distanceKm: number,
  baseFee: number,
  kmIncluded: number,
  kmExtraPrice: number
): number {
  const extraKm = Math.max(0, distanceKm - kmIncluded);
  return baseFee + extraKm * kmExtraPrice;
}
