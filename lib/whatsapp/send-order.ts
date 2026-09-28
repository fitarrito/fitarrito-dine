export type OrderWhatsAppItem = {
  item_name: string;
  selected_protein?: string | null;
  selected_size?: string | null;
  selected_toppings?: string | null;
  quantity: number;
  unit_price: number;
};

export type FormatOrderWhatsAppMessageInput = {
  orderId: string | number;
  customerName: string;
  customerPhone: string;
  items: OrderWhatsAppItem[];
  subtotal: number;
  deliveryCharge: number;
  total: number;
  paymentMethod: string;
  addressLine1: string;
  area: string;
  city: string;
  pincode: string;
  landmark?: string;
  deliveryInstructions?: string;
};

const DEFAULT_KITCHEN_PHONE = "919600908264";

export function getWhatsAppKitchenPhone(): string {
  const fromEnv = process.env.NEXT_PUBLIC_WHATSAPP_KITCHEN_PHONE?.replace(
    /\D/g,
    "",
  );

  return fromEnv || DEFAULT_KITCHEN_PHONE;
}

export function formatOrderWhatsAppMessage(
  input: FormatOrderWhatsAppMessageInput,
): string {
  const phoneDisplay = input.customerPhone
    .replace(/^\+91/, "")
    .replace(/\D/g, "");

  const itemLines = input.items
    .map((item) => {
      const lineTotal = item.unit_price * item.quantity;
      const details = [
        item.selected_protein,
        item.selected_size ? `Size: ${item.selected_size}` : null,
        item.selected_toppings ? `Toppings: ${item.selected_toppings}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      const proteinLine = details ? `\n${details}` : "";

      return `${item.quantity} × ${item.item_name}${proteinLine}\n₹${lineTotal}`;
    })
    .join("\n\n");

  const addressParts = [
    input.addressLine1,
    input.area,
    `${input.city} - ${input.pincode}`,
    input.landmark ? `Landmark: ${input.landmark}` : null,
    input.deliveryInstructions
      ? `Instructions: ${input.deliveryInstructions}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const paymentLabel =
    input.paymentMethod.toLowerCase() === "cash"
      ? "Cash"
      : input.paymentMethod;

  return `🍽️ NEW FITARRITO ORDER

Order: #${input.orderId}

Customer:
${input.customerName}
📞 ${phoneDisplay}

Items:
${itemLines}

Subtotal: ₹${input.subtotal}
Delivery: ₹${input.deliveryCharge}
TOTAL: ₹${input.total}

Payment: ${paymentLabel}

📍 Delivery Address:
${addressParts}`;
}

export function createWhatsAppOrderLink(message: string, phone?: string) {
  const phoneNumber = (phone || getWhatsAppKitchenPhone()).replace(/\D/g, "");
  const encodedMessage = encodeURIComponent(message);

  return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
}
