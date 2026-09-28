export class PaymentCancelledError extends Error {
  constructor(message = "Payment cancelled.") {
    super(message);
    this.name = "PaymentCancelledError";
  }
}

export class PaymentFailedError extends Error {
  constructor(message = "Payment failed.") {
    super(message);
    this.name = "PaymentFailedError";
  }
}

export type RazorpayCheckoutSuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayFailedResponse = {
  error?: {
    description?: string;
    reason?: string;
  };
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number | string;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayCheckoutSuccess) => void;
  modal?: {
    ondismiss?: () => void;
  };
};

type RazorpayInstance = {
  open: () => void;
  on: (
    event: "payment.failed",
    handler: (response: RazorpayFailedResponse) => void,
  ) => void;
};

type RazorpayConstructor = new (options: RazorpayCheckoutOptions) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const CHECKOUT_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

export function loadRazorpayCheckout() {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Razorpay Checkout can only be used in the browser."),
    );
  }

  if (window.Razorpay) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${CHECKOUT_SCRIPT_SRC}"]`,
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Razorpay Checkout.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Razorpay Checkout."));
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(
  options: Omit<RazorpayCheckoutOptions, "handler" | "modal">,
) {
  await loadRazorpayCheckout();

  const RazorpayCheckout = window.Razorpay;

  if (!RazorpayCheckout) {
    throw new Error("Razorpay Checkout is unavailable.");
  }

  return new Promise<RazorpayCheckoutSuccess>((resolve, reject) => {
    let settled = false;

    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      action();
    };

    const razorpay = new RazorpayCheckout({
      ...options,
      handler: (response) => {
        finish(() => resolve(response));
      },
      modal: {
        ondismiss: () => {
          finish(() => reject(new PaymentCancelledError()));
        },
      },
    });

    razorpay.on("payment.failed", (response) => {
      finish(() =>
        reject(
          new PaymentFailedError(
            response.error?.description ||
              response.error?.reason ||
              "Payment failed.",
          ),
        ),
      );
    });

    razorpay.open();
  });
}
