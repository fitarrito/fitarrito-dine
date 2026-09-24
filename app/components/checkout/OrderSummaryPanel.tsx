"use client";

import Image from "next/image";
import Link from "next/link";
import {
  FaArrowRight,
  FaClock,
  FaMoon,
  FaPen,
  FaShoppingCart,
  FaStore,
  FaSun,
  FaTimes,
} from "react-icons/fa";
import { useAppDispatch, useAppSelector } from "@lib/hooks";
import { removeCartItem } from "@lib/features/cartSlice";
import { getCartSession } from "@lib/cartSession";
import styles from "./OrderSummaryPanel.module.css";

type OrderSummaryPanelProps = {
  onPlaceOrder?: () => void;
  placeOrderDisabled?: boolean;
  isSubmitting?: boolean;
};

export default function OrderSummaryPanel({
  onPlaceOrder,
  placeOrderDisabled = false,
  isSubmitting = false,
}: OrderSummaryPanelProps) {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((state) => state.cart.cartItems);
  const subtotal = useAppSelector((state) => state.cart.totalAmt);
  const totalAmount = subtotal;

  return (
    <aside className={styles.panel}>
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

          return (
            <li key={cartItemId} className={styles.itemRow}>
              <div className={styles.itemImageWrap}>
                <Image
                  src={item.image_url ?? item.imageUrl ?? "/fallback-image.jpg"}
                  alt={item.title}
                  fill
                  className={styles.itemImage}
                />
              </div>

              <div className={styles.itemDetails}>
                <p className={styles.itemTitle}>{item.title}</p>
                {item.selected_protein ? (
                  <p className={styles.itemMeta}>Protein: {item.selected_protein}</p>
                ) : null}
                <p className={styles.itemMeta}>Qty: {item.quantity}</p>
              </div>

              <div className={styles.itemPricing}>
                <p className={styles.itemPrice}>₹{item.price * item.quantity}</p>
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
              </div>
            </li>
          );
        })}
      </ul>

      <div className={styles.totals}>
        <div className={styles.totalRow}>
          <span>Subtotal</span>
          <span>₹{subtotal}</span>
        </div>
      </div>

      <div className={styles.totalAmountBox}>
        <span>Total Amount</span>
        <strong>₹{totalAmount}</strong>
      </div>

      <div className={styles.paymentNote}>
        <FaClock className={styles.paymentIcon} aria-hidden />
        <div>
          <p className={styles.paymentTitle}>Cash or UPI (QR) only</p>
          <p className={styles.paymentHint}>You can pay at the time of delivery.</p>
        </div>
      </div>

      <div className={styles.onDemandBox}>
        <div className={styles.onDemandHeader}>
          <FaStore className={styles.storeIcon} aria-hidden />
          <span>On-Demand Orders</span>
        </div>

        <div className={styles.orderWindows}>
          <div className={styles.orderWindow}>
            <FaSun className={styles.sunIcon} aria-hidden />
            <div>
              <p className={styles.windowTitle}>Lunch Orders</p>
              <p className={styles.windowHint}>
                Place your order before <strong>10:00 AM</strong>
              </p>
            </div>
          </div>

          <div className={styles.orderWindow}>
            <FaMoon className={styles.moonIcon} aria-hidden />
            <div>
              <p className={styles.windowTitle}>Dinner Orders</p>
              <p className={styles.windowHint}>
                Place your order before <strong>4:00 PM</strong>
              </p>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        className={styles.placeOrderButton}
        disabled={placeOrderDisabled || cartItems.length === 0}
        onClick={onPlaceOrder}
      >
        {isSubmitting ? "Placing Order..." : "Place Order"}
        {!isSubmitting ? <FaArrowRight aria-hidden /> : null}
      </button>

      <p className={styles.terms}>
        By placing this order, you agree to our terms and conditions.
      </p>
    </aside>
  );
}
