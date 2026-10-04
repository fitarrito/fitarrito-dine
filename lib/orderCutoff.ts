export type OrderWindow = "lunch" | "dinner" | "closed";

type CutoffTime = {
  hour: number;
  minute: number;
};

type OrderCutoffs = {
  lunch: CutoffTime;
  afternoonOpen: CutoffTime;
  dinner: CutoffTime;
};

export const IGNORE_ORDER_CUTOFF_FOR_TESTING = false;

const MORNING_OPEN: CutoffTime = {
  hour: 8,
  minute: 0,
};

export const ORDER_CUTOFFS: OrderCutoffs = {
  lunch: {
    hour: 11,
    minute: 0,
  },
  afternoonOpen: {
    hour: 15,
    minute: 0,
  },
  dinner: {
    hour: 19,
    minute: 0,
  },
};

export const TEST_ORDER_CUTOFFS: OrderCutoffs = {
  lunch: {
    hour: 11,
    minute: 0,
  },
  afternoonOpen: {
    hour: 15,
    minute: 0,
  },
  dinner: {
    hour: 19,
    minute: 0,
  },
};

function getActiveCutoffs(): OrderCutoffs {
  return IGNORE_ORDER_CUTOFF_FOR_TESTING ? TEST_ORDER_CUTOFFS : ORDER_CUTOFFS;
}

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

export function getLunchCutoffLabel() {
  return formatCutoffTime(getActiveCutoffs().lunch);
}

export function getAfternoonOpenLabel() {
  return formatCutoffTime(getActiveCutoffs().afternoonOpen);
}

export function getDinnerCutoffLabel() {
  return formatCutoffTime(getActiveCutoffs().dinner);
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

  return toMinutes(Number.isFinite(hour) ? hour : 0, Number.isFinite(minute) ? minute : 0);
}

export function isOvernightClosed(now = new Date()) {
  const totalMinutes = getChennaiMinutes(now);
  const cutoffs = getActiveCutoffs();
  const morningOpen = toMinutes(MORNING_OPEN.hour, MORNING_OPEN.minute);
  const dinnerClose = toMinutes(cutoffs.dinner.hour, cutoffs.dinner.minute);

  return totalMinutes < morningOpen || totalMinutes >= dinnerClose;
}

export function isAfternoonClosed(now = new Date()) {
  const totalMinutes = getChennaiMinutes(now);
  const cutoffs = getActiveCutoffs();
  const lunchClose = toMinutes(cutoffs.lunch.hour, cutoffs.lunch.minute);
  const afternoonOpen = toMinutes(
    cutoffs.afternoonOpen.hour,
    cutoffs.afternoonOpen.minute,
  );

  return totalMinutes >= lunchClose && totalMinutes < afternoonOpen;
}

export function getOrderWindow(now = new Date()): OrderWindow {
  const cutoffs = getActiveCutoffs();
  const totalMinutes = getChennaiMinutes(now);
  const lunchCutoff = toMinutes(cutoffs.lunch.hour, cutoffs.lunch.minute);
  const afternoonOpen = toMinutes(
    cutoffs.afternoonOpen.hour,
    cutoffs.afternoonOpen.minute,
  );
  const dinnerCutoff = toMinutes(cutoffs.dinner.hour, cutoffs.dinner.minute);

  if (totalMinutes < toMinutes(MORNING_OPEN.hour, MORNING_OPEN.minute)) {
    return "closed";
  }

  if (totalMinutes < lunchCutoff) {
    return "lunch";
  }

  if (totalMinutes < afternoonOpen) {
    return "closed";
  }

  if (totalMinutes < dinnerCutoff) {
    return "dinner";
  }

  return "closed";
}
