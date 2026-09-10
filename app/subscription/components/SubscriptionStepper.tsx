import { FaCheck } from "react-icons/fa";
import {
  SUBSCRIPTION_STEPS,
  type SubscriptionStep,
} from "../subscriptionData";
import styles from "../subscriptionFlow.module.css";

type SubscriptionStepperProps = {
  currentStep: SubscriptionStep;
};

const STEP_ORDER: SubscriptionStep[] = [
  "plan",
  "account",
  "menu",
  "details",
  "payment",
];

export default function SubscriptionStepper({
  currentStep,
}: SubscriptionStepperProps) {
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <ol className={styles.stepper} aria-label="Subscription progress">
      {SUBSCRIPTION_STEPS.map((step, index) => {
        const isActive = step.id === currentStep;
        const isComplete = currentIndex > index;

        return (
          <li key={step.id} className={styles.stepperItem}>
            <span
              className={`${styles.stepperCircle} ${
                isActive ? styles.stepperCircleActive : ""
              } ${isComplete ? styles.stepperCircleComplete : ""}`}
              aria-current={isActive ? "step" : undefined}
            >
              {isComplete ? <FaCheck aria-hidden /> : index + 1}
            </span>
            <span
              className={`${styles.stepperLabel} ${
                isActive || isComplete ? styles.stepperLabelActive : ""
              }`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
