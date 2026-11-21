"use client";
import React, { useRef, useState } from "react";
import { Anton } from "next/font/google";
import CartDrawer from "../components/CartDrawer";
import Link from "next/link";
import { FaShoppingCart } from "react-icons/fa";
import { useAppSelector } from "@lib/hooks";
import styles from "./Header.module.css";

const wordmark = Anton({ weight: "400", subsets: ["latin"] });

const Header: React.FC = () => {
  const navRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const totalCartItems = useAppSelector((state) => state.cart.totalCartItems);

  return (
    // Header-Element
    <header className="sticky top-0 z-50">
      <div
        ref={navRef}
        className="fixed top-0 left-0 z-50 w-full items-center"
        style={{
          background: `
            radial-gradient(
              circle at 15% 20%,
              rgba(250, 228, 228, 0.9) 0%,
              transparent 45%
            ),
            radial-gradient(
              circle at 85% 25%,
              rgba(224, 242, 254, 0.9) 0%,
              transparent 45%
            ),
            radial-gradient(
              circle at 30% 80%,
              rgba(255, 241, 242, 0.9) 0%,
              transparent 50%
            ),
            linear-gradient(
              to right,
              #f8f6dbe5 0%,
              #fafbff 100%
            )
          `,
        }}
      >
        {/* Hintergrund für das aufklappbare Menü */}

        <div className="flex justify-center">
          <div
            className=" bg-nav-color-dark w-full max-w-full justify-between  shadow-customShadow-md laptop:w-[80vw] text-white inline-flex items-center py-1 mobile:py-3 px-1 md:px-4 lg laptop:rounded-full laptop:my-4  laptop:inline-flex overflow-visible"
            style={{ overflow: "visible" }}
          >
            <Link href="/" className={styles.brand} aria-label="Fitarrito home">
              <span className={`${styles.mark} ${wordmark.className}`} aria-hidden>
                F
              </span>
              <span className={styles.identity}>
                <span className={`${styles.wordmark} ${wordmark.className}`}>FITARRITO</span>
                <span className={styles.tagline}>
                  <span aria-hidden />
                  FROM SEOUL TO SALSA
                  <span aria-hidden />
                </span>
              </span>
            </Link>

            <div
              className="z-40 flex flex-row gap-3 items-center overflow-visible"
              style={{ overflow: "visible", minWidth: "fit-content" }}
            >
              <button
                onClick={() => setIsOpen(true)}
                className="px-3 py-2 bg-customTheme rounded-3xl flex flex-row items-center justify-between w-16"
              >
                <FaShoppingCart className="text-white text-lg" />
                <p className="text-white text-sm fontWeight-bold">
                  {totalCartItems}
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>
      {isOpen ? <CartDrawer isOpen={isOpen} setIsOpen={setIsOpen} /> : null}
    </header>
  );
};

// Einzelner Menüpunkt

export default Header;
