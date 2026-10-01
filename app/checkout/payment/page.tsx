"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import {
  FaCcAmex,
  FaCcMastercard,
  FaCcVisa,
  FaCreditCard,
  FaHome,
  FaPen,
  FaPhone,
  FaShieldAlt,
} from "react-icons/fa";
import CheckoutSteps from "@/components/checkout/CheckoutSteps";
import OrderSummaryPanel from "@/components/checkout/OrderSummaryPanel";
import { fetchCart, clearCart } from "@lib/features/cartSlice";
import { getCartSession } from "@lib/cartSession";
import { fetchJson } from "@lib/apiFetch";
import {
  isCheckoutDeliveryComplete,
  loadCheckoutDelivery,
  clearCheckoutDelivery,
  type CheckoutDelivery,
} from "@lib/checkoutDelivery";
import {
  clearVerifiedPayment,
  loadVerifiedPayment,
  saveVerifiedPayment,
} from "@lib/verifiedPayment";
import { normalizeIndianPhone } from "@lib/normalizePhone";
import { placeRestaurantOrder } from "@lib/placeRestaurantOrder";
import {
  isRazorpayTestKey,
  openRazorpayCheckout,
  PaymentCancelledError,
  PaymentFailedError,
} from "@lib/razorpayCheckout";
import { formatRupees } from "@lib/razorpayFee";
import { calculateOrderTotals } from "@lib/orderTotals";
import { useAppDispatch, useAppSelector } from "@lib/hooks";
import styles from "./payment.module.css";

function formatPhone(mobileNumber: string) {
  const digits = mobileNumber.replace(/\D/g, "").slice(-10);

  if (digits.length !== 10) return mobileNumber;

  return `+91 ${digits}`;
}

function checkoutContact(mobileNumber: string) {
  const digits = mobileNumber.replace(/\D/g, "").slice(-10);

  return digits.length === 10 ? `+91${digits}` : mobileNumber.trim();
}

