export const ONLINE_ORDERING_CLOSED_TITLE = "Online Ordering is Currently Closed";

export const ONLINE_ORDERING_CLOSED_MESSAGE =
  "Customers cannot place new on-demand orders right now.";

export const ONLINE_ORDERING_CLOSED_ERROR = "Online ordering is currently closed.";

const DAILY_OPEN_MINUTES = 10 * 60;

function kolkataDateAndMinutes(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const hour = Number(pick("hour"));
  const minute = Number(pick("minute"));

  return {
    date: `${pick("year")}-${pick("month")}-${pick("day")}`,
    minutes: (Number.isFinite(hour) ? hour : 0) * 60 + (Number.isFinite(minute) ? minute : 0),
  };
}

export function shouldOpenOrderingAtTen(
  enabled: boolean,
  updatedAt: string | null,
  now = new Date(),
) {
  if (enabled) return false;

  const current = kolkataDateAndMinutes(now);

  if (current.minutes < DAILY_OPEN_MINUTES) return false;
  if (!updatedAt) return true;

  const updatedDate = new Date(updatedAt);

  if (Number.isNaN(updatedDate.getTime())) return true;

  const updated = kolkataDateAndMinutes(updatedDate);

  if (updated.date === current.date && updated.minutes >= DAILY_OPEN_MINUTES) {
    return false;
  }

  return true;
}

export function formatKolkataDateTime(value: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h12",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const dayPeriod = pick("dayPeriod").toUpperCase();

  return `${pick("day")} ${pick("month")} ${pick("year")}, ${pick("hour")}:${pick("minute")} ${dayPeriod}`;
}
