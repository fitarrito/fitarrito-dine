"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FaCheck,
  FaClock,
  FaMapMarkerAlt,
  FaPhone,
  FaShoppingBag,
  FaSyncAlt,
  FaUtensils,
  FaWhatsapp,
} from "react-icons/fa";
import { fetchJson } from "@lib/apiFetch";
import { getCartSession } from "@lib/cartSession";
import { formatRupees } from "@lib/razorpayFee";
import { getWhatsAppKitchenPhone } from "@lib/whatsapp/send-order";
import styles from "./order-success.module.css";

type OrderItem = {
  id: string | number;
  name: string;
  protein?: string | null;
  unitPrice: number;
  quantity: number;
  imageUrl?: string | null;
};

type OrderDetails = {
  order: {
    id: string;
    customerName: string;
    customerPhone: string;
    deliveryLocation: string;
    subtotal: number;
    deliveryCharge: number;
    total: number;
    paymentMethod: string;
    status: string;
    createdAt?: string | null;
    updatedAt?: string | null;
    preparationLabel?: string | null;
  };
  items: OrderItem[];
};

const STEPS = [
  {
    key: "placed",
    title: "Order Placed",
    detail: "We have received your order.",
  },
  {
    key: "confirmed",
    title: "Confirmed",
    detail: "Your order has been confirmed by Fitarrito.",
  },
  {
    key: "preparing",
    title: "Preparing",
    detail: "Your food is being prepared now.",
  },
  {
    key: "ready",
    title: "Ready for Delivery",
    detail: "Your order will be out for delivery soon.",
  },
] as const;

function currentStep(status: string) {
  if (status === "confirmed") return 2;
  if (status === "preparing" || status === "delivered") return 3;

  return 0;
}

function statusBadge(status: string) {
  if (status === "confirmed") return "On the way to being prepared";
  if (status === "preparing" || status === "delivered") return "Ready for delivery";
  if (status === "cancelled") return "Cancelled";

  return "Order placed";
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "").slice(-10);

  if (digits.length !== 10) return phone;

  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

