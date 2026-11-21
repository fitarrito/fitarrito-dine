"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaHome,
  FaLeaf,
  FaMapMarkerAlt,
  FaPhone,
  FaStickyNote,
  FaUser,
} from "react-icons/fa";
import CheckoutSteps from "@/components/checkout/CheckoutSteps";
import DeliveryLocationPicker, {
  type SelectedDeliveryLocation,
} from "@/components/checkout/DeliveryLocationPicker";
import FreeDeliveryCelebration, {
  type ConfirmedDeliveryQuote,
} from "@/components/checkout/FreeDeliveryCelebration";
import OnlineOrderingClosedNotice from "@/components/OnlineOrderingClosedNotice";
import OrderSummaryPanel from "@/components/checkout/OrderSummaryPanel";
import { fetchCart } from "@lib/features/cartSlice";
import { getCartSession } from "@lib/cartSession";
import { fetchJson } from "@lib/apiFetch";
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
import { calculateDeliveryFee } from "@lib/deliveryFee";
import { useAppDispatch, useAppSelector } from "@lib/hooks";
import { unavailableCartMessage } from "@lib/menuVisibility";
import { ONLINE_ORDERING_CLOSED_TITLE } from "@lib/onlineOrdering";
import { SPECIAL_REQUESTS_MAX_LENGTH } from "@lib/specialRequests";
import { useOnlineOrdering } from "@lib/useOnlineOrdering";
import styles from "./checkout.module.css";

const REQUIRED_FIELDS = [
  "fullName",
  "mobileNumber",
  "address",
  "area",
  "city",
  "pincode",
] as const;

type RequiredField = (typeof REQUIRED_FIELDS)[number];

const FIELD_IDS: Record<RequiredField, string> = {
  fullName: "checkout-full-name",
  mobileNumber: "checkout-mobile",
  address: "checkout-address",
  area: "checkout-area",
  city: "checkout-city",
  pincode: "checkout-pincode",
};

function isValidPincode(value: string) {
  return /^\d{6}$/.test(value.trim());
}

function validationMessage(
  field: RequiredField,
  form: CheckoutDelivery,
): string | null {
  if (field === "fullName") {
    return form.fullName.trim() ? null : "Please enter your name.";
  }

  if (field === "mobileNumber") {
    return isValidIndianMobile(normalizeIndianPhone(form.mobileNumber))
      ? null
      : "Please enter a valid mobile number.";
  }

  if (field === "address") {
    return form.address.trim() ? null : "Please enter your delivery address.";
  }

  if (field === "area") {
    return form.area.trim() ? null : "Please enter your area.";
  }

  if (field === "city") {
    return form.city.trim() ? null : "Please enter your city.";
  }

  return isValidPincode(form.pincode)
    ? null
    : "Please enter a valid 6-digit pincode.";
}

function collectFieldErrors(form: CheckoutDelivery) {
  const errors: Partial<Record<RequiredField, string>> = {};

  for (const field of REQUIRED_FIELDS) {
    const message = validationMessage(field, form);

    if (message) errors[field] = message;
  }

  return errors;
}

