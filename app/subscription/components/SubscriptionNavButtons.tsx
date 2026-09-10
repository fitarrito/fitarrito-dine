import Link from "next/link";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import styles from "../subscriptionFlow.module.css";

type SubscriptionNavButtonsProps = {
  backHref?: string;
  backLabel?: string;
  hideBack?: boolean;
  layout?: "fixed" | "inline";
  continueHref?: string;
  onContinue?: () => void;
  continueDisabled?: boolean;
  continueLabel?: string;
};

export default function SubscriptionNavButtons({
  backHref,
  backLabel = "Back",
  hideBack = false,
  layout = "fixed",
  continueHref,
  onContinue,
  continueDisabled = false,
  continueLabel = "Continue",
}: SubscriptionNavButtonsProps) {
  const isInline = layout === "inline";
  const continueClassName = isInline
    ? styles.navContinuePill
    : `${styles.navBtn} ${styles.navContinue}`;
  const backClassName = isInline
    ? styles.navBackLink
    : `${styles.navBtn} ${styles.navBack}`;

  return (
    <div
      className={`${styles.navBar} ${
        isInline ? styles.navBarInline : ""
      } ${hideBack ? styles.navBarForwardOnly : ""}`}
    >
      {!hideBack && backHref ? (
        <Link href={backHref} className={backClassName}>
          <FaArrowLeft aria-hidden />
          {backLabel}
        </Link>
      ) : null}

      {continueHref ? (
        <Link
          href={continueHref}
          className={continueClassName}
          aria-disabled={continueDisabled}
          onClick={(event) => {
            if (continueDisabled) event.preventDefault();
          }}
        >
          {continueLabel}
          <FaArrowRight aria-hidden />
        </Link>
      ) : (
        <button
          type="button"
          className={continueClassName}
          disabled={continueDisabled}
          onClick={onContinue}
        >
          {continueLabel}
          <FaArrowRight aria-hidden />
        </button>
      )}
    </div>
  );
}
