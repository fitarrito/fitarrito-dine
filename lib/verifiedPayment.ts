export type VerifiedRazorpayPayment = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

const STORAGE_KEY = "fitarrito_verified_payment";

export function saveVerifiedPayment(payment: VerifiedRazorpayPayment) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payment));
  } catch {
    // Ignore storage failures.
  }
}

export function loadVerifiedPayment(): VerifiedRazorpayPayment | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);

    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<VerifiedRazorpayPayment>;

    if (
      typeof parsed.razorpay_order_id !== "string" ||
      typeof parsed.razorpay_payment_id !== "string" ||
      typeof parsed.razorpay_signature !== "string"
    ) {
      return null;
    }

    return {
      razorpay_order_id: parsed.razorpay_order_id,
      razorpay_payment_id: parsed.razorpay_payment_id,
      razorpay_signature: parsed.razorpay_signature,
    };
  } catch {
    return null;
  }
}

export function clearVerifiedPayment() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}
