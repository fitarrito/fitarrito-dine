"use client";
import React, { useEffect, useRef, useState } from "react";
import CartDrawer from "../components/CartDrawer";
import Image from "next/image";
import Link from "next/link";
import textImage from "../../public/images/fitarrito.svg";
import logo from "../../public/images/logo.svg";
import { FaShoppingCart, FaSignOutAlt } from "react-icons/fa";
import { useAppSelector } from "@lib/hooks";
import { supabase } from "@lib/supabase-browser";

const Header: React.FC = () => {
  const navRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const totalCartItems = useAppSelector((state) => state.cart.totalCartItems);

  useEffect(() => {
    const syncAuthState = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setIsLoggedIn(Boolean(user));
    };

    void syncAuthState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
      return;
    }

    window.location.href = "/subscription?step=account&plan=2-meals";
  };

  return (
    // Header-Element
    <header className="sticky top-0 z-50">
      <div
        ref={navRef}
        className={`fixed top-0 left-0 z-50 w-full items-center`}
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
            className=" bg-nav-color-dark w-screen justify-between  shadow-customShadow-md laptop:w-[80vw] text-white inline-flex items-center py-1 mobile:py-3 px-1 md:px-4 lg laptop:rounded-full laptop:my-4  laptop:inline-flex overflow-visible"
            style={{ overflow: "visible" }}
          >
            <div className="flex items-center">
              <div>
                <Link
                  href="/"
                  className=" transition ease-in-out duration-150  px-3 py-1 justify-center mobile:px-3 mobile:py-2 rounded-xl text-xs mobile:text-base min-w-[50px] mobile:w-[50px]  flex"
                >
                  <Image src={logo} alt="UTP-Logo" width={55} height={55} />
                </Link>
              </div>
              <div>
                <Link
                  href="/"
                  className=" transition ease-in-out duration-150  px-3 py-1 justify-center mobile:px-3 mobile:py-2 rounded-xl text-xs mobile:text-base  mobile:w-[100px] flex"
                >
                  <Image
                    src={textImage}
                    alt="UTP-Logo"
                    width={130}
                    height={90}
                  />
                </Link>
              </div>
            </div>

            <div
              className="z-40 flex flex-row gap-3 items-center overflow-visible"
              style={{ overflow: "visible", minWidth: "fit-content" }}
            >
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-3xl flex flex-row items-center justify-center gap-2 min-w-[2.75rem] hover:bg-gray-50"
                  aria-label="Log out"
                >
                  <FaSignOutAlt className="text-customTheme text-lg" />
                </button>
              ) : null}

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

      {showLogoutConfirm ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4"
          role="presentation"
          onClick={() => {
            if (!isLoggingOut) setShowLogoutConfirm(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2
              id="logout-dialog-title"
              className="text-lg font-bold text-gray-900"
            >
              Are you sure you want to logout?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              You will be signed out of your Google account on this device.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                disabled={isLoggingOut}
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-customTheme px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
                disabled={isLoggingOut}
                onClick={() => void handleLogout()}
              >
                {isLoggingOut ? "Logging out..." : "Yes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
};

// Einzelner Menüpunkt

export default Header;
