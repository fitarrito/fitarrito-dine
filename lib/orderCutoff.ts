export type OrderWindow = "lunch" | "dinner" | "closed";

export const IGNORE_ORDER_CUTOFF_FOR_TESTING = true;

export const ORDER_CUTOFFS = {
  lunch: {
    hour: 10,
    minute: 0,
  },
  dinner: {
    hour: 16,
    minute: 0,
  },
};

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
  if (IGNORE_ORDER_CUTOFF_FOR_TESTING) {
    return "dinner";
  }

  const totalMinutes = getChennaiMinutes(now);
  const lunchCutoff = toMinutes(
    ORDER_CUTOFFS.lunch.hour,
    ORDER_CUTOFFS.lunch.minute,
  );
  const dinnerCutoff = toMinutes(
    ORDER_CUTOFFS.dinner.hour,
    ORDER_CUTOFFS.dinner.minute,
  );

  if (totalMinutes < lunchCutoff) {
    return "lunch";
  }

  if (totalMinutes < dinnerCutoff) {
    return "dinner";
  }

  return "closed";
}
