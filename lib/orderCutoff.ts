export type OrderWindow = "lunch" | "dinner" | "closed";

type CutoffTime = {
  hour: number;
  minute: number;
};

type OrderCutoffs = {
  lunch: CutoffTime;
  dinner: CutoffTime;
};

// Temporary: uses TEST_ORDER_CUTOFFS (8 PM dinner) instead of production cutoffs.
export const IGNORE_ORDER_CUTOFF_FOR_TESTING = true;

export const ORDER_CUTOFFS: OrderCutoffs = {
  lunch: {
    hour: 10,
    minute: 0,
  },
  dinner: {
    hour: 18,
    minute: 0,
  },
};

export const TEST_ORDER_CUTOFFS: OrderCutoffs = {
  lunch: {
    hour: 10,
    minute: 0,
  },
  dinner: {
    hour: 20,
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

export function getOrderWindow(now = new Date()): OrderWindow {
  const cutoffs = getActiveCutoffs();
  const totalMinutes = getChennaiMinutes(now);
  const lunchCutoff = toMinutes(cutoffs.lunch.hour, cutoffs.lunch.minute);
  const dinnerCutoff = toMinutes(cutoffs.dinner.hour, cutoffs.dinner.minute);

  if (totalMinutes < lunchCutoff) {
    return "lunch";
  }

  if (totalMinutes < dinnerCutoff) {
    return "dinner";
  }

  return "closed";
}
