import "server-only";

import crypto from "crypto";
import { cookies } from "next/headers";
import {
  staffDashboardAuthConfigured,
  verifyStaffDashboardPassword,
} from "@lib/staffSession";

const COOKIE_NAME = "fitarrito_waiter_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

type WaiterSessionPayload = {
  exp: number;
  name: string;
};

function sessionSecret() {
  const secret = process.env.STAFF_ORDER_CONFIRM_SECRET?.trim() ?? "";

  return secret.length >= 32 ? secret : null;
}

export function waiterAuthConfigured() {
  const password =
    process.env.WAITER_PORTAL_PASSWORD?.trim() ||
    process.env.STAFF_DASHBOARD_PASSWORD?.trim();

  return Boolean(password) && Boolean(sessionSecret()) && staffDashboardAuthConfigured();
}

export function verifyWaiterPassword(password: string) {
  const dedicated = process.env.WAITER_PORTAL_PASSWORD?.trim();

  if (dedicated) {
    if (!password) return false;

    const digest = (value: string) => crypto.createHash("sha256").update(value, "utf8").digest();

    return crypto.timingSafeEqual(digest(password), digest(dedicated));
  }

  return verifyStaffDashboardPassword(password);
}

function sign(payload: string) {
  const secret = sessionSecret();

  if (!secret) throw new Error("Waiter session signing is not configured.");

  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function signaturesMatch(expected: string, received: string) {
  const digest = (value: string) => crypto.createHash("sha256").update(value, "utf8").digest();

  return crypto.timingSafeEqual(digest(expected), digest(received));
}

export function createWaiterSessionValue(name: string, now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({
      exp: now + SESSION_TTL_MS,
      name: name.trim().slice(0, 40) || "Waiter",
    } satisfies WaiterSessionPayload),
    "utf8",
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

export function readWaiterSession(value: string | undefined, now = Date.now()) {
  if (!value || !sessionSecret()) return null;

  const [payload, signature, extra] = value.split(".");

  if (!payload || !signature || extra || !signaturesMatch(sign(payload), signature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<WaiterSessionPayload>;

    if (typeof parsed.exp !== "number" || parsed.exp <= now) return null;
    if (!parsed.name?.trim()) return null;

    return { name: parsed.name.trim() };
  } catch {
    return null;
  }
}

export async function getWaiterSession() {
  const cookieStore = await cookies();

  return readWaiterSession(cookieStore.get(COOKIE_NAME)?.value);
}

export async function setWaiterSessionCookie(name: string) {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, createWaiterSessionValue(name), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearWaiterSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