function formatPlacedAt(value?: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function formatClock(value?: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function formatLastUpdated(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  const time = formatClock(value);
  const day = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
  const today = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  return day === today ? `Today, ${time}` : `${day}, ${time}`;
}

function stepTime(index: number, order: OrderDetails["order"]) {
  if (index === 0) return formatClock(order.createdAt);
  if (index === currentStep(order.status) && order.status !== "pending") {
    return formatClock(order.updatedAt ?? order.createdAt);
  }

  return null;
}

function StepIcon({
  index,
  state,
}: {
  index: number;
  state: "complete" | "current" | "upcoming";
}) {
  if (state === "complete") return <FaCheck aria-hidden />;
  if (index === 2) return <FaUtensils aria-hidden />;
  if (index === 3) return <FaShoppingBag aria-hidden />;

  return <FaCheck aria-hidden />;
}

function OrderTrackingContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [details, setDetails] = useState<OrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Order Tracking | Fitarrito";
  }, []);

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;
    let loaded = false;

    const load = () => {
      fetchJson<OrderDetails>("/api/orders/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          sessionId: getCartSession().sessionId,
        }),
      })
        .then((result) => {
          if (cancelled) return;
          loaded = true;
          setDetails(result);
          setError(null);
        })
        .catch((loadError) => {
          if (cancelled || loaded) return;

          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load your order.",
          );
        });
    };

    load();
    const intervalId = window.setInterval(load, 12000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [orderId]);

  if (!orderId) {
    return (
      <section className={styles.stateCard}>
        <h1>Order details unavailable</h1>
        <p>Order ID is missing.</p>
        <Link href="/menu" className={styles.primaryButton}>
          Back to Menu
        </Link>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.stateCard}>
        <h1>Order placed successfully</h1>
        <p>{error}</p>
        <Link href="/menu" className={styles.primaryButton}>
          Back to Menu
        </Link>
      </section>
    );
  }

  if (!details) {
    return (
      <section className={styles.stateCard} aria-live="polite">
        <div className={styles.loader} aria-hidden />
        <p>Loading your order details...</p>
      </section>
    );
  }

  const { order, items } = details;
  const activeStep = currentStep(order.status);
  const cancelled = order.status === "cancelled";
  const kitchenPhone = getWhatsAppKitchenPhone();
  const helpText = encodeURIComponent(
    `Hi Fitarrito, I need help with order #${order.id}.`,
  );
  const lastUpdated = formatLastUpdated(order.updatedAt ?? order.createdAt);

  return (
    <div className={styles.tracking}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Order Tracking</h1>
          <p>Here&apos;s the latest status of your order.</p>
        </div>
        {lastUpdated ? (
          <p className={styles.updated}>
            <FaSyncAlt aria-hidden />
            Last updated {lastUpdated}
          </p>
        ) : null}
      </header>

      <section className={styles.statusCard}>
        <div className={styles.statusTop}>
          <div>
            <h2>Order #{order.id}</h2>
            {order.createdAt ? (
              <p>Placed on {formatPlacedAt(order.createdAt)}</p>
            ) : null}
          </div>
          <span className={cancelled ? styles.badgeMuted : styles.badge}>
            {statusBadge(order.status)}
          </span>
        </div>

        {cancelled ? (
          <p className={styles.cancelledNote}>
            This order was cancelled. Contact us if you still need help.
          </p>
        ) : (
          <ol className={styles.timeline}>
            {STEPS.map((step, index) => {
              const state =
                index < activeStep
                  ? "complete"
                  : index === activeStep
                    ? "current"
                    : "upcoming";
              const time = stepTime(index, order);

              return (
                <li className={styles[state]} key={step.key}>
                  <div className={styles.marker}>
                    {index < STEPS.length - 1 ? (
                      <span
                        className={
                          index < activeStep ? styles.lineDone : styles.line
                        }
                      />
                    ) : null}
                    <span className={styles.circle}>
                      <StepIcon index={index} state={state} />
                    </span>
                  </div>
                  <strong>
                    {step.key === "preparing" && activeStep > 2 ? "Prepared" : step.title}
                  </strong>
                  {time ? <small>{time}</small> : <small>&nbsp;</small>}
                  <span>
                    {step.key === "preparing" && activeStep > 2
                      ? "Your order has been prepared."
                      : step.detail}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <div className={styles.columns}>
        <section className={styles.panel}>
          <h2>Order Details</h2>
          <div className={styles.detail}>
            <span className={styles.detailIcon}>
              <FaMapMarkerAlt aria-hidden />
            </span>
            <div>
              <span>Delivery to</span>
              <strong>{order.deliveryLocation || "Address unavailable"}</strong>
            </div>
          </div>
          <div className={styles.detail}>
            <span className={styles.detailIcon}>
              <FaPhone aria-hidden />
            </span>
            <div>
              <span>Contact</span>
              <strong>{formatPhone(order.customerPhone)}</strong>
            </div>
          </div>
          <div className={styles.detail}>
            <span className={styles.detailIcon}>
              <FaClock aria-hidden />
            </span>
            <div>
              <span>Estimated preparation time</span>
              <strong>{order.preparationLabel ?? "Waiting for the kitchen"}</strong>
              <small>This is an estimate and may vary during busy hours.</small>
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <h2>Items in this order</h2>
          <div className={styles.items}>
            {items.map((item) => (
              <div className={styles.item} key={item.id}>
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" />
                ) : (
                  <span className={styles.itemArt} aria-hidden />
                )}
                <div>
                  <strong>{item.name}</strong>
                  {item.protein ? <span>{item.protein}</span> : null}
                </div>
                <b>× {item.quantity}</b>
                <strong>{formatRupees(item.unitPrice * item.quantity)}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className={styles.help}>
        <div>
          <strong>Need help with your order?</strong>
          <span>For any changes or support, please contact us.</span>
        </div>
        <div className={styles.helpActions}>
          <a
            className={styles.whatsapp}
            href={`https://wa.me/${kitchenPhone}?text=${helpText}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaWhatsapp aria-hidden /> Chat on WhatsApp
          </a>
          <a className={styles.call} href={`tel:+${kitchenPhone}`}>
            <FaPhone aria-hidden /> Call {formatPhone(kitchenPhone)}
          </a>
        </div>
      </section>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <div className={styles.page}>
      <Suspense
        fallback={
          <section className={styles.stateCard}>
            <div className={styles.loader} aria-hidden />
            <p>Loading your order details...</p>
          </section>
        }
      >
        <OrderTrackingContent />
      </Suspense>
    </div>
  );
}
