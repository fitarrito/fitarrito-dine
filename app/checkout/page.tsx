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
import { useAppDispatch, useAppSelector } from "@lib/hooks";
import styles from "./checkout.module.css";

type DeliveryForm = {
  fullName: string;
  mobileNumber: string;
  address: string;
  area: string;
  landmark: string;
  city: string;
  pincode: string;
  deliveryInstructions: string;
};

const INITIAL_FORM: DeliveryForm = {
  fullName: "",
  mobileNumber: "",
  address: "",
  area: "",
  landmark: "",
  city: "",
  pincode: "",
  deliveryInstructions: "",
};

export default function CheckoutPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((state) => state.cart.cartItems);
  const loading = useAppSelector((state) => state.cart.loading);
  const [form, setForm] = useState<DeliveryForm>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchCart(getCartSession()));
  }, [dispatch]);

  useEffect(() => {
    if (loading === "pending") return;

    if (cartItems.length === 0) {
      router.replace("/menu");
    }
  }, [cartItems.length, loading, router]);

  const updateField =
    (field: keyof DeliveryForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
      setFormError(null);
    };

  const handlePlaceOrder = () => {
    const requiredFields: Array<keyof DeliveryForm> = [
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

    setFormError(null);
    alert("Order placed successfully! Confirmation step coming soon.");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handlePlaceOrder();
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
                <span className={styles.inputWrap}>
                  <FaPhone className={styles.inputIcon} aria-hidden />
                  <input
                    type="tel"
                    value={form.mobileNumber}
                    onChange={updateField("mobileNumber")}
                    placeholder="+91 98765 43210"
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

            <div className={styles.fieldGridTwo}>
              <label className={styles.field}>
                <span className={styles.label}>
                  Area / Locality <span className={styles.required}>*</span>
                </span>
                <span className={styles.inputWrap}>
                  <FaMapMarkerAlt className={styles.inputIcon} aria-hidden />
                  <input
                    type="text"
                    value={form.area}
                    onChange={updateField("area")}
                    placeholder="Valasaravakkam"
                    required
                  />
                </span>
              </label>

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
            </div>

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
                    onChange={updateField("pincode")}
                    placeholder="600087"
                    required
                  />
                </span>
              </label>
            </div>
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
          onPlaceOrder={handlePlaceOrder}
          placeOrderDisabled={cartItems.length === 0}
        />
      </div>
    </div>
  );
}
