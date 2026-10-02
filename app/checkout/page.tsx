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
import {
  DELIVERY_AREAS,
  getDeliveryAreaById,
  type DeliveryArea,
} from "@lib/deliveryAreas";
import {
  isValidIndianMobile,
  normalizeIndianPhone,
} from "@lib/normalizePhone";
import {
  EMPTY_CHECKOUT_DELIVERY,
  loadCheckoutDelivery,
  saveCheckoutDelivery,
  type CheckoutDelivery,
  type DeliveryAddressType,
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

  const selectAddressType = (addressType: DeliveryAddressType) => {
    setForm((current) => ({
      ...current,
      addressType,
      locationId: addressType === "selected_location" ? current.locationId : "",
      area: addressType === "selected_location" ? current.area : "",
      address: addressType === "selected_location" ? current.address : "",
      pincode: addressType === "selected_location" ? current.pincode : "",
      landmark: addressType === "selected_location" ? "" : current.landmark,
      city: current.city || "Chennai",
    }));
    setFormError(null);
  };

  const selectDeliveryLocation = (location: DeliveryArea) => {
    setForm((current) => ({
      ...current,
      addressType: "selected_location",
      locationId: location.id,
      area: location.name,
      address: location.name,
      city: "Chennai",
      pincode: location.pincode,
      landmark: "",
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
    if (!form.fullName.trim() || !form.mobileNumber.trim()) {
      setFormError("Please fill in all required delivery details.");
      return;
    }

    if (form.addressType === "normal_address") {
      if (
        !form.address.trim() ||
        !form.area.trim() ||
        !form.city.trim() ||
        !form.pincode.trim()
      ) {
        setFormError("Please fill in your delivery address.");
        return;
      }
    } else if (!getDeliveryAreaById(form.locationId)) {
      setFormError("Please select a delivery location.");
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
                <FaMapMarkerAlt aria-hidden />
              </span>
              <div>
                <h2 className={styles.sectionTitle}>Delivery Details</h2>
                <p className={styles.sectionSubtitle}>
                  Choose where you want your order delivered.
                </p>
              </div>
            </header>

            <div className={styles.addressTypes} role="radiogroup" aria-label="Delivery address type">
              <button
                type="button"
                className={`${styles.addressType} ${form.addressType === "selected_location" ? styles.addressTypeSelected : ""}`}
                onClick={() => selectAddressType("selected_location")}
                aria-pressed={form.addressType === "selected_location"}
              >
                <span className={styles.addressTypeIcon} aria-hidden>
                  <FaBuilding />
                </span>
                <span>
                  <span className={styles.addressTypeTitle}>College / Office / Listed Location</span>
                  <span className={styles.addressTypeHint}>Select from our delivery locations</span>
                </span>
              </button>
              <button
                type="button"
                className={`${styles.addressType} ${form.addressType === "normal_address" ? styles.addressTypeSelected : ""}`}
                onClick={() => selectAddressType("normal_address")}
                aria-pressed={form.addressType === "normal_address"}
              >
                <span className={styles.addressTypeIcon} aria-hidden>
                  <FaHome />
                </span>
                <span>
                  <span className={styles.addressTypeTitle}>Other Address</span>
                  <span className={styles.addressTypeHint}>Enter your own delivery address</span>
                </span>
              </button>
            </div>

            {form.addressType === "selected_location" ? (
              <div className={styles.locationList} role="radiogroup" aria-label="Delivery location">
                {DELIVERY_AREAS.map((location) => {
                  const selected = form.locationId === location.id;

                  return (
                    <label
                      className={`${styles.locationOption} ${selected ? styles.locationOptionSelected : ""}`}
                      key={location.id}
                    >
                      <input
                        type="radio"
                        name="deliveryLocation"
                        value={location.id}
                        checked={selected}
                        onChange={() => selectDeliveryLocation(location)}
                      />
                      <span>
                        <span className={styles.locationName}>{location.name}</span>
                        <span className={styles.locationMeta}>Chennai {location.pincode}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className={styles.addressFields}>
                <label className={styles.field}>
                  <span className={styles.label}>
                    Address <span className={styles.required}>*</span>
                  </span>
                  <span className={styles.inputWrap}>
                    <FaHome className={styles.inputIcon} aria-hidden />
                    <input
                      type="text"
                      value={form.address}
                      onChange={updateField("address")}
                      placeholder="House no., street, building"
                      required
                    />
                  </span>
                </label>
                <div className={styles.fieldGridTwo}>
                  <label className={styles.field}>
                    <span className={styles.label}>
                      Area <span className={styles.required}>*</span>
                    </span>
                    <input
                      className={styles.plainInput}
                      type="text"
                      value={form.area}
                      onChange={updateField("area")}
                      placeholder="Area"
                      required
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>
                      City <span className={styles.required}>*</span>
                    </span>
                    <input
                      className={styles.plainInput}
                      type="text"
                      value={form.city}
                      onChange={updateField("city")}
                      placeholder="City"
                      required
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>
                      Pincode <span className={styles.required}>*</span>
                    </span>
                    <input
                      className={styles.plainInput}
                      type="text"
                      inputMode="numeric"
                      value={form.pincode}
                      onChange={updateField("pincode")}
                      placeholder="Pincode"
                      required
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Landmark</span>
                    <input
                      className={styles.plainInput}
                      type="text"
                      value={form.landmark}
                      onChange={updateField("landmark")}
                      placeholder="Landmark"
                    />
                  </label>
                </div>
              </div>
            )}
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
