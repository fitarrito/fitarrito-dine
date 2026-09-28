"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const dispatch = useAppDispatch();
  const cartSession = getCartSession();

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
      >
        <IoCloseSharp
          className={styles.closeIcon}
          onClick={() => setIsOpen(false)}
        />

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
                  <div className={styles.itemWrapper}>
                    <div className={styles.itemInfo}>
                      <div className={styles.itemImageWrapper}>
                        <Image
                          src={item?.image_url ?? "/fallback-image.jpg"}
                          alt={item?.title ?? "Menu image"}
                          fill
                          className={styles.itemImage}
                        />
                      </div>
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
                      <span className={styles.itemPrice}>
                        ₹{item.price * item.quantity}
                      </span>
                    </div>

                    <div className={styles.quantityWrapper}>
                      <button
                        className={styles.quantityButton}
                        onClick={() => {
                          if (item.quantity > 1) {
                            dispatch(
                              updateCartQuantity({
                                id: item.id!,
                                quantity: item.quantity - 1,
                                session: cartSession,
                              }),
                            );
                          }
                        }}
                      >
                        -
                      </button>

                      <span className={styles.quantityText}>
                        {item.quantity}
                      </span>

                      <button
                        className={styles.quantityButton}
                        onClick={() =>
                          dispatch(
                            updateCartQuantity({
                              id: item.id!,
                              quantity: item.quantity + 1,
                              session: cartSession,
                            }),
                          )
                        }
                      >
                        +
                      </button>
                    </div>

                    <button
                      className={styles.deleteButton}
                      onClick={() =>
                        dispatch(
                          removeCartItem({
                            id: item.id!,
                            session: cartSession,
                          }),
                        )
                      }
                    >
                      <IoTrash />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {cartItems.length > 0 && (
          <div className={styles.footer}>
            <p className={styles.totalText}>Total : ₹{totalAmt}</p>

            <Button
              variant="primary"
              className={styles.buttonWidth}
              onClick={() => {
                setIsOpen(false);
                router.push("/checkout");
              }}
            >
              Continue
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default DrawerComponent;
