import { parseDeliveryCoordinate, type DeliveryCoordinate } from "@lib/deliveryZone";

// Published kitchen address. The driving-distance pin is configured separately.
export const RESTAURANT_ADDRESS =
  "3, First Floor, Ward 149, Villivakkam Block, Sridevi Kuppam Main Road, Valasaravakkam, Chennai 600087";

export function restaurantOrigin(): DeliveryCoordinate | null {
  return parseDeliveryCoordinate(
    process.env.RESTAURANT_LATITUDE,
    process.env.RESTAURANT_LONGITUDE,
  );
}
