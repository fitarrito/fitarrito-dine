export type DeliveryCoordinate = {
  latitude: number;
  longitude: number;
};

export const DELIVERY_RADIUS_KM = 15;

export const OUTSIDE_DELIVERY_ZONE_MESSAGE =
  "This location is outside our delivery area. We deliver within 15 km of the restaurant. Choose a closer address.";

export const LOCATION_REQUIRED_MESSAGE =
  "Enter your house, street, area, city, and pincode.";

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function deliveryDistanceKm(from: DeliveryCoordinate, to: DeliveryCoordinate) {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

export function parseDeliveryCoordinate(latitude: unknown, longitude: unknown) {
  const parsedLatitude = typeof latitude === "number" ? latitude : Number(latitude);
  const parsedLongitude = typeof longitude === "number" ? longitude : Number(longitude);

  if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
    return null;
  }

  if (parsedLatitude < -90 || parsedLatitude > 90 || parsedLongitude < -180 || parsedLongitude > 180) {
    return null;
  }

  return { latitude: parsedLatitude, longitude: parsedLongitude };
}

export function isWithinDeliveryRadius(
  origin: DeliveryCoordinate,
  latitude: number,
  longitude: number,
) {
  const coordinate = parseDeliveryCoordinate(latitude, longitude);

  if (!coordinate) return false;

  return deliveryDistanceKm(origin, coordinate) <= DELIVERY_RADIUS_KM;
}
