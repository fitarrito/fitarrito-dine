import { isValidIndianMobile } from "@lib/normalizePhone";
import { createWhatsAppOrderLink } from "@lib/whatsapp/send-order";

export const PREPARATION_ESTIMATES = [
  { minutes: 15, label: "10–15 minutes" },
  { minutes: 30, label: "20–30 minutes" },
  { minutes: 45, label: "30–45 minutes" },
  { minutes: 60, label: "45–60 minutes" },
] as const;

export type PreparationMinutes = (typeof PREPARATION_ESTIMATES)[number]["minutes"];

export function isPreparationMinutes(value: unknown): value is PreparationMinutes {
  return PREPARATION_ESTIMATES.some((estimate) => estimate.minutes === value);
}

export function getPreparationEstimate(minutes: unknown) {
  return (
    PREPARATION_ESTIMATES.find((estimate) => estimate.minutes === minutes) ??
    null
  );
}

export function normalizeCustomerWhatsAppPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (!isValidIndianMobile(digits)) {
    return null;
  }

  if (digits.length === 10) {
    return `91${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return `91${digits.slice(1)}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }

  return null;
}

export function formatCustomerOrderConfirmationMessage(input: {
  customerName: string;
  orderId: string | number;
  preparationTime: string;
}) {
  const customerName = input.customerName.trim() || "there";

  return `Hi ${customerName}! 👋

Your Fitarrito order #${input.orderId} has been confirmed by our kitchen! 🎉

Our chefs are preparing your meal fresh.

Estimated waiting time: ${input.preparationTime}.

Thank you for choosing Fitarrito! ❤️`;
}

export function createCustomerOrderWhatsAppLink(input: {
  customerName: string;
  customerPhone: string;
  orderId: string | number;
  preparationTime: string;
}) {
  const phone = normalizeCustomerWhatsAppPhone(input.customerPhone);

  if (!phone) {
    return null;
  }

  return createWhatsAppOrderLink(
    formatCustomerOrderConfirmationMessage({
      customerName: input.customerName,
      orderId: input.orderId,
      preparationTime: input.preparationTime,
    }),
    phone,
  );
}
