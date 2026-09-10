"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FaCalendarAlt, FaLeaf, FaCheckCircle } from "react-icons/fa";
import SubscriptionStepper from "../components/SubscriptionStepper";
import SubscriptionNavButtons from "../components/SubscriptionNavButtons";
import {
  SUBSCRIPTION_PLANS,
  type SubscriptionPlanId,
} from "../subscriptionData";
import styles from "../subscriptionFlow.module.css";

type PlanStepProps = {
  initialPlan?: SubscriptionPlanId;
};

export default function PlanStep({ initialPlan = "2-meals" }: PlanStepProps) {
  const router = useRouter();
  const selectedPlan =
    SUBSCRIPTION_PLANS.find((plan) => plan.id === initialPlan)?.id ?? "2-meals";

  const buildAccountUrl = (planId: SubscriptionPlanId) =>
    `/subscription?step=account&plan=${planId}`;

  return (
    <div className={styles.flow}>
      <SubscriptionStepper currentStep="plan" />

      <header className={styles.stepHeader}>
        <h1 className={styles.stepTitle}>How Many Meals Per Day?</h1>
        <p className={styles.stepSubtitle}>
          Choose how many meals you&apos;d like delivered each day.
        </p>
      </header>

      <div className={styles.planCards} role="radiogroup" aria-label="Meal plan">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const active = selectedPlan === plan.id;

          return (
            <button
              key={plan.id}
              type="button"
              className={`${styles.planOption} ${
                active ? styles.planOptionSelected : ""
              }`}
              onClick={() => router.replace(`/subscription?step=plan&plan=${plan.id}`)}
              aria-pressed={active}
            >
              <input
                type="radio"
                name="meal-plan"
                checked={active}
                readOnly
                className={styles.planRadio}
                aria-label={plan.title}
              />
              {active ? (
                <span className={styles.planCheck} aria-hidden>
                  ✓
                </span>
              ) : null}

              <div className={styles.planBowls}>
                {plan.bowlImages.map((src, index) => (
                  <div
                    key={src}
                    className={`${styles.planBowlWrap} ${
                      plan.bowlImages.length > 1 && index > 0
                        ? styles.planBowlWrapSmall
                        : ""
                    }`}
                  >
                    <Image src={src} alt="" fill className={styles.imageContain} />
                  </div>
                ))}
              </div>

              <p className={styles.planOptionTitle}>{plan.title}</p>
              <p className={styles.planOptionSubtitle}>{plan.subtitle}</p>
              <p className={styles.planOptionPrice}>
                {plan.price}
                <span>per month</span>
              </p>
            </button>
          );
        })}
      </div>

      <div className={styles.infoBox}>
        <div className={styles.infoRow}>
          <FaCalendarAlt className={styles.infoIcon} aria-hidden />
          10 meals delivered over 5 days
        </div>
        <div className={styles.infoRow}>
          <FaLeaf className={styles.infoIcon} aria-hidden />
          5 different cuisines
        </div>
        <div className={styles.infoRow}>
          <FaCheckCircle className={styles.infoIcon} aria-hidden />
          Flexible, fresh and nutritious
        </div>
      </div>

      <SubscriptionNavButtons
        backHref="/subscription"
        continueHref={buildAccountUrl(selectedPlan)}
      />
    </div>
  );
}
