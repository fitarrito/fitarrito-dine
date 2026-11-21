export const FREE_DELIVERY_KM = 2;
export const FREE_DELIVERY_ORDER_RUPEES = 600;
export const FREE_DELIVERY_ORDER_KM = 5;
export const SHORT_DELIVERY_KM = 2.5;
export const SHORT_DELIVERY_RUPEES = 20;
export const EXTRA_DELIVERY_KM_RUPEES = 10;

function roundRupees(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

// Up to 2 km is free. A food total above ₹600 is also free within 5 km.
// Above 2 km and up to 2.5 km is ₹20 when that offer does not apply.
// Beyond 2.5 km, each kilometre of the trip is ₹10, and any part of a
// kilometre counts as a full kilometre. 4.8 km is 5 × ₹10 = ₹50.
export function calculateDeliveryFee(distanceKm: number, foodSubtotal = 0) {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return null;
  if (distanceKm <= FREE_DELIVERY_KM) return 0;
  if (
    distanceKm <= FREE_DELIVERY_ORDER_KM &&
    roundRupees(foodSubtotal) > FREE_DELIVERY_ORDER_RUPEES
  ) {
    return 0;
  }
  if (distanceKm <= SHORT_DELIVERY_KM) return SHORT_DELIVERY_RUPEES;

  return Math.ceil(distanceKm) * EXTRA_DELIVERY_KM_RUPEES;
}

export function deliveryChargeForDistanceKm(distanceKm: number, foodSubtotal = 0) {
  return calculateDeliveryFee(distanceKm, foodSubtotal);
}

export function deliveryFeeNote(distanceKm: number, foodSubtotal: number, charge: number) {
  if (charge === 0) return "Congratulations! You get FREE delivery.";

  if (
    distanceKm <= FREE_DELIVERY_ORDER_KM &&
    roundRupees(foodSubtotal) <= FREE_DELIVERY_ORDER_RUPEES
  ) {
    return "Orders above ₹600 get free delivery within 5 km.";
  }

  return "Delivery charge calculated based on distance.";
}

export function formatDistanceKm(distanceKm: number) {
  const rounded = Math.round(distanceKm * 10) / 10;

  return Number.isInteger(rounded) ? `${rounded} km` : `${rounded.toFixed(1)} km`;
}
