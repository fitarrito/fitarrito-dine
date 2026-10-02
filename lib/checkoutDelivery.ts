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
  deliveryInstructions: string;
};

const STORAGE_KEY = "fitarrito_checkout_delivery";

export const EMPTY_CHECKOUT_DELIVERY: CheckoutDelivery = {
  addressType: "selected_location",
  locationId: "",
  fullName: "",
  mobileNumber: "",
  address: "",
  area: "",
  landmark: "",
  city: "Chennai",
  pincode: "",
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

    return {
      ...EMPTY_CHECKOUT_DELIVERY,
      ...parsed,
      addressType:
        parsed.addressType === "normal_address"
          ? "normal_address"
          : "selected_location",
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

export function isCheckoutDeliveryComplete(data: CheckoutDelivery) {
  const hasContact = Boolean(data.fullName.trim() && data.mobileNumber.trim());

  if (!hasContact) return false;

  if (data.addressType === "normal_address") {
    return Boolean(
      data.address.trim() &&
        data.area.trim() &&
        data.city.trim() &&
        data.pincode.trim(),
    );
  }

  return Boolean(data.area.trim());
}

export function deliveryDisplayLocation(data: CheckoutDelivery) {
  if (data.addressType !== "normal_address") {
    return data.area.trim();
  }

  return [data.address, data.area, data.city, data.pincode, data.landmark]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(", ");
}
