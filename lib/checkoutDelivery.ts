export type CheckoutDelivery = {
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
  return Boolean(
    data.fullName.trim() &&
      data.mobileNumber.trim() &&
      data.area.trim(),
  );
}