function sameQuoteTarget(
  current: CheckoutDelivery,
  snapshot: Pick<
    CheckoutDelivery,
    "address" | "area" | "city" | "pincode" | "landmark" | "latitude" | "longitude"
  >,
) {
  return (
    current.address === snapshot.address &&
    current.area === snapshot.area &&
    current.city === snapshot.city &&
    current.pincode === snapshot.pincode &&
    current.landmark === snapshot.landmark &&
    current.latitude === snapshot.latitude &&
    current.longitude === snapshot.longitude
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((state) => state.cart.cartItems);
  const subtotal = useAppSelector((state) => state.cart.totalAmt);
  const loading = useAppSelector((state) => state.cart.loading);
  const [form, setForm] = useState<CheckoutDelivery>(EMPTY_CHECKOUT_DELIVERY);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<RequiredField, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedQuote, setConfirmedQuote] = useState<ConfirmedDeliveryQuote | null>(null);
  const [deliveryQuoteFailed, setDeliveryQuoteFailed] = useState(false);
  const validationRequested = useRef(false);
  const formRef = useRef(form);
  formRef.current = form;
  const ordering = useOnlineOrdering();
  const unavailableItems = cartItems.filter((item) => item.is_available === false);
  const unavailableMessage =
    unavailableItems.length > 0 ? unavailableCartMessage(unavailableItems) : null;

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

  const syncFieldError = (field: RequiredField, next: CheckoutDelivery) => {
    if (!validationRequested.current) return;

    const message = validationMessage(field, next);

    setFieldErrors((current) => {
      if (message) {
        return current[field] === message ? current : { ...current, [field]: message };
      }

      if (!current[field]) return current;

      const rest = { ...current };
      delete rest[field];
      return rest;
    });
  };

  const updateField =
    (field: keyof CheckoutDelivery) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const resetsQuote =
        field === "address" ||
        field === "area" ||
        field === "city" ||
        field === "pincode" ||
        field === "landmark";
      const next = {
        ...form,
        [field]: event.target.value,
        ...(resetsQuote
          ? {
              latitude: null,
              longitude: null,
              deliveryCharge: null,
              distanceKm: null,
            }
          : {}),
      };

      setForm((current) => ({
        ...current,
        [field]: event.target.value,
        ...(resetsQuote
          ? {
              latitude: null,
              longitude: null,
              deliveryCharge: null,
              distanceKm: null,
            }
          : {}),
      }));
      if (resetsQuote) {
        setConfirmedQuote(null);
        setDeliveryQuoteFailed(false);
      }
      setFormError(null);

      if (
        field === "fullName" ||
        field === "address" ||
        field === "area" ||
        field === "city" ||
        field === "pincode"
      ) {
        syncFieldError(field, next);
      }
    };

  const applySelectedLocation = (
    location: SelectedDeliveryLocation,
    zoneMessage: string | null,
  ) => {
    const next = {
      ...form,
      addressType: "normal_address" as const,
      address: location.address || form.address,
      area: location.area || form.area,
      city: location.city || form.city || "Chennai",
      pincode: location.pincode || form.pincode,
      latitude: location.latitude,
      longitude: location.longitude,
      deliveryCharge: null,
      distanceKm: null,
    };

    setForm((current) => ({
      ...current,
      addressType: "normal_address",
      address: location.address || current.address,
      area: location.area || current.area,
      city: location.city || current.city || "Chennai",
      pincode: location.pincode || current.pincode,
      latitude: location.latitude,
      longitude: location.longitude,
      deliveryCharge: null,
      distanceKm: null,
    }));
    setConfirmedQuote(null);
    setDeliveryQuoteFailed(false);
    setFormError(zoneMessage);
    syncFieldError("address", next);
    syncFieldError("area", next);
    syncFieldError("city", next);
    syncFieldError("pincode", next);
  };

  const requestDeliveryQuote = (
    current: CheckoutDelivery,
    signal?: AbortSignal,
  ) =>
    fetchJson<{
      latitude: number;
      longitude: number;
      distanceKm: number;
      deliveryCharge: number;
    }>("/api/delivery/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addressLine1: current.address,
        area: current.area,
        city: current.city,
        pincode: current.pincode,
        landmark: current.landmark,
        latitude: current.latitude,
        longitude: current.longitude,
      }),
      signal,
    });

  useEffect(() => {
    if (
      !form.address.trim() ||
      !form.area.trim() ||
      !form.city.trim() ||
      !isValidPincode(form.pincode)
    ) {
      return;
    }

    const snapshot = {
      address: form.address,
      area: form.area,
      city: form.city,
      pincode: form.pincode,
      landmark: form.landmark,
      latitude: form.latitude,
      longitude: form.longitude,
    };
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void requestDeliveryQuote(form, controller.signal)
        .then((quote) => {
          if (!sameQuoteTarget(formRef.current, snapshot)) return;

          setForm((current) => {
            if (!sameQuoteTarget(current, snapshot)) return current;

            const next = {
              ...current,
              latitude: quote.latitude,
              longitude: quote.longitude,
              deliveryCharge: quote.deliveryCharge,
              distanceKm: quote.distanceKm,
            };

            saveCheckoutDelivery(next);
            return next;
          });
          setConfirmedQuote({
            deliveryCharge: quote.deliveryCharge,
            distanceKm: quote.distanceKm,
          });
          setDeliveryQuoteFailed(false);
          setFormError(null);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
            return;
          }

          if (
            formRef.current.address !== snapshot.address ||
            formRef.current.area !== snapshot.area ||
            formRef.current.city !== snapshot.city ||
            formRef.current.pincode !== snapshot.pincode ||
            formRef.current.landmark !== snapshot.landmark
          ) {
            return;
          }

          setForm((current) => {
            if (
              current.address !== snapshot.address ||
              current.area !== snapshot.area ||
              current.city !== snapshot.city ||
              current.pincode !== snapshot.pincode ||
              current.landmark !== snapshot.landmark
            ) {
              return current;
            }

            return {
              ...current,
              deliveryCharge: null,
              distanceKm: null,
            };
          });
          setConfirmedQuote(null);
          setDeliveryQuoteFailed(true);
          setFormError(
            error instanceof Error
              ? error.message
              : "We couldn't calculate delivery for this address.",
          );
        });
    }, 700);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    form.address,
    form.area,
    form.city,
    form.pincode,
    form.landmark,
    form.latitude,
    form.longitude,
  ]);

  const updateMobileNumber = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const digits = event.target.value.replace(/\D/g, "").slice(0, 10);

    const next = { ...form, mobileNumber: digits };

    setForm((current) => ({ ...current, mobileNumber: digits }));
    setFormError(null);
    syncFieldError("mobileNumber", next);
  };

  const handleContinueToPayment = async () => {
    if (ordering.enabled === false) {
      setFormError(ONLINE_ORDERING_CLOSED_TITLE);
      return;
    }

    if (unavailableMessage) {
      setFormError(unavailableMessage);
      return;
    }

    const errors = collectFieldErrors(form);

    validationRequested.current = true;
    setFieldErrors(errors);

    const firstInvalid = REQUIRED_FIELDS.find((field) => errors[field]);

    if (firstInvalid) {
      document.getElementById(FIELD_IDS[firstInvalid])?.focus();
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const quote = await requestDeliveryQuote(form);
      const next = {
        ...form,
        addressType: "normal_address" as const,
        locationId: "",
        latitude: quote.latitude,
        longitude: quote.longitude,
        deliveryCharge: quote.deliveryCharge,
        distanceKm: quote.distanceKm,
      };

      saveCheckoutDelivery(next);
      setForm(next);
      setConfirmedQuote({
        deliveryCharge: quote.deliveryCharge,
        distanceKm: quote.distanceKm,
      });
      setDeliveryQuoteFailed(false);
      router.push("/checkout/payment");
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "We couldn't calculate delivery for this address.",
      );
    } finally {
      setIsSubmitting(false);
    }
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

      <OnlineOrderingClosedNotice />

      <div className={styles.layout}>
        <form className={styles.formCard} onSubmit={handleSubmit} noValidate>
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
                    id={FIELD_IDS.fullName}
                    type="text"
                    value={form.fullName}
                    onChange={updateField("fullName")}
                    placeholder="Enter your full name"
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors.fullName)}
                    aria-describedby={fieldErrors.fullName ? `${FIELD_IDS.fullName}-error` : undefined}
                    className={fieldErrors.fullName ? styles.inputInvalid : undefined}
                  />
                </span>
                {fieldErrors.fullName ? (
                  <span id={`${FIELD_IDS.fullName}-error`} className={styles.fieldError} role="alert">
                    {fieldErrors.fullName}
                  </span>
                ) : null}
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
                    id={FIELD_IDS.mobileNumber}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={form.mobileNumber}
                    onChange={updateMobileNumber}
                    placeholder="Enter mobile number"
                    maxLength={10}
                    aria-required="true"
                    aria-invalid={Boolean(fieldErrors.mobileNumber)}
                    aria-describedby={
                      fieldErrors.mobileNumber ? `${FIELD_IDS.mobileNumber}-error` : undefined
                    }
                    className={fieldErrors.mobileNumber ? styles.inputInvalid : undefined}
                  />
                </span>
                {fieldErrors.mobileNumber ? (
                  <span id={`${FIELD_IDS.mobileNumber}-error`} className={styles.fieldError} role="alert">
                    {fieldErrors.mobileNumber}
                  </span>
                ) : null}
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
                  Enter where you want your order delivered.
                </p>
              </div>
            </header>

            <div className={styles.addressFields}>
                <DeliveryLocationPicker
                  latitude={form.latitude}
                  longitude={form.longitude}
                  onChange={applySelectedLocation}
                />
                <label className={styles.field}>
                  <span className={styles.label}>
                    Address <span className={styles.required}>*</span>
                  </span>
                  <span className={styles.inputWrap}>
                    <FaHome className={styles.inputIcon} aria-hidden />
                    <input
                      id={FIELD_IDS.address}
                      type="text"
                      value={form.address}
                      onChange={updateField("address")}
                      placeholder="House no., street, building"
                      aria-required="true"
                      aria-invalid={Boolean(fieldErrors.address)}
                      aria-describedby={fieldErrors.address ? `${FIELD_IDS.address}-error` : undefined}
                      className={fieldErrors.address ? styles.inputInvalid : undefined}
                    />
                  </span>
                  {fieldErrors.address ? (
                    <span id={`${FIELD_IDS.address}-error`} className={styles.fieldError} role="alert">
                      {fieldErrors.address}
                    </span>
                  ) : null}
                </label>
                <div className={styles.fieldGridTwo}>
                  <label className={styles.field}>
                    <span className={styles.label}>
                      Area <span className={styles.required}>*</span>
                    </span>
                    <input
                      id={FIELD_IDS.area}
                      className={`${styles.plainInput} ${fieldErrors.area ? styles.inputInvalid : ""}`}
                      type="text"
                      value={form.area}
                      onChange={updateField("area")}
                      placeholder="Area"
                      aria-required="true"
                      aria-invalid={Boolean(fieldErrors.area)}
                      aria-describedby={fieldErrors.area ? `${FIELD_IDS.area}-error` : undefined}
                    />
                    {fieldErrors.area ? (
                      <span id={`${FIELD_IDS.area}-error`} className={styles.fieldError} role="alert">
                        {fieldErrors.area}
                      </span>
                    ) : null}
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>
                      City <span className={styles.required}>*</span>
                    </span>
                    <input
                      id={FIELD_IDS.city}
                      className={`${styles.plainInput} ${fieldErrors.city ? styles.inputInvalid : ""}`}
                      type="text"
                      value={form.city}
                      onChange={updateField("city")}
                      placeholder="City"
                      aria-required="true"
                      aria-invalid={Boolean(fieldErrors.city)}
                      aria-describedby={fieldErrors.city ? `${FIELD_IDS.city}-error` : undefined}
                    />
                    {fieldErrors.city ? (
                      <span id={`${FIELD_IDS.city}-error`} className={styles.fieldError} role="alert">
                        {fieldErrors.city}
                      </span>
                    ) : null}
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>
                      Pincode <span className={styles.required}>*</span>
                    </span>
                    <input
                      id={FIELD_IDS.pincode}
                      className={`${styles.plainInput} ${fieldErrors.pincode ? styles.inputInvalid : ""}`}
                      type="text"
                      inputMode="numeric"
                      value={form.pincode}
                      onChange={updateField("pincode")}
                      placeholder="Pincode"
                      aria-required="true"
                      aria-invalid={Boolean(fieldErrors.pincode)}
                      aria-describedby={fieldErrors.pincode ? `${FIELD_IDS.pincode}-error` : undefined}
                    />
                    {fieldErrors.pincode ? (
                      <span id={`${FIELD_IDS.pincode}-error`} className={styles.fieldError} role="alert">
                        {fieldErrors.pincode}
                      </span>
                    ) : null}
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
          </section>

          <section className={styles.instructionsSection}>
            <header className={styles.instructionsHeader}>
              <FaStickyNote aria-hidden />
              <span>Special Requests &amp; Food Allergies (Optional)</span>
            </header>
            <textarea
              className={styles.instructionsTextarea}
              value={form.specialRequests ?? ""}
              onChange={updateField("specialRequests")}
              placeholder="e.g. No peanuts, less spicy"
              maxLength={SPECIAL_REQUESTS_MAX_LENGTH}
              rows={3}
            />
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

          {unavailableMessage ? (
            <p className={styles.formError}>{unavailableMessage}</p>
          ) : null}
          {formError ? <p className={styles.formError}>{formError}</p> : null}
        </form>

        <OrderSummaryPanel
          variant="delivery"
          deliveryCharge={form.deliveryCharge}
          distanceKm={form.distanceKm}
          onPlaceOrder={() => void handleContinueToPayment()}
          placeOrderDisabled={
            cartItems.length === 0 || isSubmitting || Boolean(unavailableMessage)
          }
          buttonHint={unavailableMessage}
          isSubmitting={isSubmitting}
          submitLabel={isSubmitting ? "Checking delivery..." : "Place Order"}
        />
      </div>

      <FreeDeliveryCelebration
        quote={
          confirmedQuote == null
            ? null
            : {
                distanceKm: confirmedQuote.distanceKm,
                deliveryCharge:
                  calculateDeliveryFee(confirmedQuote.distanceKm, subtotal) ??
                  confirmedQuote.deliveryCharge,
              }
        }
        quoteFailed={deliveryQuoteFailed}
      />
    </div>
  );
}
