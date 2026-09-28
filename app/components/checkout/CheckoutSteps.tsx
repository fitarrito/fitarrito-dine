import { FaCheck } from "react-icons/fa";
import styles from "./CheckoutSteps.module.css";

const STEPS = [
  { id: 1, label: "Cart" },
  { id: 2, label: "Delivery Details" },
  { id: 3, label: "Payment & Confirm Order" },
] as const;

type CheckoutStepsProps = {
  currentStep: 1 | 2 | 3;
};

export default function CheckoutSteps({ currentStep }: CheckoutStepsProps) {
  return (
    <nav className={styles.steps} aria-label="Checkout progress">
      {STEPS.map((step, index) => {
        const isComplete = step.id < currentStep;
        const isActive = step.id === currentStep;

        return (
          <div key={step.id} className={styles.stepItem}>
            <div className={styles.stepContent}>
              <span
                className={`${styles.stepCircle} ${
                  isComplete || isActive ? styles.stepCircleActive : ""
                }`}
              >
                {isComplete ? <FaCheck aria-hidden /> : step.id}
              </span>
              <span
                className={`${styles.stepLabel} ${
                  isActive ? styles.stepLabelActive : ""
                }`}
              >
                {step.label}
              </span>
            </div>

            {index < STEPS.length - 1 ? (
              <span
                className={`${styles.stepLine} ${
                  step.id < currentStep ? styles.stepLineActive : ""
                }`}
                aria-hidden
              />
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
