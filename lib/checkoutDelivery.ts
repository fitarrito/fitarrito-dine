import {
  isWithinDeliveryRadius,
  parseDeliveryCoordinate,
  type DeliveryCoordinate,
} from "@lib/deliveryZone";

export type DeliveryAddressType = "selected_location" | "normal_address";

export type CheckoutDelivery = {
  addressType: DeliveryAddressType;
  locationId: string;
  fullName: string;
  mobileNumber: string;
  address: string;
  area: string;
  landmark: string;
  city: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  deliveryCharge: number | null;
  distanceKm: number | null;
  specialRequests: string;
  deliveryInstructions: string;
};

const STORAGE_KEY = "fitarrito_checkout_delivery";

export const EMPTY_CHECKOUT_DELIVERY: CheckoutDelivery = {
  addressType: "normal_address",
  locationId: "",
  fullName: "",
  mobileNumber: "",
  address: "",
  area: "",
  landmark: "",
  city: "Chennai",
  pincode: "",
  latitude: null,
  longitude: null,
  deliveryCharge: null,
  distanceKm: null,
  specialRequests: "",
  deliveryInstructions: "",
};

export function saveCheckoutDelivery(data: CheckoutDelivery) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Safari private mode can block sessionStorage.
  }
}

export function loadCheckoutDelivery(): CheckoutDelivery | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);

    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<CheckoutDelivery>;
    const coordinate = parseDeliveryCoordinate(parsed.latitude, parsed.longitude);
    const enteredAddress = parsed.addressType === "normal_address";

    return {
      ...EMPTY_CHECKOUT_DELIVERY,
      fullName: parsed.fullName ?? "",
      mobileNumber: parsed.mobileNumber ?? "",
      specialRequests: parsed.specialRequests ?? "",
      deliveryInstructions: parsed.deliveryInstructions ?? "",
      address: enteredAddress ? (parsed.address ?? "") : "",
      area: enteredAddress ? (parsed.area ?? "") : "",
      landmark: enteredAddress ? (parsed.landmark ?? "") : "",
      city: enteredAddress ? (parsed.city || "Chennai") : "Chennai",
      pincode: enteredAddress ? (parsed.pincode ?? "") : "",
      addressType: "normal_address",
      locationId: "",
      latitude: enteredAddress ? (coordinate?.latitude ?? null) : null,
      longitude: enteredAddress ? (coordinate?.longitude ?? null) : null,
      deliveryCharge:
        enteredAddress && typeof parsed.deliveryCharge === "number"
          ? parsed.deliveryCharge
          : null,
      distanceKm:
        enteredAddress && typeof parsed.distanceKm === "number" ? parsed.distanceKm : null,
    };
  } catch {
    return null;
  }
}

export function clearCheckoutDelivery() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function isCheckoutDeliveryComplete(
  data: CheckoutDelivery,
  origin: DeliveryCoordinate,
) {
  const hasContact = Boolean(data.fullName.trim() && data.mobileNumber.trim());

  if (!hasContact) return false;

  return Boolean(
    data.address.trim() &&
      data.area.trim() &&
      data.city.trim() &&
      data.pincode.trim() &&
      typeof data.deliveryCharge === "number" &&
      typeof data.distanceKm === "number" &&
      data.latitude != null &&
      data.longitude != null &&
      isWithinDeliveryRadius(origin, data.latitude, data.longitude),
  );
}

export function deliveryDisplayLocation(data: CheckoutDelivery) {
  return [data.address, data.area, data.city, data.pincode, data.landmark]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(", ");
}
