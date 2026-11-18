export const FREE_DELIVERY_KM = 2;
export const SHORT_DELIVERY_KM = 2.5;
export const SHORT_DELIVERY_RUPEES = 20;
export const EXTRA_DELIVERY_KM_RUPEES = 10;

// Up to 2 km is free. Above 2 km and up to 2.5 km is ₹20.
// Beyond 2.5 km, each kilometre of the trip is ₹10, and any part of a
// kilometre counts as a full kilometre. 4.8 km is 5 × ₹10 = ₹50.
export function calculateDeliveryFee(distanceKm: number) {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return null;
  if (distanceKm <= FREE_DELIVERY_KM) return 0;
  if (distanceKm <= SHORT_DELIVERY_KM) return SHORT_DELIVERY_RUPEES;

  return Math.ceil(distanceKm) * EXTRA_DELIVERY_KM_RUPEES;
}

export function deliveryChargeForDistanceKm(distanceKm: number) {
  return calculateDeliveryFee(distanceKm);
}

export function formatDistanceKm(distanceKm: number) {
  const rounded = Math.round(distanceKm * 10) / 10;

  return Number.isInteger(rounded) ? `${rounded} km` : `${rounded.toFixed(1)} km`;
}
