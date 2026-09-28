"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaBuilding,
  FaHome,
  FaLeaf,
  FaMapMarkerAlt,
  FaPhone,
  FaStickyNote,
  FaUser,
} from "react-icons/fa";
import CheckoutSteps from "@/components/checkout/CheckoutSteps";
import OrderSummaryPanel from "@/components/checkout/OrderSummaryPanel";
import { fetchCart } from "@lib/features/cartSlice";
import { getCartSession } from "@lib/cartSession";
import { DELIVERY_AREAS, getDeliveryArea } from "@lib/deliveryAreas";
import {
  isValidIndianMobile,
  normalizeIndianPhone,
} from "@lib/normalizePhone";
import {
  EMPTY_CHECKOUT_DELIVERY,
  loadCheckoutDelivery,
  saveCheckoutDelivery,
  type CheckoutDelivery,
} from "@lib/checkoutDelivery";
import { useAppDispatch, useAppSelector } from "@lib/hooks";
import styles from "./checkout.module.css";

export default function CheckoutPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((state) => state.cart.cartItems);
  const loading = useAppSelector((state) => state.cart.loading);
  const [form, setForm] = useState<CheckoutDelivery>(EMPTY_CHECKOUT_DELIVERY);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchCart(getCartSession()));
    const saved = loadCheckoutDelivery();

    if (saved) {
      setForm(saved);
    }
  }, [dispatch]);

  useEffect(() => {
    if (loading === "idle" || loading === "pending") return;

    if (cartItems.length === 0) {
      router.replace("/menu");
    }
  }, [cartItems.length, loading, router]);

  const updateField =
    (field: keyof CheckoutDelivery) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
      setFormError(null);
    };

  const updateDeliveryArea = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedArea = getDeliveryArea(event.target.value);

    setForm((current) => ({
      ...current,
      area: selectedArea?.name ?? "",
      pincode: selectedArea?.pincode ?? "",
    }));
    setFormError(null);
  };

  const updateMobileNumber = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const digits = event.target.value.replace(/\D/g, "").slice(0, 10);

    setForm((current) => ({ ...current, mobileNumber: digits }));
    setFormError(null);
  };

  const handleContinueToPayment = () => {
    const requiredFields: Array<keyof CheckoutDelivery> = [
      "fullName",
      "mobileNumber",
      "address",
      "area",
      "city",
      "pincode",
    ];

    const missingField = requiredFields.find((field) => !form[field].trim());

    if (missingField) {
      setFormError("Please fill in all required delivery details.");
      return;
    }

    if (!isValidIndianMobile(normalizeIndianPhone(form.mobileNumber))) {
      setFormError("Please enter a valid 10-digit mobile number.");
      return;
    }

    saveCheckoutDelivery(form);
    router.push("/checkout/payment");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleContinueToPayment();
  };

  if (loading === "pending" && cartItems.length === 0) {
    return <p className={styles.loading}>Loading checkout...</p>;
  }

  return (
    <div className={styles.page}>
      <CheckoutSteps currentStep={2} />

      <div className={styles.layout}>
        <form className={styles.formCard} onSubmit={handleSubmit}>
          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <span className={styles.sectionIconBlue}>
                <FaUser aria-hidden />
              </span>
              <div>
                <h1 className={styles.sectionTitle}>Customer Details</h1>
                <p className={styles.sectionSubtitle}>
                  Please provide your details to complete the order
                </p>
              </div>
            </header>

            <div className={styles.fieldGridTwo}>
              <label className={styles.field}>
                <span className={styles.label}>
                  Full Name <span className={styles.required}>*</span>
                </span>
                <span className={styles.inputWrap}>
                  <FaUser className={styles.inputIcon} aria-hidden />
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={updateField("fullName")}
                    placeholder="Enter your full name"
                    required
                  />
                </span>
              </label>

              <label className={styles.field}>
                <span className={styles.label}>
                  Mobile Number <span className={styles.required}>*</span>
                </span>
                <span className={`${styles.inputWrap} ${styles.phoneInputWrap}`}>
                  <FaPhone className={styles.inputIcon} aria-hidden />
                  <span className={styles.phonePrefix} aria-hidden>
                    +91
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={form.mobileNumber}
                    onChange={updateMobileNumber}
                    placeholder="Enter mobile number"
                    maxLength={10}
                    required
                  />
                </span>
              </label>
            </div>
          </section>

          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <span className={styles.sectionIconBlue}>
                <FaHome aria-hidden />
              </span>
              <div>
                <h2 className={styles.sectionTitle}>Delivery Address</h2>
              </div>
            </header>

            <label className={styles.field}>
              <span className={styles.label}>
                Address (House / Flat No, Street){" "}
                <span className={styles.required}>*</span>
              </span>
              <textarea
                className={styles.textarea}
                value={form.address}
                onChange={updateField("address")}
                placeholder="12, ABC Street, Plot No 45"
                rows={3}
                required
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>
                Delivery Location <span className={styles.required}>*</span>
              </span>
              <span className={styles.inputWrap}>
                <FaMapMarkerAlt className={styles.inputIcon} aria-hidden />
                <select
                  value={form.area}
                  onChange={updateDeliveryArea}
                  required
                  className={form.area ? styles.select : styles.selectPlaceholder}
                >
                  <option value="">Select your area</option>
                  {DELIVERY_AREAS.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </span>
            </label>

            <div className={styles.fieldGridTwo}>
              <label className={styles.field}>
                <span className={styles.label}>
                  City <span className={styles.required}>*</span>
                </span>
                <span className={styles.inputWrap}>
                  <FaBuilding className={styles.inputIcon} aria-hidden />
                  <input
                    type="text"
                    value={form.city}
                    onChange={updateField("city")}
                    placeholder="Chennai"
                    required
                  />
                </span>
              </label>

              <label className={styles.field}>
                <span className={styles.label}>
                  Pincode <span className={styles.required}>*</span>
                </span>
                <span className={styles.inputWrap}>
                  <FaMapMarkerAlt className={styles.inputIcon} aria-hidden />
                  <input
                    type="text"
                    value={form.pincode}
                    readOnly
                    placeholder="Select delivery location"
                    required
                    className={styles.readOnlyInput}
                  />
                </span>
              </label>
            </div>

            <label className={styles.field}>
              <span className={styles.label}>Landmark (Optional)</span>
              <span className={styles.inputWrap}>
                <FaBuilding className={styles.inputIcon} aria-hidden />
                <input
                  type="text"
                  value={form.landmark}
                  onChange={updateField("landmark")}
                  placeholder="Near Lakshmi School"
                />
              </span>
            </label>
          </section>

          <section className={styles.instructionsSection}>
            <header className={styles.instructionsHeader}>
              <FaStickyNote aria-hidden />
              <span>Delivery Instructions (Optional)</span>
            </header>
            <textarea
              className={styles.instructionsTextarea}
              value={form.deliveryInstructions}
              onChange={updateField("deliveryInstructions")}
              placeholder="e.g. Call before delivery, Gate code, etc."
              rows={3}
            />
          </section>

          <div className={styles.infoBanner}>
            <FaLeaf className={styles.infoBannerIcon} aria-hidden />
            <p>
              We deliver fresh, healthy and delicious meals to your doorstep!
              Have any special instructions? Let us know.
            </p>
          </div>

          {formError ? <p className={styles.formError}>{formError}</p> : null}
        </form>

        <OrderSummaryPanel
          variant="delivery"
          onPlaceOrder={handleContinueToPayment}
          placeOrderDisabled={cartItems.length === 0}
          submitLabel="Place Order"
        />
      </div>
    </div>
  );
}
