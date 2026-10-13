export type DeliveryCoordinate = {
  latitude: number;
  longitude: number;
};

// Porur covers the listed campuses, including Vadapalani, within this radius.
export const DELIVERY_ZONE = {
  label: "Porur, Ramapuram, and Vadapalani",
  center: { latitude: 13.0381, longitude: 80.1565 },
  radiusKm: 9,
};

export const OUTSIDE_DELIVERY_ZONE_MESSAGE =
  "This address is outside our delivery area. We currently deliver around Porur, Ramapuram, and Vadapalani. Move the pin closer, or choose a listed location.";

export const LOCATION_REQUIRED_MESSAGE =
  "Search for your delivery location, or drop the pin on the map.";

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

export function isInsideDeliveryZone(latitude: number, longitude: number) {
  const coordinate = parseDeliveryCoordinate(latitude, longitude);

  if (!coordinate) return false;

  return deliveryDistanceKm(DELIVERY_ZONE.center, coordinate) <= DELIVERY_ZONE.radiusKm;
}
