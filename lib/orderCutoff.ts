export type OrderWindow = "open" | "closed";

type CutoffTime = {
  hour: number;
  minute: number;
};

const MORNING_OPEN: CutoffTime = {
  hour: 8,
  minute: 0,
};

const NIGHT_CLOSE: CutoffTime = {
  hour: 20,
  minute: 0,
};

function formatCutoffTime({ hour, minute }: CutoffTime) {
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  const minuteText =
    minute === 0 ? ":00" : `:${String(minute).padStart(2, "0")}`;

  return `${hour12}${minuteText} ${period}`;
}

export function getMorningOpenLabel() {
  return formatCutoffTime(MORNING_OPEN);
}

export function getNightCloseLabel() {
  return formatCutoffTime(NIGHT_CLOSE);
}

function toMinutes(hour: number, minute: number) {
  return hour * 60 + minute;
}

function getChennaiMinutes(now: Date) {
  const chennaiDateTime = now.toLocaleString("sv-SE", {
    timeZone: "Asia/Kolkata",
  });
  const time = chennaiDateTime.split(" ")[1] ?? "00:00:00";
  const [hourText = "0", minuteText = "0"] = time.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  return toMinutes(
    Number.isFinite(hour) ? hour : 0,
    Number.isFinite(minute) ? minute : 0,
  );
}

export function isOvernightClosed(now = new Date()) {
  const totalMinutes = getChennaiMinutes(now);
  const morningOpen = toMinutes(MORNING_OPEN.hour, MORNING_OPEN.minute);
  const nightClose = toMinutes(NIGHT_CLOSE.hour, NIGHT_CLOSE.minute);

  return totalMinutes < morningOpen || totalMinutes >= nightClose;
}

export function getOrderWindow(now = new Date()): OrderWindow {
  return isOvernightClosed(now) ? "closed" : "open";
}
