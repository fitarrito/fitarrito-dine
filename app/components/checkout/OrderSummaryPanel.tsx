"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  FaArrowRight,
  FaLock,
  FaPen,
  FaShoppingCart,
  FaStore,
  FaTimes,
} from "react-icons/fa";
import { useAppDispatch, useAppSelector } from "@lib/hooks";
import { removeCartItem } from "@lib/features/cartSlice";
import { getCartSession } from "@lib/cartSession";
import { getMorningOpenLabel, getNightCloseLabel } from "@lib/orderCutoff";
import { getCartItemCustomization } from "@lib/fitarritoHouseMenu";
import { calculateOrderTotals, GST_LABEL } from "@lib/orderTotals";
import { formatRupees } from "@lib/razorpayFee";
import styles from "./OrderSummaryPanel.module.css";

type OrderSummaryPanelProps = {
  onPlaceOrder?: () => void;
  placeOrderDisabled?: boolean;
  isSubmitting?: boolean;
  submitLabel?: string;
  variant?: "delivery" | "payment";
  buttonHint?: string | null;
};

export default function OrderSummaryPanel({
  onPlaceOrder,
  placeOrderDisabled = false,
  isSubmitting = false,
  submitLabel,
  variant = "delivery",
  buttonHint = null,
}: OrderSummaryPanelProps) {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((state) => state.cart.cartItems);
  const subtotal = useAppSelector((state) => state.cart.totalAmt);
  const morningOpen = getMorningOpenLabel();
  const nightClose = getNightCloseLabel();
  const isPayment = variant === "payment";
  const totals = calculateOrderTotals(subtotal);
  const totalAmount = totals.total;
  const itemCount = cartItems.reduce((sum, item) => sum + Number(item.quantity), 0);
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const defaultLabel = isPayment
    ? `Pay ${formatRupees(totalAmount)} Securely`
    : "Place Order";

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) {
      setCouponMessage("Enter a coupon code.");
      return;
    }

    setCouponMessage("This coupon is not valid.");
  };

  return (
    <aside className={`${styles.panel} ${isPayment ? styles.panelSticky : ""}`}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <FaShoppingCart className={styles.cartIcon} aria-hidden />
          <h2>Order Summary</h2>
        </div>
        <Link href="/menu" className={styles.editCart}>
          <FaPen aria-hidden />
          Edit Cart
        </Link>
      </div>

      <ul className={styles.itemList}>
        {cartItems.map((item) => {
          const cartItemId =
            item.id ||
            `${item.title}-${item.selected_protein || "default"}-${item.selected_size || "regular"}`;
          const customization = getCartItemCustomization(item);

          return (
            <li key={cartItemId} className={styles.itemRow}>
              <div className={styles.itemImageWrap}>
                <Image
                  src={item.image_url ?? item.imageUrl ?? "/fallback-image.jpg"}
                  alt={item.title}
                  fill
                  sizes="56px"
                  className={styles.itemImage}
                />
              </div>

              <div className={styles.itemDetails}>
                <p className={styles.itemTitle}>{customization.title}</p>
                {customization.protein ? (
                  <p className={styles.itemMeta}>Protein: {customization.protein}</p>
                ) : null}
                {customization.toppings ? (
                  <p className={styles.itemMeta}>Toppings: {customization.toppings}</p>
                ) : null}
                {!isPayment ? (
                  <p className={styles.itemMeta}>Qty: {item.quantity}</p>
                ) : null}
              </div>

              <div className={styles.itemPricing}>
                <p className={styles.itemPrice}>₹{item.price * item.quantity}</p>
                {isPayment ? (
                  <p className={styles.itemQty}>Qty: {item.quantity}</p>
                ) : (
                  <button
                    type="button"
                    className={styles.removeButton}
                    aria-label={`Remove ${item.title}`}
                    onClick={() =>
                      item.id &&
                      dispatch(
                        removeCartItem({
                          id: item.id,
                          session: getCartSession(),
                        }),
                      )
                    }
                  >
                    <FaTimes aria-hidden />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className={styles.totals}>
        <div className={styles.totalRow}>
          <span>{isPayment ? `Subtotal (${itemCount} items)` : "Subtotal"}</span>
          <span>{formatRupees(subtotal)}</span>
        </div>
        <div className={styles.totalRow}>
          <span>{GST_LABEL}</span>
          <span>{formatRupees(totals.gst)}</span>
        </div>
        {totals.processingFee > 0 ? (
          <div className={styles.totalRow}>
            <span className={styles.feeLabel}>
              Payment processing fee
              <span className={styles.feeHint}>2% + GST</span>
            </span>
            <span>{formatRupees(totals.processingFee)}</span>
          </div>
        ) : null}
      </div>

      <div className={styles.totalAmountBox}>
        <span>Total Amount</span>
        <strong>{formatRupees(totalAmount)}</strong>
      </div>

      {isPayment ? (
        <div className={styles.couponRow}>
          <FaPen className={styles.couponIcon} aria-hidden />
          <input
            type="text"
            value={couponCode}
            onChange={(event) => {
              setCouponCode(event.target.value);
              setCouponMessage(null);
            }}
            placeholder="Have a coupon code?"
            aria-label="Coupon code"
          />
          <button type="button" onClick={handleApplyCoupon}>
            Apply
          </button>
        </div>
      ) : null}

      {couponMessage ? <p className={styles.couponMessage}>{couponMessage}</p> : null}

      {!isPayment ? (
        <>
          <div className={styles.onDemandBox}>
            <div className={styles.onDemandHeader}>
              <FaStore className={styles.storeIcon} aria-hidden />
              <span>On-Demand Orders</span>
            </div>

            <p className={styles.windowHint}>
              Orders are open from <strong>{morningOpen}</strong> to{" "}
              <strong>{nightClose}</strong>.
            </p>
          </div>
        </>
      ) : null}

      <button
        type="button"
        className={styles.placeOrderButton}
        disabled={placeOrderDisabled || cartItems.length === 0}
        onClick={onPlaceOrder}
      >
        {isPayment && !isSubmitting ? <FaLock aria-hidden /> : null}
        {isSubmitting ? submitLabel : submitLabel ?? defaultLabel}
        {!isSubmitting ? <FaArrowRight aria-hidden /> : null}
      </button>

      {buttonHint ? <p className={styles.buttonHint}>{buttonHint}</p> : null}

      {!isPayment ? (
        <p className={styles.terms}>
          By placing this order, you agree to our terms and conditions.
        </p>
      ) : null}
    </aside>
  );
}
