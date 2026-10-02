import crypto from "crypto";
import Razorpay from "razorpay";

const MIN_AMOUNT_PAISE = 100;

type RazorpayKeyMode = "test" | "live" | "unset" | "unknown";

function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

function razorpayKeyMode(key: string): RazorpayKeyMode {
  if (!key) return "unset";
  if (key.startsWith("rzp_test_")) return "test";
  if (key.startsWith("rzp_live_")) return "live";
  return "unknown";
}

export function getRazorpayConfigDiagnostics() {
  const keyId = readEnv("RAZORPAY_KEY_ID");
  const keySecret = readEnv("RAZORPAY_KEY_SECRET");
  const publicKeyId = readEnv("NEXT_PUBLIC_RAZORPAY_KEY_ID");
  const keyIdMode = razorpayKeyMode(keyId);
  const publicKeyIdMode = razorpayKeyMode(publicKeyId);
  const missing = [
    keyId ? null : "RAZORPAY_KEY_ID",
    keySecret ? null : "RAZORPAY_KEY_SECRET",
  ].filter((name): name is string => Boolean(name));

  return {
    RAZORPAY_KEY_ID: Boolean(keyId),
    RAZORPAY_KEY_SECRET: Boolean(keySecret),
    NEXT_PUBLIC_RAZORPAY_KEY_ID: Boolean(publicKeyId),
    keyIdMode,
    publicKeyIdMode,
    modesMatch:
      keyIdMode === "unset" ||
      publicKeyIdMode === "unset" ||
      keyIdMode === publicKeyIdMode,
    missing,
  };
}

export function logRazorpayConfig(context: string) {
  const diagnostics = getRazorpayConfigDiagnostics();

  console.error(`Razorpay configuration check (${context}):`, {
    RAZORPAY_KEY_ID: diagnostics.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: diagnostics.RAZORPAY_KEY_SECRET,
    NEXT_PUBLIC_RAZORPAY_KEY_ID: diagnostics.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    keyIdMode: diagnostics.keyIdMode,
    publicKeyIdMode: diagnostics.publicKeyIdMode,
    modesMatch: diagnostics.modesMatch,
    missing: diagnostics.missing,
  });

  return diagnostics;
}

export function razorpayConfigurationError() {
  const diagnostics = logRazorpayConfig("missing server credentials");
  const missing = diagnostics.missing.length
    ? diagnostics.missing.join(" and ")
    : "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET";

  return `Razorpay is not configured. Missing ${missing}.`;
}

export function getRazorpayConfig() {
  const keyId = readEnv("RAZORPAY_KEY_ID");
  const keySecret = readEnv("RAZORPAY_KEY_SECRET");

  if (!keyId || !keySecret) {
    return null;
  }

  return { keyId, keySecret };
}

export function getRazorpayClient() {
  const config = getRazorpayConfig();

  if (!config) {
    throw new Error(razorpayConfigurationError());
  }

  return new Razorpay({
    key_id: config.keyId,
    key_secret: config.keySecret,
  });
}

function valuesMatch(expected: string, received: string) {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export function verifyRazorpayPaymentSignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const config = getRazorpayConfig();

  if (!config) return false;

  const expectedSignature = crypto
    .createHmac("sha256", config.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return valuesMatch(expectedSignature, signature);
}

export async function verifyRazorpayPayment({
  orderId,
  paymentId,
  signature,
  expectedAmountPaise,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
  expectedAmountPaise: number;
}) {
  if (
    !verifyRazorpayPaymentSignature({ orderId, paymentId, signature })
  ) {
    return { verified: false as const, reason: "signature" as const };
  }

  const payment = await getRazorpayClient().payments.fetch(paymentId);
  const amount = Number(payment.amount);

  if (payment.order_id !== orderId) {
    return { verified: false as const, reason: "order" as const };
  }

  if (amount !== expectedAmountPaise) {
    return { verified: false as const, reason: "amount" as const };
  }

  if (payment.status !== "captured") {
    return { verified: false as const, reason: "status" as const };
  }

  return { verified: true as const };
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
