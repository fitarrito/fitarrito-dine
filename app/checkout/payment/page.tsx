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
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaPen,
  FaPhone,
  FaQrcode,
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
import { normalizeIndianPhone } from "@lib/normalizePhone";
import { placeRestaurantOrder } from "@lib/placeRestaurantOrder";
import {
  openRazorpayCheckout,
  PaymentCancelledError,
  PaymentFailedError,
} from "@lib/razorpayCheckout";
import { useAppDispatch, useAppSelector } from "@lib/hooks";
import styles from "./payment.module.css";

type PaymentMethod = "razorpay" | "upi_qr" | "cash";

function formatPhone(mobileNumber: string) {
  const digits = mobileNumber.replace(/\D/g, "").slice(-10);

  if (digits.length !== 10) return mobileNumber;

  return `+91 ${digits}`;
}

export default function CheckoutPaymentPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((state) => state.cart.cartItems);
  const loading = useAppSelector((state) => state.cart.loading);
  const totalAmount = useAppSelector((state) => state.cart.totalAmt);
  const completingRef = useRef(false);
  const [delivery, setDelivery] = useState<CheckoutDelivery | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("razorpay");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitLabel, setSubmitLabel] = useState("Pay Now");

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

  const finishOrder = async (
    method: PaymentMethod,
    paymentIds?: { razorpayOrderId?: string; razorpayPaymentId?: string },
  ) => {
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
      landmark: delivery.landmark,
      deliveryInstructions: delivery.deliveryInstructions,
      paymentMethod: method,
      razorpayOrderId: paymentIds?.razorpayOrderId,
      razorpayPaymentId: paymentIds?.razorpayPaymentId,
    });

    completingRef.current = true;
    clearCheckoutDelivery();
    dispatch(clearCart());
    router.push(`/menu?orderSuccess=${encodeURIComponent(result.orderId)}`);
  };

  const handlePay = async () => {
    if (!delivery || isSubmitting) return;

    setFormError(null);
    setIsSubmitting(true);

    try {
      if (paymentMethod !== "razorpay") {
        setSubmitLabel("Placing order...");
        await finishOrder(paymentMethod);
        return;
      }

      const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      if (!razorpayKeyId) {
        throw new Error(
          "Razorpay is not configured. Add NEXT_PUBLIC_RAZORPAY_KEY_ID.",
        );
      }

      const amountPaise = Math.round(totalAmount * 100);

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

      const payment = await openRazorpayCheckout({
        key: razorpayKeyId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: "Fitarrito",
        description: "Order payment",
        order_id: razorpayOrder.order_id,
        prefill: {
          name: delivery.fullName.trim(),
          contact: delivery.mobileNumber.trim(),
        },
        theme: { color: "#fc1e1e" },
      });

      setSubmitLabel("Verifying payment...");

      const verification = await fetchJson<{ success: boolean }>(
        "/api/verify-payment",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: payment.razorpay_order_id,
            razorpay_payment_id: payment.razorpay_payment_id,
            razorpay_signature: payment.razorpay_signature,
          }),
        },
      );

      if (!verification.success) {
        throw new PaymentFailedError(
          "Payment could not be verified. Your order was not placed.",
        );
      }

      setSubmitLabel("Placing order...");
      await finishOrder("razorpay", {
        razorpayOrderId: payment.razorpay_order_id,
        razorpayPaymentId: payment.razorpay_payment_id,
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

  const payLabel =
    paymentMethod === "razorpay"
      ? `Pay ₹${totalAmount} Securely`
      : "Place Order";
  const buttonHint =
    paymentMethod === "razorpay"
      ? "You will be redirected to Razorpay to complete the payment"
      : paymentMethod === "upi_qr"
        ? "Pay using UPI when your order is delivered"
        : "Pay in cash when you receive your order";

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
                <h1 className={styles.title}>Delivery Address</h1>
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
            <p className={styles.addressLine}>
              {delivery.address}
              <br />
              {delivery.area}, {delivery.city} - {delivery.pincode}
            </p>
            {delivery.landmark ? (
              <p className={styles.metaRow}>
                <FaMapMarkerAlt className={styles.metaIcon} aria-hidden />
                {delivery.landmark}
              </p>
            ) : null}
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
                    Choose a payment option to complete your order
                  </p>
                </div>
              </div>
            </header>

            <div className={styles.methods} role="radiogroup" aria-label="Payment method">
              <label
                className={`${styles.method} ${
                  paymentMethod === "razorpay" ? styles.methodSelected : ""
                }`}
              >
                <input
                  className={styles.radio}
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === "razorpay"}
                  onChange={() => setPaymentMethod("razorpay")}
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
                    <FaCcVisa className={`${styles.brandIcon} ${styles.brandVisa}`} aria-label="Visa" />
                    <FaCcMastercard
                      className={`${styles.brandIcon} ${styles.brandMastercard}`}
                      aria-label="Mastercard"
                    />
                    <span className={styles.brandLabel}>RuPay</span>
                    <FaCcAmex className={`${styles.brandIcon} ${styles.brandAmex}`} aria-label="American Express" />
                    <span className={styles.brandLabel}>GPay</span>
                  </span>
                </span>
              </label>

              <label
                className={`${styles.method} ${
                  paymentMethod === "upi_qr" ? styles.methodSelected : ""
                }`}
              >
                <input
                  className={styles.radio}
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === "upi_qr"}
                  onChange={() => setPaymentMethod("upi_qr")}
                />
                <span className={styles.methodIcon}>
                  <FaQrcode aria-hidden />
                </span>
                <span className={styles.methodBody}>
                  <p className={styles.methodTitle}>Scan & Pay (UPI QR at delivery)</p>
                  <p className={styles.methodHint}>
                    Pay using UPI at the time of delivery
                  </p>
                </span>
              </label>

              <label
                className={`${styles.method} ${
                  paymentMethod === "cash" ? styles.methodSelected : ""
                }`}
              >
                <input
                  className={styles.radio}
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === "cash"}
                  onChange={() => setPaymentMethod("cash")}
                />
                <span className={styles.methodIcon}>
                  <FaMoneyBillWave aria-hidden />
                </span>
                <span className={styles.methodBody}>
                  <p className={styles.methodTitle}>Cash on Delivery</p>
                  <p className={styles.methodHint}>
                    Pay when you receive your order
                  </p>
                </span>
              </label>
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
