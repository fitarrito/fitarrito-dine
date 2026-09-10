"use client";

import { useSearchParams } from "next/navigation";
import SubscriptionLanding from "./SubscriptionLanding";
import PlanStep from "./steps/PlanStep";
import AccountStep from "./steps/AccountStep";
import MenuStep from "./steps/MenuStep";
import DetailsStep from "./steps/DetailsStep";
import PaymentStep from "./steps/PaymentStep";
import {
  isSubscriptionPlanId,
  isSubscriptionStep,
} from "./subscriptionData";

export default function SubscriptionPageContent() {
  const searchParams = useSearchParams();
  const stepParam = searchParams.get("step");
  const planParam = searchParams.get("plan");
  const planId = isSubscriptionPlanId(planParam) ? planParam : "2-meals";

  if (!stepParam || stepParam === "landing") {
    return <SubscriptionLanding />;
  }

  if (stepParam === "plan") {
    return <PlanStep initialPlan={planId} />;
  }

  if (stepParam === "account" || stepParam === "preference") {
    return <AccountStep planId={planId} />;
  }

  if (stepParam === "menu") {
    return <MenuStep planId={planId} />;
  }

  if (stepParam === "details") {
    return <DetailsStep planId={planId} />;
  }

  if (stepParam === "payment") {
    return <PaymentStep planId={planId} />;
  }

  if (isSubscriptionStep(stepParam)) {
    return <SubscriptionLanding />;
  }

  return <SubscriptionLanding />;
}
