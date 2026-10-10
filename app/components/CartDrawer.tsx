"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaArrowRight, FaSpinner } from "react-icons/fa";
import { IoCloseSharp, IoTrash } from "react-icons/io5";
import cartEmpty from "../../public/images/CartEmpty.svg";
import { useAppSelector, useAppDispatch } from "@lib/hooks";
import {
  fetchCart,
  updateCartQuantity,
  removeCartItem,
} from "@lib/features/cartSlice";
import { getCartSession } from "@lib/cartSession";
import { getCartItemCustomization } from "@lib/fitarritoHouseMenu";
import { calculateOrderTotals, GST_LABEL } from "@lib/orderTotals";
import { formatRupees } from "@lib/razorpayFee";
import { useOnlineOrdering } from "@lib/useOnlineOrdering";
import OnlineOrderingClosedNotice from "./OnlineOrderingClosedNotice";
import Image from "next/image";
import Button from "./ui/Button";
import styles from "./Drawer.module.css";
import clsx from "clsx";

interface DrawerProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
}

const DrawerComponent = ({ isOpen, setIsOpen }: DrawerProps) => {
  const router = useRouter();
  const cartItems = useAppSelector((state) => state.cart.cartItems);
  const totalAmt = useAppSelector((state) => state.cart.totalAmt);
  const cartError = useAppSelector((state) => state.cart.error);
  const removingItemId = useAppSelector((state) => state.cart.removingItemId);
  const dispatch = useAppDispatch();
  const cartSession = getCartSession();
  const itemCount = cartItems.reduce((sum, item) => sum + Number(item.quantity), 0);
  const totals = calculateOrderTotals(totalAmt);
  const ordering = useOnlineOrdering();
  const orderingClosed = ordering.enabled === false;

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchCart(getCartSession()));
    }
  }, [dispatch, isOpen]);
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }

    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <div className={styles.overlay} onClick={() => setIsOpen(false)} />
      )}

      <div
        className={clsx(
          styles.drawerContainer,
          isOpen ? styles.open : styles.closed,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
      >
        <div className={styles.handle} aria-hidden />

        <header className={styles.header}>
          <div>
            <h2 id="cart-drawer-title" className={styles.headerTitle}>
              Your Cart
            </h2>
            <p className={styles.headerCount}>
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => setIsOpen(false)}
            aria-label="Close cart"
          >
            <IoCloseSharp />
          </button>
        </header>

        {cartItems.length === 0 ? (
          <div className={styles.emptyCartContainer}>
            <Image src={cartEmpty} alt="Empty cart" width={180} height={180} />
            <p className={styles.emptyText}>Your cart is empty</p>
            {cartError ? (
              <p className={styles.emptyText}>{cartError}</p>
            ) : null}
          </div>
        ) : (
          <ul className={styles.cartItemList}>
            {cartItems.map((item) => {
              const customization = getCartItemCustomization(item);
              const cartItemId =
                item.id ||
                `${item.title}-${item.selected_protein || "default"}-${
                  item.selected_size || "regular"
                }`;

              return (
                <li key={cartItemId} className={styles.cartItem}>
                  <div className={styles.itemCard}>
                    <div className={styles.itemImageWrapper}>
                      <Image
                        src={item?.image_url ?? "/fallback-image.jpg"}
                        alt={item?.title ?? "Menu image"}
                        fill
                        sizes="64px"
                        className={styles.itemImage}
                      />
                    </div>

                    <div className={styles.itemDetails}>
                      <p className={styles.itemTitle}>{customization.title}</p>
                      {customization.protein ? (
                        <p className={styles.itemSubtitle}>
                          {customization.protein}
                        </p>
                      ) : null}
                      {customization.toppings ? (
                        <p className={styles.itemSubtitle}>
                          {customization.toppings}
                        </p>
                      ) : null}
                      <p className={styles.itemPrice}>
                        ₹{item.price * item.quantity}
                      </p>
                    </div>

                    <div className={styles.itemActions}>
                      <div className={styles.quantityWrapper}>
                        <button
                          type="button"
                          className={styles.quantityButton}
                          aria-label={`Decrease ${customization.title} quantity`}
                          onClick={() => {
                            if (!item.id || item.quantity <= 1) return;

                            dispatch(
                              updateCartQuantity({
                                id: item.id,
                                quantity: item.quantity - 1,
                                session: cartSession,
                              }),
                            );
                          }}
                        >
                          -
                        </button>

                        <span className={styles.quantityText}>
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          className={styles.quantityButton}
                          aria-label={`Increase ${customization.title} quantity`}
                          onClick={() => {
                            if (!item.id) return;

                            dispatch(
                              updateCartQuantity({
                                id: item.id,
                                quantity: item.quantity + 1,
                                session: cartSession,
                              }),
                            );
                          }}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className={styles.deleteButton}
                        aria-label={
                          item.id === removingItemId
                            ? `Removing ${customization.title}`
                            : `Remove ${customization.title}`
                        }
                        aria-busy={item.id === removingItemId}
                        disabled={!item.id || item.id === removingItemId}
                        onClick={() => {
                          if (!item.id || item.id === removingItemId) return;

                          dispatch(
                            removeCartItem({
                              id: item.id,
                              session: cartSession,
                            }),
                          );
                        }}
                      >
                        {item.id === removingItemId ? (
                          <FaSpinner className={styles.spinner} aria-hidden />
                        ) : (
                          <IoTrash />
                        )}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {cartItems.length > 0 ? (
          <div className={styles.footer}>
            <div className={styles.totals}>
              <div className={styles.totalRow}>
                <span>Subtotal ({itemCount} items)</span>
                <span>{formatRupees(totalAmt)}</span>
              </div>
              <div className={styles.totalRow}>
                <span>{GST_LABEL}</span>
                <span>{formatRupees(totals.gst)}</span>
              </div>
              <div className={styles.totalAmount}>
                <span>Total</span>
                <strong>{formatRupees(totals.total)}</strong>
              </div>
            </div>

            {orderingClosed ? <OnlineOrderingClosedNotice /> : null}
            <Button
              variant="primary"
              fullWidth
              className={styles.continueButton}
              disabled={orderingClosed}
              onClick={() => {
                if (orderingClosed) return;
                setIsOpen(false);
                router.push("/checkout");
              }}
            >
              Continue
              <FaArrowRight aria-hidden />
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
};

export default DrawerComponent;
