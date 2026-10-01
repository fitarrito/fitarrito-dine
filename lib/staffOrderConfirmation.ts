import "server-only";
import crypto from "crypto";

const TOKEN_VERSION = 1;
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type StaffOrderTokenPayload = {
  version: number;
  orderId: string;
  expiresAt: number;
  nonce: string;
};

function getConfirmationKey() {
  const secret = process.env.STAFF_ORDER_CONFIRM_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "STAFF_ORDER_CONFIRM_SECRET must contain at least 32 characters.",
    );
  }

  return crypto.createHash("sha256").update(secret, "utf8").digest();
}

export function createStaffOrderConfirmationToken(
  orderId: string | number,
  now = Date.now(),
) {
  const payload: StaffOrderTokenPayload = {
    version: TOKEN_VERSION,
    orderId: String(orderId),
    expiresAt: now + TOKEN_TTL_MS,
    nonce: crypto.randomBytes(16).toString("base64url"),
  };
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getConfirmationKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    encrypted.toString("base64url"),
    authTag.toString("base64url"),
  ].join(".");
}

export function verifyStaffOrderConfirmationToken(
  token: string,
  now = Date.now(),
):
  | { valid: true; orderId: string; expiresAt: number }
  | { valid: false; reason: "invalid" | "expired" } {
  try {
    const [ivValue, encryptedValue, authTagValue, extra] = token.split(".");

    if (!ivValue || !encryptedValue || !authTagValue || extra) {
      return { valid: false, reason: "invalid" };
    }

    const iv = Buffer.from(ivValue, "base64url");
    const encrypted = Buffer.from(encryptedValue, "base64url");
    const authTag = Buffer.from(authTagValue, "base64url");

    if (iv.length !== 12 || authTag.length !== 16 || encrypted.length === 0) {
      return { valid: false, reason: "invalid" };
    }

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      getConfirmationKey(),
      iv,
    );
    decipher.setAuthTag(authTag);

    const payload = JSON.parse(
      Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]).toString("utf8"),
    ) as Partial<StaffOrderTokenPayload>;

    if (
      payload.version !== TOKEN_VERSION ||
      typeof payload.orderId !== "string" ||
      !payload.orderId ||
      typeof payload.expiresAt !== "number" ||
      !Number.isFinite(payload.expiresAt) ||
      typeof payload.nonce !== "string" ||
      !payload.nonce
    ) {
      return { valid: false, reason: "invalid" };
    }

    if (payload.expiresAt <= now) {
      return { valid: false, reason: "expired" };
    }

    return {
      valid: true,
      orderId: payload.orderId,
      expiresAt: payload.expiresAt,
    };
  } catch {
    return { valid: false, reason: "invalid" };
  }
}

export function createStaffOrderConfirmationUrl(
  token: string,
  requestUrl: string,
) {
  const configuredOrigin = process.env.FITARRITO_APP_URL?.trim();
  const vercelOrigin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : null;
  const origin = configuredOrigin || vercelOrigin || new URL(requestUrl).origin;
  const url = new URL("/staff/orders/confirm", origin);
  url.searchParams.set("token", token);

  return url.toString();
}
