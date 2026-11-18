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
import OnlineOrderingClosedNotice from "@/components/OnlineOrderingClosedNotice";
import OrderSummaryPanel from "@/components/checkout/OrderSummaryPanel";
import { fetchCart, clearCart } from "@lib/features/cartSlice";
import { getCartSession } from "@lib/cartSession";
import { fetchJson } from "@lib/apiFetch";
import {
  deliveryDisplayLocation,
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
import { unavailableCartMessage } from "@lib/menuVisibility";
import { normalizeIndianPhone } from "@lib/normalizePhone";
import {
  isRazorpayTestKey,
  openRazorpayCheckout,
  PaymentCancelledError,
  PaymentFailedError,
} from "@lib/razorpayCheckout";
import { formatRupees } from "@lib/razorpayFee";
import { calculateOrderTotals } from "@lib/orderTotals";
import { useAppDispatch, useAppSelector } from "@lib/hooks";
import { ONLINE_ORDERING_CLOSED_TITLE } from "@lib/onlineOrdering";
import { useOnlineOrdering } from "@lib/useOnlineOrdering";
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
  const ordering = useOnlineOrdering();
  const handledReturnRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    dispatch(fetchCart(getCartSession()));

    const loadDelivery = async () => {
      const saved = loadCheckoutDelivery();
      const response = await fetch("/api/delivery/zone");
      const zone = (await response.json()) as {
        latitude?: number;
        longitude?: number;
        error?: string;
      };

      if (cancelled) return;

      if (
        !response.ok ||
        typeof zone.latitude !== "number" ||
        typeof zone.longitude !== "number" ||
        !saved ||
        !isCheckoutDeliveryComplete(saved, {
          latitude: zone.latitude,
          longitude: zone.longitude,
        })
      ) {
        router.replace("/checkout");
        return;
      }

      setDelivery(saved);
    };

    void loadDelivery().catch(() => {
      if (!cancelled) router.replace("/checkout");
    });

    return () => {
      cancelled = true;
    };
  }, [dispatch, router]);

  useEffect(() => {
    if (completingRef.current) return;
    if (loading === "idle" || loading === "pending") return;

    if (cartItems.length === 0) {
      router.replace("/menu");
    }
  }, [cartItems.length, loading, router]);

  const showConfirmedOrder = (orderId: number | string) => {
    completingRef.current = true;
    clearCheckoutDelivery();
    clearVerifiedPayment();
    dispatch(clearCart());
    router.replace(`/order-success?orderId=${encodeURIComponent(String(orderId))}`);
  };

  const completePaidOrder = async (payment: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => {
    setSubmitLabel("Confirming order...");
    saveVerifiedPayment(payment);

    const confirmed = await fetchJson<{ orderId: number | string }>(
      "/api/orders/confirm",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpayOrderId: payment.razorpay_order_id,
          razorpayPaymentId: payment.razorpay_payment_id,
          razorpaySignature: payment.razorpay_signature,
        }),
      },
    );

    showConfirmedOrder(confirmed.orderId);
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

  const unavailableItems = cartItems.filter((item) => item.is_available === false);
  const unavailableMessage =
    unavailableItems.length > 0 ? unavailableCartMessage(unavailableItems) : null;

  const handlePay = async () => {
    if (!delivery || isSubmitting) return;

    if (ordering.enabled === false) {
      setFormError(ONLINE_ORDERING_CLOSED_TITLE);
      return;
    }

    if (unavailableMessage) {
      setFormError(unavailableMessage);
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const existingPayment = loadVerifiedPayment();

      if (existingPayment) {
        await completePaidOrder(existingPayment);
        return;
      }

      setSubmitLabel("Reserving order...");

      const session = getCartSession();
      const prepared = await fetchJson<{
        kind: "payment" | "already_paid";
        orderId: number;
        razorpayOrderId?: string;
        amount?: number;
        currency?: string;
        keyId?: string;
        total: number;
      }>("/api/orders/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.sessionId,
          customerName: delivery.fullName,
          customerPhone: normalizeIndianPhone(delivery.mobileNumber),
          addressLine1: delivery.address,
          area: delivery.area,
          city: delivery.city,
          pincode: delivery.pincode,
          landmark: delivery.landmark,
          latitude: delivery.latitude,
          longitude: delivery.longitude,
          special_requests:
            typeof delivery.specialRequests === "string"
              ? delivery.specialRequests.trim()
              : "",
          deliveryInstructions: delivery.deliveryInstructions,
        }),
      });

      if (prepared.kind === "already_paid") {
        showConfirmedOrder(prepared.orderId);
        return;
      }

      if (!prepared.razorpayOrderId || !prepared.amount || !prepared.currency || !prepared.keyId) {
        throw new Error("The payment order could not be opened.");
      }

      if (prepared.amount < 100) {
        throw new Error("Order total is too low to pay online.");
      }

      setSubmitLabel("Opening payment...");

      const payment = await openRazorpayCheckout({
        key: prepared.keyId,
        amount: prepared.amount,
        currency: prepared.currency,
        name: "Fitarrito",
        description: "Order payment",
        order_id: prepared.razorpayOrderId,
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
  const payableAmount = calculateOrderTotals(
    totalAmount,
    delivery.deliveryCharge ?? 0,
  ).total;
  const payLabel = existingPayment
    ? "Complete Order"
    : `Pay ${formatRupees(payableAmount)} Securely`;
  const buttonHint = unavailableMessage
    ? unavailableMessage
    : existingPayment
      ? "Payment received. Click to finish placing your order."
      : "You will be redirected to Razorpay to complete the payment";

  return (
    <div className={styles.page}>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
      <CheckoutSteps currentStep={3} />
      <OnlineOrderingClosedNotice />

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
            <p className={styles.addressLine}>{deliveryDisplayLocation(delivery)}</p>
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
          deliveryCharge={delivery.deliveryCharge}
          distanceKm={delivery.distanceKm}
          onPlaceOrder={() => void handlePay()}
          placeOrderDisabled={
            cartItems.length === 0 || isSubmitting || Boolean(unavailableMessage)
          }
          isSubmitting={isSubmitting}
          submitLabel={isSubmitting ? submitLabel : payLabel}
          buttonHint={buttonHint}
        />
      </div>
    </div>
  );
}
