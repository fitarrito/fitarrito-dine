import { Resend } from "resend";
import { formatRupees } from "@lib/razorpayFee";
import { GST_LABEL } from "@lib/orderTotals";

export type NewOrderEmailItem = {
  item_name: string;
  selected_protein?: string | null;
  selected_size?: string | null;
  quantity: number;
  unit_price: number;
};

export type NewOrderEmailInput = {
  orderId: string | number;
  customerName: string;
  customerPhone: string;
  deliveryLocation: string;
  items: NewOrderEmailItem[];
  subtotal: number;
  deliveryCharge: number;
  gst: number;
  total: number;
  paymentMethod: string;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function paymentLabel(method: string) {
  const value = method.trim().toLowerCase();

  if (value === "razorpay") return "Razorpay (Paid)";
  if (value === "qr") return "QR / Razorpay";
  if (value === "cash") return "Cash";

  return method || "Razorpay";
}

function formatPhone(phone: string) {
  const digits = phone.replace(/^\+91/, "").replace(/\D/g, "");

  if (digits.length === 10) {
    return `+91 ${digits}`;
  }

  return phone;
}

function buildNewOrderEmailHtml(input: NewOrderEmailInput) {
  const itemRows = input.items
    .map((item) => {
      const lineTotal = Number(item.unit_price) * Number(item.quantity);
      const protein = item.selected_protein
        ? escapeHtml(item.selected_protein)
        : "—";
      const size = item.selected_size ? escapeHtml(item.selected_size) : "—";

      return `<tr>
        <td style="padding:12px 10px;border-bottom:1px solid #f3f4f6;color:#111827;font-size:14px;">
          <div style="font-weight:700;">${escapeHtml(item.item_name)}</div>
        </td>
        <td style="padding:12px 10px;border-bottom:1px solid #f3f4f6;color:#4b5563;font-size:13px;">${protein}</td>
        <td style="padding:12px 10px;border-bottom:1px solid #f3f4f6;color:#4b5563;font-size:13px;">${size}</td>
        <td style="padding:12px 10px;border-bottom:1px solid #f3f4f6;color:#111827;font-size:13px;text-align:center;">${escapeHtml(item.quantity)}</td>
        <td style="padding:12px 10px;border-bottom:1px solid #f3f4f6;color:#111827;font-size:13px;text-align:right;white-space:nowrap;">${escapeHtml(formatRupees(Number(item.unit_price)))}</td>
        <td style="padding:12px 10px;border-bottom:1px solid #f3f4f6;color:#111827;font-size:13px;font-weight:700;text-align:right;white-space:nowrap;">${escapeHtml(formatRupees(lineTotal))}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:#fc1e1e;padding:22px 24px;color:#ffffff;">
                <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.9;">On-demand order</div>
                <div style="font-size:24px;font-weight:800;margin-top:6px;">🍴 NEW FITARRITO ORDER</div>
                <div style="margin-top:10px;display:inline-block;background:#ffffff;color:#fc1e1e;border-radius:999px;padding:6px 12px;font-weight:800;font-size:14px;">
                  Order #${escapeHtml(input.orderId)}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:16px;background:#fff5f5;border-radius:12px;vertical-align:top;width:50%;">
                      <div style="font-size:11px;font-weight:800;letter-spacing:0.06em;color:#fc1e1e;text-transform:uppercase;">Customer details</div>
                      <div style="margin-top:8px;font-size:16px;font-weight:700;color:#111827;">${escapeHtml(input.customerName)}</div>
                      <div style="margin-top:4px;font-size:14px;color:#4b5563;">${escapeHtml(formatPhone(input.customerPhone))}</div>
                    </td>
                  </tr>
                  <tr><td style="height:12px;"></td></tr>
                  <tr>
                    <td style="padding:16px;background:#f9fafb;border-radius:12px;">
                      <div style="font-size:11px;font-weight:800;letter-spacing:0.06em;color:#fc1e1e;text-transform:uppercase;">Delivery location</div>
                      <div style="margin-top:8px;font-size:16px;font-weight:700;color:#111827;line-height:1.5;">
                        ${escapeHtml(input.deliveryLocation)}
                      </div>
                    </td>
                  </tr>
                </table>

                <div style="margin:22px 0 10px;font-size:11px;font-weight:800;letter-spacing:0.06em;color:#fc1e1e;text-transform:uppercase;">Order items</div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f3f4f6;border-radius:12px;overflow:hidden;">
                  <tr style="background:#111827;color:#ffffff;">
                    <th align="left" style="padding:10px;font-size:12px;">Item</th>
                    <th align="left" style="padding:10px;font-size:12px;">Protein</th>
                    <th align="left" style="padding:10px;font-size:12px;">Size</th>
                    <th align="center" style="padding:10px;font-size:12px;">Qty</th>
                    <th align="right" style="padding:10px;font-size:12px;">Unit</th>
                    <th align="right" style="padding:10px;font-size:12px;">Amount</th>
                  </tr>
                  ${itemRows}
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;background:#fff5f5;border-radius:12px;">
                  <tr>
                    <td style="padding:16px;">
                      <div style="font-size:11px;font-weight:800;letter-spacing:0.06em;color:#fc1e1e;text-transform:uppercase;">Pricing</div>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;font-size:14px;color:#374151;">
                        <tr>
                          <td style="padding:4px 0;">Subtotal</td>
                          <td align="right" style="padding:4px 0;">${escapeHtml(formatRupees(Number(input.subtotal)))}</td>
                        </tr>
                        <tr>
                          <td style="padding:4px 0;">${escapeHtml(GST_LABEL)}</td>
                          <td align="right" style="padding:4px 0;">${escapeHtml(formatRupees(Number(input.gst)))}</td>
                        </tr>
                        <tr>
                          <td style="padding:4px 0;">Delivery Charge</td>
                          <td align="right" style="padding:4px 0;">${escapeHtml(formatRupees(Number(input.deliveryCharge)))}</td>
                        </tr>
                        <tr>
                          <td style="padding:10px 0 0;font-size:18px;font-weight:800;color:#111827;">Total</td>
                          <td align="right" style="padding:10px 0 0;font-size:18px;font-weight:800;color:#fc1e1e;">${escapeHtml(formatRupees(Number(input.total)))}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <div style="margin-top:16px;padding:14px 16px;border-radius:12px;background:#f9fafb;font-size:14px;color:#111827;">
                  <strong>Payment:</strong> ${escapeHtml(paymentLabel(input.paymentMethod))}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 24px 24px;text-align:center;color:#6b7280;">
                <div style="font-weight:800;color:#111827;font-size:16px;">FITARRITO</div>
                <div style="margin-top:4px;font-size:13px;">From Seoul to Salsa</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendNewOrderEmail(input: NewOrderEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error(
      `Order email skipped for order ${input.orderId}: RESEND_API_KEY is missing.`,
    );
    return { sent: false as const };
  }

  const to = process.env.FITARRITO_EMAIL || "fitarrito@gmail.com";
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: "Fitarrito Orders <orders@fitarrito.com>",
    to: [to],
    subject: `🍴 New Fitarrito Order #${input.orderId}`,
    html: buildNewOrderEmailHtml(input),
  });

  if (error) {
    throw error;
  }

  return { sent: true as const };
}
