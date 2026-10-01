import { applyRazorpayProcessingFee } from "@lib/razorpayFee";

export const GST_RATE = 0.05;
export const GST_LABEL = `GST (${Math.round(GST_RATE * 100)}%)`;

function roundRupees(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function calculateOrderTotals(subtotal: number, deliveryCharge = 0) {
  const roundedSubtotal = roundRupees(subtotal);
  const roundedDelivery = roundRupees(deliveryCharge);
  const taxable = roundRupees(roundedSubtotal + roundedDelivery);
  const gst = roundRupees(taxable * GST_RATE);
  const payment = applyRazorpayProcessingFee(roundRupees(taxable + gst));

  return {
    subtotal: roundedSubtotal,
    deliveryCharge: roundedDelivery,
    gst,
    processingFee: payment.processingFee,
    total: payment.customerRupees,
    customerPaise: payment.customerPaise,
  };
}
