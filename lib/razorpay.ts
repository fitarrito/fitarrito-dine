import Razorpay from "razorpay";

const MIN_AMOUNT_PAISE = 100;

export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return null;
  }

  return { keyId, keySecret };
}

export function getRazorpayClient() {
  const config = getRazorpayConfig();

  if (!config) {
    throw new Error(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
    );
  }

  return new Razorpay({
    key_id: config.keyId,
    key_secret: config.keySecret,
  });
}

export function rupeesToPaise(rupees: number) {
  return Math.round(Number(rupees) * 100);
}

export function parseAmountPaise(value: unknown) {
  const amount = typeof value === "string" ? Number(value) : value;

  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return null;
  }

  return Math.round(amount);
}

export function isValidAmountPaise(amount: number) {
  return Number.isInteger(amount) && amount >= MIN_AMOUNT_PAISE;
}

export function getRazorpayError(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return {
      statusCode: undefined as number | undefined,
      description: "Razorpay request failed.",
    };
  }

  const payload = error as {
    statusCode?: number | string;
    status?: number;
    error?: { description?: string };
    message?: string;
  };

  const rawStatus = payload.statusCode ?? payload.status;
  const statusCode =
    typeof rawStatus === "number"
      ? rawStatus
      : typeof rawStatus === "string"
        ? Number(rawStatus)
        : undefined;

  return {
    statusCode: Number.isFinite(statusCode) ? statusCode : undefined,
    description:
      payload.error?.description ||
      payload.message ||
      "Razorpay request failed.",
  };
}
