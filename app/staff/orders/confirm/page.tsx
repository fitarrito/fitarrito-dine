"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FaCheck, FaExclamationTriangle, FaLock } from "react-icons/fa";
import { fetchJson } from "@lib/apiFetch";
import { formatRupees } from "@lib/razorpayFee";
import styles from "./confirm.module.css";

type StaffOrder = {
  id: string | number;
  customerName: string;
  deliveryLocation: string;
  total: number;
  paymentMethod: string;
  status: string;
  createdAt?: string | null;
};

type InspectResponse = {
  order: StaffOrder;
};

type ConfirmResponse = {
  success: true;
  alreadyConfirmed: boolean;
  orderId: string | number;
  status: string;
};

function paymentLabel(method: string) {
  const normalized = method.toLowerCase();

  if (normalized === "razorpay") return "Razorpay";
  if (normalized === "qr") return "QR / Online Payment";
  if (normalized === "cash") return "Cash";

  return method;
}

function StaffOrderConfirmationContent() {
  const token = useSearchParams().get("token");
  const [order, setOrder] = useState<StaffOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [alreadyConfirmed, setAlreadyConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    fetchJson<InspectResponse>("/api/staff/orders/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "inspect", token }),
    })
      .then(({ order: loadedOrder }) => {
        if (cancelled) return;

        setOrder(loadedOrder);

        if (loadedOrder.status === "confirmed") {
          setConfirmed(true);
          setAlreadyConfirmed(true);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to validate this confirmation link.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const confirmOrder = async () => {
    if (!token || isConfirming) return;

    setIsConfirming(true);
    setError(null);

    try {
      const result = await fetchJson<ConfirmResponse>(
        "/api/staff/orders/confirm",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "confirm", token }),
        },
      );

      setConfirmed(result.success);
      setAlreadyConfirmed(result.alreadyConfirmed);
      setOrder((current) =>
        current ? { ...current, status: result.status } : current,
      );
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : "Unable to confirm this order.",
      );
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoading) {
    return (
      <section className={styles.card} aria-live="polite">
        <div className={styles.loader} aria-hidden />
        <p>Validating secure confirmation link...</p>
      </section>
    );
  }

  if (!token || (!order && error)) {
    return (
      <section className={styles.card}>
        <span className={styles.errorIcon}>
          <FaExclamationTriangle aria-hidden />
        </span>
        <h1>Confirmation unavailable</h1>
        <p>{error || "This confirmation link is missing or invalid."}</p>
      </section>
    );
  }

  if (!order) return null;

  if (confirmed) {
    return (
      <section className={styles.card}>
        <span className={styles.successIcon}>
          <FaCheck aria-hidden />
        </span>
        <h1>{alreadyConfirmed ? "Order Already Confirmed" : "Order Confirmed"}</h1>
        <p>
          Order <strong>#{order.id}</strong> is confirmed and ready for staff
          preparation.
        </p>
        <div className={styles.statusBadge}>Confirmed</div>
      </section>
    );
  }

  const canConfirm = order.status === "pending";

  return (
    <section className={styles.card}>
      <span className={styles.lockIcon}>
        <FaLock aria-hidden />
      </span>
      <p className={styles.eyebrow}>Secure staff confirmation</p>
      <h1>Confirm Order #{order.id}</h1>

      <div className={styles.orderDetails}>
        <div>
          <span>Customer</span>
          <strong>{order.customerName}</strong>
        </div>
        <div>
          <span>Delivery Location</span>
          <strong>{order.deliveryLocation}</strong>
        </div>
        <div>
          <span>Payment Method</span>
          <strong>{paymentLabel(order.paymentMethod)}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong className={styles.total}>{formatRupees(order.total)}</strong>
        </div>
      </div>

      {error ? <p className={styles.errorMessage}>{error}</p> : null}

      {canConfirm ? (
        <button
          type="button"
          className={styles.confirmButton}
          onClick={() => void confirmOrder()}
          disabled={isConfirming}
        >
          {isConfirming ? "Confirming..." : "Confirm Order"}
        </button>
      ) : (
        <p className={styles.errorMessage}>
          This order cannot be confirmed because its current status is{" "}
          <strong>{order.status}</strong>.
        </p>
      )}

      <p className={styles.securityNote}>
        Confirmation changes the kitchen order status only. It does not change
        or verify payment status.
      </p>
    </section>
  );
}

export default function StaffOrderConfirmationPage() {
  return (
    <main className={styles.page}>
      <Suspense
        fallback={
          <section className={styles.card}>
            <div className={styles.loader} aria-hidden />
            <p>Validating secure confirmation link...</p>
          </section>
        }
      >
        <StaffOrderConfirmationContent />
      </Suspense>
    </main>
  );
}
