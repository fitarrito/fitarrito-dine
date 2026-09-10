"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaArrowRight,
  FaEnvelope,
  FaGoogle,
  FaLeaf,
  FaMobileAlt,
  FaShieldAlt,
} from "react-icons/fa";
import SubscriptionStepper from "../components/SubscriptionStepper";
import { supabase } from "@lib/supabase-browser";
import {
  buildSubscriptionHref,
  type SubscriptionPlanId,
} from "../subscriptionData";
import flowStyles from "../subscriptionFlow.module.css";
import styles from "../account.module.css";

type AccountStepProps = {
  planId: SubscriptionPlanId;
};

type AccountMode = "welcome" | "phone" | "email";

export default function AccountStep({ planId }: AccountStepProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AccountMode>("welcome");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const menuHref = buildSubscriptionHref({ step: "menu", plan: planId });
  const phoneValid = phone.trim().length >= 10;
  const emailValid = email.trim().length > 0 && email.includes("@");

  const continueToMenu = () => {
    router.push(menuHref);
  };

  const handleGoogleLogin = async () => {
    const next = buildSubscriptionHref({ step: "menu", plan: planId });

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    if (error) {
      console.error("Google login error:", error);
    }
  };

  return (
    <div className={flowStyles.flow}>
      <div className={styles.accountStepperRow}>
        <SubscriptionStepper currentStep="account" />
      </div>

      <div
        className={`${styles.loginCard} ${
          mode === "welcome" ? styles.loginCardWelcome : ""
        }`}
      >
        {mode === "welcome" ? (
          <>
            <div className={styles.loginCardMain}>
              <div className={styles.welcomeHeader}>
                <span className={styles.welcomeLeafWrap} aria-hidden>
                  <FaLeaf className={styles.welcomeLeaf} />
                  <FaLeaf className={styles.welcomeLeaf} />
                </span>

                <h1 className={styles.welcomeTitle}>
                  Welcome to{" "}
                  <span className={styles.welcomeTitleAccent}>a Healthier</span>{" "}
                  You!
                </h1>

                <p className={styles.welcomeSubtitle}>
                  Sign in to continue with your meal plan. It&apos;s quick, easy
                  and secure.
                </p>
              </div>

              <button
                type="button"
                className={styles.authBtn}
                onClick={handleGoogleLogin}
              >
                <span
                  className={`${styles.authBtnIcon} ${styles.authBtnIconGoogle}`}
                >
                  <FaGoogle />
                </span>
                <span className={styles.authBtnLabel}>
                  Continue with Google
                </span>
                <FaArrowRight className={styles.authBtnArrow} aria-hidden />
              </button>

              <button
                type="button"
                className={styles.authBtn}
                onClick={() => setMode("phone")}
              >
                <span
                  className={`${styles.authBtnIcon} ${styles.authBtnIconPhone}`}
                >
                  <FaMobileAlt />
                </span>
                <span className={styles.authBtnLabel}>
                  Continue with Mobile Number
                </span>
                <FaArrowRight className={styles.authBtnArrow} aria-hidden />
              </button>

              <button
                type="button"
                className={styles.authBtn}
                onClick={() => setMode("email")}
              >
                <span
                  className={`${styles.authBtnIcon} ${styles.authBtnIconEmail}`}
                >
                  <FaEnvelope />
                </span>
                <span className={styles.authBtnLabel}>Continue with Email</span>
                <FaArrowRight className={styles.authBtnArrow} aria-hidden />
              </button>
            </div>

            <div className={styles.loginCardFooterBlock}>
              <div className={styles.loginDivider}>OR</div>

              <p className={styles.termsText}>
                By continuing, you agree to our{" "}
                <a href="/terms" className={styles.termsLink}>
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="/privacy" className={styles.termsLink}>
                  Privacy Policy
                </a>
                .
              </p>

              <p className={styles.securityNote}>
                <FaShieldAlt aria-hidden />
                Your information is secure with Supabase
              </p>
            </div>
          </>
        ) : null}

        {mode === "phone" ? (
          <>
            <button
              type="button"
              className={styles.backToWelcomeBtn}
              onClick={() => setMode("welcome")}
            >
              Back
            </button>

            <h2 className={styles.loginCardTitle}>
              Continue with Mobile Number
            </h2>
            <p className={styles.loginCardSubtitle}>
              Enter your mobile number to receive a one-time password.
            </p>

            <div className={styles.phoneRow}>
              <select
                className={styles.phoneCode}
                defaultValue="+91"
                aria-label="Country code"
              >
                <option value="+91">+91</option>
              </select>
              <input
                type="tel"
                className={styles.phoneInput}
                placeholder="Enter your mobile number"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>

            <button
              type="button"
              className={styles.primaryActionBtn}
              disabled={!phoneValid}
              onClick={continueToMenu}
            >
              Send OTP
              <FaArrowRight aria-hidden />
            </button>
          </>
        ) : null}

        {mode === "email" ? (
          <>
            <button
              type="button"
              className={styles.backToWelcomeBtn}
              onClick={() => setMode("welcome")}
            >
              Back
            </button>

            <h2 className={styles.loginCardTitle}>Continue with Email</h2>
            <p className={styles.loginCardSubtitle}>
              Enter your email address to sign in or create an account.
            </p>

            <input
              type="email"
              className={styles.signupInput}
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <button
              type="button"
              className={styles.primaryActionBtn}
              disabled={!emailValid}
              onClick={continueToMenu}
            >
              Continue
              <FaArrowRight aria-hidden />
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
