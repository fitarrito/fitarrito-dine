import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "fitarrito_staff_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

type SessionPayload = {
  exp: number;
};

function sessionSecret() {
  const secret = process.env.STAFF_ORDER_CONFIRM_SECRET?.trim() ?? "";

  return secret.length >= 32 ? secret : null;
}

export function staffDashboardAuthConfigured() {
  return Boolean(process.env.STAFF_DASHBOARD_PASSWORD?.trim()) && Boolean(sessionSecret());
}

function digest(value: string) {
  return crypto.createHash("sha256").update(value, "utf8").digest();
}

function signaturesMatch(expected: string, received: string) {
  return crypto.timingSafeEqual(digest(expected), digest(received));
}

export function verifyStaffDashboardPassword(password: string) {
  const expected = process.env.STAFF_DASHBOARD_PASSWORD?.trim() ?? "";

  if (!expected || !password) return false;

  return crypto.timingSafeEqual(digest(password), digest(expected));
}

function sign(payload: string) {
  const secret = sessionSecret();

  if (!secret) {
    throw new Error("Staff session signing is not configured.");
  }

  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createStaffSessionValue(now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({ exp: now + SESSION_TTL_MS } satisfies SessionPayload),
    "utf8",
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

export function isValidStaffSession(value: string | undefined, now = Date.now()) {
  if (!value || !sessionSecret()) return false;

  const [payload, signature, extra] = value.split(".");

  if (!payload || !signature || extra || !signaturesMatch(sign(payload), signature)) {
    return false;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<SessionPayload>;

    return typeof parsed.exp === "number" && parsed.exp > now;
  } catch {
    return false;
  }
}

export async function hasStaffSession() {
  const cookieStore = await cookies();

  return isValidStaffSession(cookieStore.get(COOKIE_NAME)?.value);
}

export async function setStaffSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, createStaffSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearStaffSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export const STAFF_SESSION_COOKIE = COOKIE_NAME;