export default function CheckoutPaymentPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((state) => state.cart.cartItems);
  const loading = useAppSelector((state) => state.cart.loading);
  const totalAmount = useAppSelector((state) => state.cart.totalAmt);
  const completingRef = useRef(false);
  const [delivery, setDelivery] = useState<CheckoutDelivery | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitLabel, setSubmitLabel] = useState("Pay Now");
  const handledReturnRef = useRef(false);

  useEffect(() => {
    dispatch(fetchCart(getCartSession()));
    const saved = loadCheckoutDelivery();

    if (!saved || !isCheckoutDeliveryComplete(saved)) {
      router.replace("/checkout");
      return;
    }

    setDelivery(saved);
  }, [dispatch, router]);

  useEffect(() => {
    if (loading === "idle" || loading === "pending") return;

    if (cartItems.length === 0) {
      router.replace("/menu");
    }
  }, [cartItems.length, loading, router]);

  const finishOrder = async (paymentIds?: {
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
  }) => {
    if (!delivery) return;

    const session = getCartSession();
    const result = await placeRestaurantOrder({
      sessionId: session.sessionId,
      customerName: delivery.fullName,
      customerPhone: normalizeIndianPhone(delivery.mobileNumber),
      addressLine1: delivery.address,
      area: delivery.area,
      city: delivery.city,
      pincode: delivery.pincode,
      deliveryInstructions: delivery.deliveryInstructions,
      paymentMethod: "razorpay",
      razorpayOrderId: paymentIds?.razorpayOrderId,
      razorpayPaymentId: paymentIds?.razorpayPaymentId,
      razorpaySignature: paymentIds?.razorpaySignature,
    });

    completingRef.current = true;
    clearCheckoutDelivery();
    clearVerifiedPayment();
    dispatch(clearCart());
    router.push(
      `/order-success?orderId=${encodeURIComponent(result.orderId)}`,
    );
  };

  const completePaidOrder = async (payment: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => {
    setSubmitLabel("Verifying payment...");

    const verification = await fetchJson<{ success: boolean }>(
      "/api/verify-payment",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payment),
      },
    );

    if (!verification.success) {
      clearVerifiedPayment();
      throw new PaymentFailedError(
        "Payment could not be verified. Your order was not placed.",
      );
    }

    saveVerifiedPayment(payment);
    setSubmitLabel("Placing order...");
    await finishOrder({
      razorpayOrderId: payment.razorpay_order_id,
      razorpayPaymentId: payment.razorpay_payment_id,
      razorpaySignature: payment.razorpay_signature,
    });
  };

  useEffect(() => {
    if (!delivery || handledReturnRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const paymentError = params.get("payment_error");
    const paymentReason = params.get("payment_reason");
    const razorpayPaymentId = params.get("razorpay_payment_id");
    const razorpayOrderId = params.get("razorpay_order_id");
    const razorpaySignature = params.get("razorpay_signature");

    if (paymentError || paymentReason) {
      handledReturnRef.current = true;
      window.history.replaceState({}, "", "/checkout/payment");
      setFormError(
        paymentReason === "authentication_failed" ||
          /authentication failed/i.test(paymentError ?? "")
          ? "UPI authentication failed. GPay, PhonePe, and other UPI apps only work with live Razorpay keys. In test mode, choose UPI and enter success@razorpay instead of opening a UPI app."
          : paymentError || "Payment failed. Your order was not placed.",
      );
      return;
    }

    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) return;

    handledReturnRef.current = true;
    window.history.replaceState({}, "", "/checkout/payment");
    setIsSubmitting(true);

    void completePaidOrder({
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    })
      .catch((error: unknown) => {
        setFormError(
          error instanceof Error
            ? error.message
            : "Something went wrong while placing your order.",
        );
      })
      .finally(() => {
        setIsSubmitting(false);
        setSubmitLabel("Pay Now");
      });
  }, [delivery]);

  const handlePay = async () => {
    if (!delivery || isSubmitting) return;

    setFormError(null);
    setIsSubmitting(true);

    try {
      const existingPayment = loadVerifiedPayment();

      if (existingPayment) {
        await completePaidOrder(existingPayment);
        return;
      }

      const amountPaise = calculateOrderTotals(totalAmount).customerPaise;

      if (amountPaise < 100) {
        throw new Error("Order total is too low to pay online.");
      }

      setSubmitLabel("Opening payment...");

      const session = getCartSession();
      const receipt = `fit_${session.sessionId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}_${Date.now().toString(36)}`.slice(
        0,
        40,
      );

      const razorpayOrder = await fetchJson<{
        order_id: string;
        amount: number | string;
        currency: string;
        key_id?: string;
      }>("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt,
          sessionId: session.sessionId,
        }),
      });

      const checkoutKey =
        razorpayOrder.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      if (!checkoutKey) {
        throw new Error(
          "Razorpay is not configured. Add RAZORPAY_KEY_ID and NEXT_PUBLIC_RAZORPAY_KEY_ID.",
        );
      }

      const payment = await openRazorpayCheckout({
        key: checkoutKey,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: "Fitarrito",
        description: "Order payment",
        order_id: razorpayOrder.order_id,
        callback_url: `${window.location.origin}/api/razorpay/callback`,
        timeout: 300,
        retry: { enabled: true },
        prefill: {
          name: delivery.fullName.trim(),
          contact: checkoutContact(delivery.mobileNumber),
        },
        notes: {
          checkout: "fitarrito-dine",
        },
        theme: { color: "#fc1e1e" },
      });

      await completePaidOrder({
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: payment.razorpay_payment_id,
        razorpay_signature: payment.razorpay_signature,
      });
    } catch (error) {
      if (error instanceof PaymentCancelledError) {
        setFormError("Payment cancelled. Your order was not placed.");
      } else if (error instanceof PaymentFailedError) {
        setFormError(error.message);
      } else {
        setFormError(
          error instanceof Error
            ? error.message
            : "Something went wrong while placing your order.",
        );
      }
    } finally {
      setIsSubmitting(false);
      setSubmitLabel("Pay Now");
    }
  };

  if (!delivery || (loading === "pending" && cartItems.length === 0)) {
    return <p className={styles.loading}>Loading payment...</p>;
  }

  const existingPayment = loadVerifiedPayment();
  const payableAmount = calculateOrderTotals(totalAmount).total;
  const payLabel = existingPayment
    ? "Complete Order"
    : `Pay ${formatRupees(payableAmount)} Securely`;
  const buttonHint = existingPayment
    ? "Payment received. Click to finish placing your order."
    : "You will be redirected to Razorpay to complete the payment";

  return (
    <div className={styles.page}>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
      <CheckoutSteps currentStep={3} />

      <div className={styles.layout}>
        <div className={styles.stack}>
          <section className={styles.card}>
            <header className={styles.cardHeader}>
              <div className={styles.cardTitle}>
                <span className={styles.homeIcon}>
                  <FaHome aria-hidden />
                </span>
                <h1 className={styles.title}>Delivery Location</h1>
              </div>
              <button
                type="button"
                className={styles.editButton}
                onClick={() => router.push("/checkout")}
              >
                <FaPen aria-hidden />
                Edit
              </button>
            </header>

            <p className={styles.customerName}>{delivery.fullName}</p>
            <p className={styles.addressLine}>{delivery.area}</p>
            <p className={styles.metaRow}>
              <FaPhone className={styles.metaIcon} aria-hidden />
              {formatPhone(delivery.mobileNumber)}
            </p>
          </section>

          <section className={styles.card}>
            <header className={styles.cardHeader}>
              <div className={styles.cardTitle}>
                <span className={styles.homeIcon}>
                  <FaCreditCard aria-hidden />
                </span>
                <div>
                  <h2 className={styles.title}>Payment Method</h2>
                  <p className={styles.subtitle}>
                    Pay securely online to complete your order
                  </p>
                </div>
              </div>
            </header>

            <div className={styles.methods} aria-label="Payment method">
              <div className={`${styles.method} ${styles.methodSelected}`}>
                <input
                  className={styles.radio}
                  type="radio"
                  name="paymentMethod"
                  checked
                  readOnly
                />
                <span className={styles.methodIcon}>
                  <FaCreditCard aria-hidden />
                </span>
                <span className={styles.methodBody}>
                  <p className={styles.methodTitle}>Pay Online (Razorpay)</p>
                  <p className={styles.methodHint}>
                    Cards, UPI, Net Banking, Wallets
                  </p>
                  <span className={styles.brands}>
                    <span className={styles.brandLabel}>UPI</span>
                    <span className={styles.brandLabel}>
                      <FaCcVisa className={`${styles.brandIcon} ${styles.brandVisa}`} aria-label="Visa" />
                    </span>
                    <span className={styles.brandLabel}>
                      <FaCcMastercard
                        className={`${styles.brandIcon} ${styles.brandMastercard}`}
                        aria-label="Mastercard"
                      />
                    </span>
                    <span className={styles.brandLabel}>RuPay</span>
                    <span className={styles.brandLabel}>
                      <FaCcAmex className={`${styles.brandIcon} ${styles.brandAmex}`} aria-label="American Express" />
                    </span>
                    <span className={styles.brandLabel}>GPay</span>
                  </span>
                </span>
              </div>
            </div>
          </section>

          <div className={styles.secureBanner}>
            <FaShieldAlt className={styles.secureIcon} aria-hidden />
            <div>
              <p className={styles.secureCopy}>100% Secure Payments</p>
              <p className={styles.secureHint}>
                Your payment information is encrypted and safe with Razorpay
              </p>
            </div>
            <span className={styles.razorpayMark}>Razorpay</span>
          </div>

          {formError ? <p className={styles.formError}>{formError}</p> : null}
          {isRazorpayTestKey(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "") ? (
            <p className={styles.testHint}>
              Test mode: GPay and PhonePe will show authentication failed. Choose
              UPI and enter <strong>success@razorpay</strong>.
            </p>
          ) : null}
        </div>

        <OrderSummaryPanel
          variant="payment"
          onPlaceOrder={() => void handlePay()}
          placeOrderDisabled={cartItems.length === 0 || isSubmitting}
          isSubmitting={isSubmitting}
          submitLabel={isSubmitting ? submitLabel : payLabel}
          buttonHint={buttonHint}
        />
      </div>
    </div>
  );
}
