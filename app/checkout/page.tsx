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
import { fetchCart, clearCart } from "@lib/features/cartSlice";
import { getCartSession } from "@lib/cartSession";
import { fetchJson } from "@lib/apiFetch";
import { DELIVERY_AREAS, getDeliveryArea } from "@lib/deliveryAreas";
import { normalizeIndianPhone } from "@lib/normalizePhone";
import { getCartItemCustomization } from "@lib/fitarritoHouseMenu";
import {
  createWhatsAppOrderLink,
  formatOrderWhatsAppMessage,
} from "@lib/whatsapp/send-order";
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
  city: "Chennai",
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handlePlaceOrder = async () => {
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
    setIsSubmitting(true);

    try {
      const session = getCartSession();

      const customerPhone = normalizeIndianPhone(form.mobileNumber);
      const subtotal = cartItems.reduce(
        (sum, item) => sum + Number(item.price) * Number(item.quantity),
        0,
      );
      const deliveryCharge = 0;

      const result = await fetchJson<{
        success: boolean;
        orderId: string;
        total: number;
        message: string;
      }>("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.sessionId,
          customerName: form.fullName,
          customerPhone,
          addressLine1: form.address,
          area: form.area,
          city: form.city,
          pincode: form.pincode,
          landmark: form.landmark,
          deliveryInstructions: form.deliveryInstructions,
          paymentMethod: "cash",
        }),
      });

      const whatsappMessage = formatOrderWhatsAppMessage({
        orderId: result.orderId,
        customerName: form.fullName.trim(),
        customerPhone,
        items: cartItems.map((item) => {
          const customization = getCartItemCustomization(item);

          return {
            item_name: customization.title,
            selected_protein: customization.protein,
            selected_toppings: customization.toppings,
            quantity: Number(item.quantity),
            unit_price: Number(item.price),
          };
        }),
        subtotal,
        deliveryCharge,
        total: result.total,
        paymentMethod: "cash",
        addressLine1: form.address.trim(),
        area: form.area.trim(),
        city: form.city.trim(),
        pincode: form.pincode.trim(),
        landmark: form.landmark.trim(),
        deliveryInstructions: form.deliveryInstructions.trim(),
      });

      const whatsappUrl = createWhatsAppOrderLink(whatsappMessage);
      const whatsappWindow = window.open(whatsappUrl, "_blank");

      if (!whatsappWindow) {
        window.location.href = whatsappUrl;
        dispatch(clearCart());
        return;
      }

      dispatch(clearCart());
      router.push(`/menu?orderSuccess=${encodeURIComponent(result.orderId)}`);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Something went wrong while placing your order.",
      );
    } finally {
      setIsSubmitting(false);
    }
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
          onPlaceOrder={() => void handlePlaceOrder()}
          placeOrderDisabled={cartItems.length === 0 || isSubmitting}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}
