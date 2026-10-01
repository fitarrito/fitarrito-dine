"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FaCheck,
  FaMapMarkerAlt,
  FaPhone,
  FaReceipt,
  FaShoppingBag,
} from "react-icons/fa";
import { fetchJson } from "@lib/apiFetch";
import { getCartSession } from "@lib/cartSession";
import { formatRupees } from "@lib/razorpayFee";
import styles from "./order-success.module.css";

type OrderItem = {
  id: string | number;
  name: string;
  protein?: string | null;
  unitPrice: number;
  quantity: number;
};

type OrderDetails = {
  order: {
    id: string;
    customerName: string;
    customerPhone: string;
    deliveryLocation: string;
    deliveryInstructions?: string | null;
    subtotal: number;
    deliveryCharge: number;
    total: number;
    paymentMethod: string;
    status: string;
    createdAt?: string | null;
  };
  items: OrderItem[];
};

function paymentLabel(method: string) {
  const normalized = method.toLowerCase();

  if (normalized === "razorpay" || normalized === "qr") {
    return "Online Payment";
  }

  return method;
}

function formatPhone(phone: string) {
  const digits = phone.replace(/^\+91/, "").replace(/\D/g, "");
  return digits.length === 10 ? `+91 ${digits}` : phone;
}

function formatOrderTime(value?: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [details, setDetails] = useState<OrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;

    fetchJson<OrderDetails>("/api/orders/details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        sessionId: getCartSession().sessionId,
      }),
    })
      .then((result) => {
        if (!cancelled) setDetails(result);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load your order.",
          );
        }
      });

    return () => {
      cancelled = true;
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
  const tax = Math.max(
    0,
    Math.round(
      (order.total - order.subtotal - order.deliveryCharge) * 100,
    ) / 100,
  );
  const placedAt = formatOrderTime(order.createdAt);

  return (
    <section className={styles.successCard}>
      <header className={styles.successHeader}>
        <span className={styles.successIcon}>
          <FaCheck aria-hidden />
        </span>
        <h1>Order Placed Successfully!</h1>
        <p>Thank you for choosing Fitarrito. We’ll prepare your order soon.</p>
      </header>

      <div className={styles.orderMeta}>
        <div>
          <span>Order ID</span>
          <strong>#{order.id}</strong>
          {placedAt ? <small>{placedAt}</small> : null}
        </div>
        <div>
          <span>Order Type</span>
          <strong>Delivery</strong>
        </div>
        <div>
          <span>Payment Method</span>
          <strong>{paymentLabel(order.paymentMethod)}</strong>
        </div>
        <div>
          <span>Total Amount</span>
          <strong className={styles.totalHighlight}>
            {formatRupees(order.total)}
          </strong>
        </div>
      </div>

      <div className={styles.customerGrid}>
        <div className={styles.infoCard}>
          <FaShoppingBag aria-hidden />
          <div>
            <span>Customer</span>
            <strong>{order.customerName}</strong>
          </div>
        </div>
        <div className={styles.infoCard}>
          <FaPhone aria-hidden />
          <div>
            <span>Phone</span>
            <strong>{formatPhone(order.customerPhone)}</strong>
          </div>
        </div>
        <div className={styles.infoCard}>
          <FaMapMarkerAlt aria-hidden />
          <div>
            <span>Delivery Location</span>
            <strong>{order.deliveryLocation}</strong>
          </div>
        </div>
      </div>

      <div className={styles.itemsSection}>
        <h2>
          <FaReceipt aria-hidden />
          Order Items
        </h2>
        <div className={styles.itemList}>
          {items.map((item) => (
            <div className={styles.itemRow} key={item.id}>
              <div>
                <strong>{item.name}</strong>
                {item.protein ? <span>{item.protein}</span> : null}
                <span>Qty: {item.quantity}</span>
              </div>
              <strong>
                {formatRupees(item.unitPrice * item.quantity)}
              </strong>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.pricing}>
        <div>
          <span>Subtotal</span>
          <span>{formatRupees(order.subtotal)}</span>
        </div>
        {tax > 0 ? (
          <div>
            <span>GST</span>
            <span>{formatRupees(tax)}</span>
          </div>
        ) : null}
        {order.deliveryCharge > 0 ? (
          <div>
            <span>Delivery Charge</span>
            <span>{formatRupees(order.deliveryCharge)}</span>
          </div>
        ) : null}
        <div className={styles.grandTotal}>
          <span>Total</span>
          <strong>{formatRupees(order.total)}</strong>
        </div>
      </div>

      <div className={styles.actions}>
        <Link href="/menu" className={styles.secondaryButton}>
          Back to Menu
        </Link>
        <Link href="/menu" className={styles.primaryButton}>
          Place Another Order
        </Link>
      </div>

      <div className={styles.deliveryNote}>
        <FaMapMarkerAlt aria-hidden />
        <div>
          <strong>Delivery to {order.deliveryLocation}</strong>
          <span>We’ll start preparing your order shortly.</span>
        </div>
      </div>
    </section>
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
        <OrderSuccessContent />
      </Suspense>
    </div>
  );
}
