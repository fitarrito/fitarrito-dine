"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { FaCheck, FaTimes } from "react-icons/fa";
import {
  CUSTOMIZE_PROTEIN_OPTIONS,
  MEAL_ADD_ONS,
  MEAL_SIZE_OPTIONS,
  getDefaultMealCustomization,
  type MealCustomization,
  type WeeklyMealSlot,
} from "../subscriptionData";
import styles from "../subscriptionFlow.module.css";

type CustomizeMealModalProps = {
  meal: WeeklyMealSlot;
  initialCustomization: MealCustomization;
  onClose: () => void;
  onSave: (customization: MealCustomization) => void;
};

export default function CustomizeMealModal({
  meal,
  initialCustomization,
  onClose,
  onSave,
}: CustomizeMealModalProps) {
  const [draft, setDraft] = useState<MealCustomization>(initialCustomization);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const toggleAddOn = (addOnId: string) => {
    setDraft((current) => ({
      ...current,
      addOns: current.addOns.includes(addOnId)
        ? current.addOns.filter((id) => id !== addOnId)
        : [...current.addOns, addOnId],
    }));
  };

  return (
    <div className={styles.customizeOverlay} role="presentation">
      <button
        type="button"
        className={styles.customizeBackdrop}
        aria-label="Close customize meal"
        onClick={onClose}
      />

      <div
        className={styles.customizePanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="customize-meal-title"
      >
        <div className={styles.customizeHero}>
          <Image
            src={meal.imageUrl}
            alt={meal.name}
            fill
            className={styles.customizeHeroImage}
            sizes="(max-width: 640px) 100vw, 480px"
            priority
          />
          <button
            type="button"
            className={styles.customizeCloseBtn}
            aria-label="Close"
            onClick={onClose}
          >
            <FaTimes aria-hidden />
          </button>
        </div>

        <div className={styles.customizeBody}>
          <h2 id="customize-meal-title" className={styles.customizeTitle}>
            {meal.name}
          </h2>
          <p className={styles.customizeDescription}>{meal.description}</p>

          <section className={styles.customizeSection}>
            <h3 className={styles.customizeSectionTitle}>Choose Protein</h3>
            <div className={styles.customizeProteinGrid}>
              {CUSTOMIZE_PROTEIN_OPTIONS.map((option) => {
                const selected = draft.protein === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`${styles.customizeProteinTile} ${
                      selected ? styles.customizeProteinTileSelected : ""
                    }`}
                    onClick={() =>
                      setDraft((current) => ({ ...current, protein: option.id }))
                    }
                    aria-pressed={selected}
                  >
                    {selected ? (
                      <span className={styles.customizeTileCheck} aria-hidden>
                        <FaCheck />
                      </span>
                    ) : null}
                    {option.imageUrl ? (
                      <span className={styles.customizeTileIconWrap}>
                        <Image
                          src={option.imageUrl}
                          alt=""
                          fill
                          className={styles.imageContain}
                        />
                      </span>
                    ) : (
                      <span className={styles.customizeTileEmoji} aria-hidden>
                        {option.emoji}
                      </span>
                    )}
                    <span className={styles.customizeTileLabel}>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className={styles.customizeSection}>
            <h3 className={styles.customizeSectionTitle}>Size Preference</h3>
            <div className={styles.customizeSizeRow}>
              {MEAL_SIZE_OPTIONS.map((option) => {
                const selected = draft.size === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`${styles.customizeSizeBtn} ${
                      selected ? styles.customizeSizeBtnSelected : ""
                    }`}
                    onClick={() =>
                      setDraft((current) => ({ ...current, size: option.id }))
                    }
                    aria-pressed={selected}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className={styles.customizeSection}>
            <h3 className={styles.customizeSectionTitle}>
              Add-ons <span className={styles.customizeOptional}>(Optional)</span>
            </h3>
            <ul className={styles.customizeAddOnList}>
              {MEAL_ADD_ONS.map((addOn) => (
                <li key={addOn.id}>
                  <label className={styles.customizeAddOnItem}>
                    <input
                      type="checkbox"
                      checked={draft.addOns.includes(addOn.id)}
                      onChange={() => toggleAddOn(addOn.id)}
                    />
                    <span className={styles.customizeAddOnLabel}>{addOn.label}</span>
                    <span className={styles.customizeAddOnPrice}>
                      +₹{addOn.price}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.customizeSection}>
            <h3 className={styles.customizeSectionTitle}>Special Instructions</h3>
            <textarea
              className={styles.customizeTextarea}
              placeholder="e.g. less spicy, no onions, extra veggies..."
              value={draft.specialInstructions}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  specialInstructions: event.target.value,
                }))
              }
              rows={3}
            />
          </section>
        </div>

        <div className={styles.customizeFooter}>
          <button
            type="button"
            className={styles.customizeCancelBtn}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.customizeSaveBtn}
            onClick={() => onSave(draft)}
          >
            Save Meal
          </button>
        </div>
      </div>
    </div>
  );
}
