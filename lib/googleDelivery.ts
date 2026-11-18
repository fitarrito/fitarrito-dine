import {
  OUTSIDE_DELIVERY_ZONE_MESSAGE,
  isWithinDeliveryRadius,
  parseDeliveryCoordinate,
} from "@lib/deliveryZone";
import { restaurantOrigin } from "@lib/restaurantLocation";
import { deliveryChargeForDistanceKm } from "@lib/deliveryFee";
import { getWhatsAppKitchenPhone } from "@lib/whatsapp/send-order";

export type DeliveryAddressInput = {
  addressLine1: string;
  area: string;
  city: string;
  pincode: string;
  landmark: string;
  latitude: number | null;
  longitude: number | null;
};

export type DeliveryQuote = {
  latitude: number;
  longitude: number;
  distanceKm: number;
  deliveryCharge: number;
  originLatitude: number;
  originLongitude: number;
  locatedBy: "pin" | "geocode";
};

export class DeliveryQuoteError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "DeliveryQuoteError";
    this.status = status;
  }
}

function restaurantPhone() {
  const digits = getWhatsAppKitchenPhone().replace(/\D/g, "").replace(/^91/, "");

  if (digits.length !== 10) return digits;

  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

function contactSuffix() {
  return `Call the restaurant on ${restaurantPhone()} before paying.`;
}

export const RESTAURANT_LOCATION_REQUIRED_MESSAGE =
  `Delivery pricing needs the restaurant's map location. Call the restaurant on ${restaurantPhone()} before paying.`;

export const ADDRESS_LOOKUP_FAILED_MESSAGE =
  `We couldn't confirm this address for delivery. Check the house, street, area, and pincode, then try again. ${contactSuffix()}`;

export const ROUTE_FAILED_MESSAGE =
  `We couldn't calculate the driving distance, so the delivery charge isn't available. Try again. ${contactSuffix()}`;

function mapsServerKey() {
  return (
    process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    ""
  );
}

export function readDeliveryAddress(body: Record<string, unknown>): DeliveryAddressInput {
  const coordinate = parseDeliveryCoordinate(body.latitude, body.longitude);

  return {
    addressLine1: String(body.addressLine1 ?? body.address ?? "").trim(),
    area: String(body.area ?? "").trim(),
    city: String(body.city ?? "").trim(),
    pincode: String(body.pincode ?? "").trim(),
    landmark: String(body.landmark ?? "").trim(),
    latitude: coordinate?.latitude ?? null,
    longitude: coordinate?.longitude ?? null,
  };
}

export function assertDeliveryAddress(address: DeliveryAddressInput) {
  if (!address.addressLine1 || !address.area || !address.city || !address.pincode) {
    throw new DeliveryQuoteError(400, "Please enter your house, street, area, city, and pincode.");
  }
}

function addressQuery(address: DeliveryAddressInput) {
  return [address.addressLine1, address.area, address.city, address.pincode, address.landmark, "India"]
    .filter(Boolean)
    .join(", ");
}

async function geocodeAddress(address: DeliveryAddressInput, key: string) {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", addressQuery(address));
  url.searchParams.set("components", "country:IN");
  url.searchParams.set("key", key);

  const response = await fetch(url);
  const payload = (await response.json()) as {
    status?: string;
    error_message?: string;
    results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }>;
  };
  const location = payload.results?.[0]?.geometry?.location;
  const coordinate = parseDeliveryCoordinate(location?.lat, location?.lng);

  if (!coordinate) {
    console.error(
      "Delivery geocoding failed:",
      payload.status || response.status,
      payload.error_message || "",
    );
    return null;
  }

  return coordinate;
}

async function routeDistanceKm(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  key: string,
) {
  const routesResponse = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "routes.distanceMeters",
    },
    body: JSON.stringify({
      origin: {
        location: {
          latLng: { latitude: origin.latitude, longitude: origin.longitude },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.latitude,
            longitude: destination.longitude,
          },
        },
      },
      travelMode: "DRIVE",
    }),
  });
  const routesPayload = (await routesResponse.json()) as {
    routes?: Array<{ distanceMeters?: number }>;
    error?: { message?: string; status?: string };
  };
  const routeMeters = routesPayload.routes?.[0]?.distanceMeters;

  if (Number.isFinite(routeMeters) && Number(routeMeters) >= 0) {
    return Number(routeMeters) / 1000;
  }

  console.error(
    "Routes API driving distance failed:",
    routesResponse.status,
    routesPayload.error?.status || "",
    routesPayload.error?.message || "",
  );

  const matrixUrl = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
  matrixUrl.searchParams.set("origins", `${origin.latitude},${origin.longitude}`);
  matrixUrl.searchParams.set("destinations", `${destination.latitude},${destination.longitude}`);
  matrixUrl.searchParams.set("mode", "driving");
  matrixUrl.searchParams.set("key", key);

  const matrixResponse = await fetch(matrixUrl);
  const matrixPayload = (await matrixResponse.json()) as {
    status?: string;
    error_message?: string;
    rows?: Array<{ elements?: Array<{ status?: string; distance?: { value?: number } }> }>;
  };
  const element = matrixPayload.rows?.[0]?.elements?.[0];
  const matrixMeters = element?.distance?.value;

  if (element?.status === "OK" && Number.isFinite(matrixMeters)) {
    return Number(matrixMeters) / 1000;
  }

  console.error(
    "Distance Matrix driving distance failed:",
    matrixPayload.status || matrixResponse.status,
    element?.status || "",
    matrixPayload.error_message || "",
  );

  return null;
}

export async function quoteDeliveryAddress(address: DeliveryAddressInput): Promise<DeliveryQuote> {
  assertDeliveryAddress(address);

  const origin = restaurantOrigin();

  if (!origin) {
    throw new DeliveryQuoteError(503, RESTAURANT_LOCATION_REQUIRED_MESSAGE);
  }

  const key = mapsServerKey();

  if (!key) {
    throw new DeliveryQuoteError(503, ADDRESS_LOOKUP_FAILED_MESSAGE);
  }

  let destination =
    address.latitude != null && address.longitude != null
      ? { latitude: address.latitude, longitude: address.longitude }
      : null;
  let locatedBy: DeliveryQuote["locatedBy"] = "pin";

  if (!destination) {
    destination = await geocodeAddress(address, key);
    locatedBy = "geocode";
  }

  if (!destination) {
    throw new DeliveryQuoteError(422, ADDRESS_LOOKUP_FAILED_MESSAGE);
  }

  if (!isWithinDeliveryRadius(origin, destination.latitude, destination.longitude)) {
    throw new DeliveryQuoteError(422, OUTSIDE_DELIVERY_ZONE_MESSAGE);
  }

  const distanceKm = await routeDistanceKm(origin, destination, key);
  const deliveryCharge =
    distanceKm == null ? null : deliveryChargeForDistanceKm(distanceKm);

  if (distanceKm == null || deliveryCharge == null) {
    throw new DeliveryQuoteError(422, ROUTE_FAILED_MESSAGE);
  }

  return {
    latitude: destination.latitude,
    longitude: destination.longitude,
    distanceKm,
    deliveryCharge,
    originLatitude: origin.latitude,
    originLongitude: origin.longitude,
    locatedBy,
  };
}
