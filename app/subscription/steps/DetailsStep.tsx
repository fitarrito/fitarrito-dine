"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FaMapMarkerAlt, FaReceipt } from "react-icons/fa";
import { normalizePhoneNumber } from "@lib/user-profile";
import SubscriptionStepper from "../components/SubscriptionStepper";
import SubscriptionNavButtons from "../components/SubscriptionNavButtons";
import {
  buildSubscriptionHref,
  getEmptyDeliveryDetails,
  getSubscriptionDetailRows,
  isDeliveryDetailsComplete,
  type DeliveryDetails,
  type SubscriptionPlanId,
} from "../subscriptionData";
import styles from "../subscriptionFlow.module.css";

type DetailsStepProps = {
  planId: SubscriptionPlanId;
};

type FormFieldProps = {
  label: string;
  required?: boolean;
  children: ReactNode;
};

function FormField({ label, required = false, children }: FormFieldProps) {
  return (
    <label className={styles.formField}>
      <span className={styles.formLabel}>
        {label}
        {required ? <span className={styles.formRequired}> *</span> : null}
      </span>
      {children}
    </label>
  );
}

export default function DetailsStep({ planId }: DetailsStepProps) {
  const [delivery, setDelivery] = useState<DeliveryDetails>(
    getEmptyDeliveryDetails(),
  );
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  const subscriptionRows = useMemo(
    () => getSubscriptionDetailRows(planId),
    [planId],
  );

  const backHref = buildSubscriptionHref({
    step: "menu",
    plan: planId,
  });

  const continueHref = buildSubscriptionHref({
    step: "payment",
    plan: planId,
  });

  const continueDisabled = !isDeliveryDetailsComplete(delivery);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch("/api/user/profile");

        if (!response.ok) return;

        const { profile } = (await response.json()) as {
          profile: {
            full_name: string | null;
            email: string | null;
            phone: string | null;
          } | null;
        };

        if (!profile) return;

        setDelivery((current) => ({
          ...current,
          fullName: profile.full_name?.trim() || current.fullName,
          email: profile.email?.trim() || current.email,
          phone:
            normalizePhoneNumber(profile.phone) ||
            current.phone,
        }));
      } catch (error) {
        console.error("Failed to load delivery profile:", error);
      } finally {
        setIsProfileLoading(false);
      }
    };

    void loadProfile();
  }, []);

  const updateField =
    (field: keyof DeliveryDetails) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setDelivery((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  return (
    <div className={styles.flow}>
      <SubscriptionStepper currentStep="details" />

      <header className={styles.stepHeader}>
        <h1 className={styles.stepTitle}>Delivery & Subscription Details</h1>
        <p className={styles.stepSubtitle}>
          Tell us where to deliver and review your plan before payment.
        </p>
      </header>

      <div className={styles.detailsLayout}>
        <section className={styles.detailsSection}>
          <div className={styles.detailsSectionHeading}>
            <span className={styles.detailsSectionIcon} aria-hidden>
              <FaMapMarkerAlt />
            </span>
            <h2 className={styles.detailsSectionTitle}>Delivery Details</h2>
          </div>

          <div className={styles.formGrid} aria-busy={isProfileLoading}>
          {isProfileLoading ? (
            <p className={styles.detailsProfileLoading}>
              <span className={styles.detailsProfileSpinner} aria-hidden />
              Loading your account details...
            </p>
          ) : null}

          <FormField label="Full Name" required>
            {isProfileLoading ? (
              <div
                className={styles.detailsFieldSkeleton}
                aria-label="Loading full name"
              />
            ) : (
              <input
                type="text"
                className={styles.formInput}
                placeholder="Enter your full name"
                value={delivery.fullName}
                onChange={updateField("fullName")}
              />
            )}
          </FormField>

          <FormField label="Phone Number" required>
            {isProfileLoading ? (
              <div
                className={styles.detailsFieldSkeleton}
                aria-label="Loading phone number"
              />
            ) : (
              <input
                type="tel"
                className={styles.formInput}
                placeholder="10-digit mobile number"
                value={delivery.phone}
                onChange={updateField("phone")}
              />
            )}
          </FormField>

          <FormField label="Email">
            {isProfileLoading ? (
              <div
                className={styles.detailsFieldSkeleton}
                aria-label="Loading email"
              />
            ) : (
              <input
                type="email"
                className={styles.formInput}
                placeholder="you@example.com"
                value={delivery.email}
                onChange={updateField("email")}
              />
            )}
          </FormField>

          <FormField label="Delivery Address" required>
            <textarea
              className={styles.formTextarea}
              placeholder="House / flat, street, area"
              rows={3}
              value={delivery.address}
              onChange={updateField("address")}
            />
          </FormField>

          <FormField label="City" required>
            <input
              type="text"
              className={styles.formInput}
              placeholder="City"
              value={delivery.city}
              onChange={updateField("city")}
            />
          </FormField>

          <FormField label="Pincode" required>
            <input
              type="text"
              className={styles.formInput}
              placeholder="6-digit pincode"
              value={delivery.pincode}
              onChange={updateField("pincode")}
            />
          </FormField>

          <FormField label="Landmark">
            <input
              type="text"
              className={styles.formInput}
              placeholder="Nearby landmark (optional)"
              value={delivery.landmark}
              onChange={updateField("landmark")}
            />
          </FormField>

          <FormField label="Delivery Instructions">
            <textarea
              className={styles.formTextarea}
              placeholder="Gate code, preferred delivery time, etc."
              rows={2}
              value={delivery.deliveryInstructions}
              onChange={updateField("deliveryInstructions")}
            />
          </FormField>
          </div>
        </section>

        <section
          className={`${styles.detailsSection} ${styles.detailsSectionSubscription}`}
        >
          <div className={styles.detailsSectionHeading}>
            <span className={styles.detailsSectionIcon} aria-hidden>
              <FaReceipt />
            </span>
            <h2 className={styles.detailsSectionTitle}>Your Subscription Details</h2>
          </div>

          <dl className={styles.subscriptionSummaryCard}>
            {subscriptionRows.map((row) => (
              <div key={row.label} className={styles.subscriptionSummaryRow}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <SubscriptionNavButtons
        backHref={backHref}
        continueHref={continueHref}
        continueDisabled={continueDisabled || isProfileLoading}
        continueLabel="Continue to Payment"
      />
    </div>
  );
}
