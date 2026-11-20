"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Anton, Great_Vibes } from "next/font/google";
import { FaArrowRight, FaShoppingCart, FaUtensils } from "react-icons/fa";
import CartDrawer from "./CartDrawer";
import { useAppSelector } from "@lib/hooks";
import styles from "./OrderTypeScreen.module.css";

const wordmark = Anton({ weight: "400", subsets: ["latin"] });
const script = Great_Vibes({ weight: "400", subsets: ["latin"] });

export default function OrderTypeScreen() {
  const router = useRouter();
  const totalCartItems = useAppSelector((state) => state.cart.totalCartItems);
  const [cartOpen, setCartOpen] = useState(false);

  const continueToMenu = () => {
    router.push("/menu?category=mexican");
  };

  return (
    <section className={styles.screen}>
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <span className={`${styles.mark} ${wordmark.className}`} aria-hidden>
            F
          </span>
          <div>
            <p className={`${styles.wordmark} ${wordmark.className}`}>FITARRITO</p>
            <p className={styles.tagline}>
              <span />
              FROM SEOUL TO SALSA
              <span />
            </p>
          </div>
        </div>
        <button
          className={styles.cart}
          type="button"
          onClick={() => setCartOpen(true)}
          aria-label={`Open cart, ${totalCartItems} items`}
        >
          <FaShoppingCart aria-hidden />
          <span>{totalCartItems}</span>
        </button>
      </header>

      <div className={styles.stage}>
        <div className={styles.intro}>
          <h1 className={`${styles.headline} ${script.className}`}>
            <span>Order Your</span>
            <span>Fitarrito Experience</span>
          </h1>
          <span className={styles.brush} aria-hidden />
          <p className={styles.cuisines}>Mexican • Korean • Pan-Asian • Mala • Salads</p>
        </div>

        <div className={styles.card}>
          <span className={styles.cloche} aria-hidden>
            <svg viewBox="0 0 64 40">
              <path
                d="M8 30h48M14 30c0-10 8-18 18-18s18 8 18 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <path d="M30 12V8h4v4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M24 8h16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </span>
          <h2>Select Order Type</h2>
          <p>Choose your order type to proceed.</p>

          <button className={styles.continue} type="button" onClick={continueToMenu}>
            <FaUtensils aria-hidden />
            Order &amp; Dine
            <FaArrowRight aria-hidden />
          </button>
        </div>
      </div>

      {cartOpen ? <CartDrawer isOpen={cartOpen} setIsOpen={setCartOpen} /> : null}
    </section>
  );
}
