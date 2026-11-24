import { GST_RATE } from "@lib/orderTotals";

function roundRupees(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/** Dine-in bills are food plus GST. Delivery and payment fees do not apply. */
export function calculateDineInBill(subtotal: number) {
  const roundedSubtotal = roundRupees(subtotal);
  const gst = roundRupees(roundedSubtotal * GST_RATE);

  return {
    subtotal: roundedSubtotal,
    gst,
    deliveryCharge: 0,
    total: roundRupees(roundedSubtotal + gst),
  };
}
