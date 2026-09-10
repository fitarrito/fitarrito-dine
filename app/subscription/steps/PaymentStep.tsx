"use client";

import SubscriptionStepper from "../components/SubscriptionStepper";
import SubscriptionNavButtons from "../components/SubscriptionNavButtons";
import {
  SUBSCRIPTION_PLANS,
  buildSubscriptionHref,
  type SubscriptionPlanId,
} from "../subscriptionData";
import styles from "../subscriptionFlow.module.css";

type PaymentStepProps = {
  planId: SubscriptionPlanId;
};

export default function PaymentStep({ planId }: PaymentStepProps) {
  const plan = SUBSCRIPTION_PLANS.find((item) => item.id === planId);

  const backHref = buildSubscriptionHref({
    step: "details",
    plan: planId,
  });

  return (
    <div className={styles.flow}>
      <SubscriptionStepper currentStep="payment" />

      <header className={styles.stepHeader}>
        <h1 className={styles.stepTitle}>Payment</h1>
        <p className={styles.stepSubtitle}>
          Complete your subscription with a secure payment.
        </p>
      </header>

      <div className={styles.paymentSummaryCard}>
        <p className={styles.paymentSummaryLabel}>Amount due</p>
        <p className={styles.paymentSummaryAmount}>
          {plan?.price ?? "₹ 11,000"}
          <span>/ month</span>
        </p>
        <p className={styles.paymentSummaryNote}>
          Payment integration coming soon.
        </p>
      </div>

      <SubscriptionNavButtons
        backHref={backHref}
        continueHref="/subscription"
        continueLabel="Back to Home"
      />
    </div>
  );
}
