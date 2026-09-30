export const RAZORPAY_FEE_RATE = 0.02;
export const RAZORPAY_FEE_GST_RATE = 0.18;
export const RAZORPAY_EFFECTIVE_RATE =
  RAZORPAY_FEE_RATE * (1 + RAZORPAY_FEE_GST_RATE);

function roundRupees(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function formatRupees(amount: number) {
  const rounded = roundRupees(amount);

  return Number.isInteger(rounded)
    ? `₹${rounded}`
    : `₹${rounded.toFixed(2)}`;
}

export function applyRazorpayProcessingFee(netRupees: number) {
  const net = roundRupees(netRupees);
  const customerRupees = roundRupees(net / (1 - RAZORPAY_EFFECTIVE_RATE));
  const processingFee = roundRupees(customerRupees - net);

  return {
    netRupees: net,
    processingFee,
    customerRupees,
    customerPaise: Math.round(customerRupees * 100),
  };
}
