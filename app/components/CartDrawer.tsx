"use client";

import { useState, useEffect } from "react";
import { IoCloseSharp, IoTrash } from "react-icons/io5";
// import PlaceOrderForm, {
//   OrderConfirmationWrapper,
// } from "@/components/PlaceOrderForm";
import cartEmpty from "../../public/images/CartEmpty.svg";
import { useAppSelector, useAppDispatch } from "@lib/hooks";
import {
  fetchCart,
  updateCartQuantity,
  removeCartItem,
} from "@lib/features/cartSlice";
import Image from "next/image";
import Button from "./ui/Button";
import styles from "./Drawer.module.css";
import clsx from "clsx";
import { it } from "node:test";

interface DrawerProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
}

const DrawerComponent = ({ isOpen, setIsOpen }: DrawerProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  const cartItems = useAppSelector((state) => state.cart.cartItems);
  const totalAmt = useAppSelector((state) => state.cart.totalAmt);
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(
      fetchCart({
        table_id: "table-1",
        session_id: "session-1",
      }),
    );
  }, [dispatch]);
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
          isOpen ? styles.drawerOpen : styles.drawerClosed,
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
          </div>
        ) : (
          <ul className={styles.cartItemList}>
            {cartItems.map((item) => {
              const cartItemId =
                item.id ||
                `${item.title}-${item.selected_protein || "default"}-${
                  item.selected_size || "regular"
                }`;

              const displayTitle = item.selected_protein
                ? `${item.title} (${item.selected_protein}${
                    item.selected_size && item.selected_size !== "regular"
                      ? ` - ${item.selected_size}`
                      : ""
                  })`
                : item.title;

              return (
                <li key={cartItemId} className={styles.cartItem}>
                  <div className={styles.itemWrapper}>
                    {/* <img
                      src={item.imagesrc.src}
                      alt={item.title}
                      className={styles.itemImage}
                    /> */}

                    <div className={styles.itemInfo}>
                      <div className={styles.itemImageWrapper}>
                        <Image
                          src={item?.image_url ?? "/fallback-image.jpg"}
                          alt={item?.title ?? "Menu image"}
                          fill
                          className={styles.itemImage}
                        />
                      </div>
                      <p className={styles.itemTitle}>{displayTitle}</p>
                      <span className={styles.itemPrice}>₹{item.price}</span>
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
                            }),
                          )
                        }
                      >
                        +
                      </button>
                    </div>

                    <button
                      className={styles.deleteButton}
                      onClick={() => dispatch(removeCartItem(item.id!))}
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
              onClick={() => setIsModalOpen(true)}
            >
              Continue
            </Button>
          </div>
        )}
        {/* 
        <PlaceOrderForm
          isOpen={isModalOpen}
          setIsModalOpen={setIsModalOpen}
          onOrderSubmit={() => setShowConfirmationModal(true)}
        />

        <OrderConfirmationWrapper
          showConfirmationModal={showConfirmationModal}
          setShowConfirmationModal={setShowConfirmationModal}
        /> */}
      </div>
    </>
  );
};

export default DrawerComponent;
