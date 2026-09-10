"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  FaBullseye,
  FaGlobeAmericas,
  FaHeart,
  FaLeaf,
  FaPlus,
  FaRandom,
  FaSlidersH,
  FaSmile,
  FaSyncAlt,
  FaUtensils,
} from "react-icons/fa";
import { supabase } from "@lib/supabase-browser";
import CustomizeMealModal from "../components/CustomizeMealModal";
import SubscriptionStepper from "../components/SubscriptionStepper";
import SubscriptionNavButtons from "../components/SubscriptionNavButtons";
import {
  SUBSCRIPTION_PLANS,
  WEEKLY_DAY_DISPLAY_NAMES,
  WEEKLY_MENU,
  buildSubscriptionHref,
  getAllWeeklyMealIds,
  getDefaultMealCustomization,
  getProteinOption,
  resolveMealCustomization,
  type MealCustomization,
  type SubscriptionPlanId,
  type WeeklyMealSlot,
  type WeeklyMenuDay,
} from "../subscriptionData";
import styles from "../subscriptionFlow.module.css";

type MenuStepProps = {
  planId: SubscriptionPlanId;
};

const DESKTOP_VALUE_PILLARS = [
  { icon: FaLeaf, label: "Balanced Nutrition" },
  { icon: FaBullseye, label: "Supports Your Goals" },
  { icon: FaGlobeAmericas, label: "Global Flavours" },
  { icon: FaSmile, label: "Feel Good Everyday" },
] as const;

type MenuMealCardProps = {
  meal: WeeklyMealSlot;
  slotLabel: "Lunch" | "Dinner" | "Meal";
  customization: MealCustomization;
  onChangeMeal: () => void;
  onCustomize: () => void;
};

function getMealSlotClass(
  slotLabel: "Lunch" | "Dinner" | "Meal",
  stylesModule: typeof styles,
) {
  if (slotLabel === "Dinner") {
    return stylesModule.menuMealSlotDinner;
  }

  return stylesModule.menuMealSlotLunch;
}

function MenuMealCard({
  meal,
  slotLabel,
  customization,
  onChangeMeal,
  onCustomize,
}: MenuMealCardProps) {
  const protein = getProteinOption(customization.protein);

  return (
    <article className={styles.menuPlanMealCard}>
      <div className={styles.menuPlanMealTop}>
        <span className={styles.menuPlanMealImageWrap}>
          <Image
            src={meal.imageUrl}
            alt=""
            fill
            className={styles.menuPlanMealImage}
            sizes="(max-width: 640px) 88px, 104px"
          />
        </span>

        <div className={styles.menuPlanMealContent}>
          <p
            className={`${styles.menuPlanMealSlot} ${getMealSlotClass(slotLabel, styles)}`}
          >
            {slotLabel}
          </p>
          <h3 className={styles.menuPlanMealName}>{meal.name}</h3>

          <ul className={styles.menuPlanMealMeta}>
            {protein ? (
              <li className={styles.menuPlanMetaChip}>
                {protein.imageUrl ? (
                  <span className={styles.menuPlanMetaIconWrap}>
                    <Image
                      src={protein.imageUrl}
                      alt=""
                      fill
                      className={styles.imageContain}
                    />
                  </span>
                ) : (
                  <span className={styles.menuPlanMetaEmoji} aria-hidden>
                    {protein.emoji}
                  </span>
                )}
                {protein.label}
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className={styles.menuPlanMealActions}>
        <button
          type="button"
          className={styles.menuPlanCustomizeBtn}
          onClick={onCustomize}
        >
          <FaSlidersH aria-hidden />
          Customize
        </button>
        <button
          type="button"
          className={styles.menuPlanChangeBtn}
          onClick={onChangeMeal}
        >
          <FaSyncAlt aria-hidden />
          Change
        </button>
      </div>
    </article>
  );
}

type MenuDesktopMealCardProps = {
  meal: WeeklyMealSlot;
  slotLabel: "Lunch" | "Dinner" | "Meal";
  onChangeMeal: () => void;
  onCustomize: () => void;
};

function MenuDesktopMealCard({
  meal,
  slotLabel,
  onChangeMeal,
  onCustomize,
}: MenuDesktopMealCardProps) {
  return (
    <article className={styles.menuDesktopMealCard}>
      <p
        className={`${styles.menuDesktopMealSlot} ${getMealSlotClass(slotLabel, styles)}`}
      >
        {slotLabel}
      </p>
      <div className={styles.menuDesktopMealImageWrap}>
        <Image
          src={meal.imageUrl}
          alt=""
          fill
          className={styles.menuDesktopMealImage}
          sizes="160px"
        />
      </div>
      <h3 className={styles.menuDesktopMealName}>{meal.name}</h3>
      <div className={styles.menuDesktopMealActions}>
        <button
          type="button"
          className={styles.menuDesktopCustomizeBtn}
          onClick={onCustomize}
        >
          <FaSlidersH aria-hidden />
          Customize
        </button>
        <button
          type="button"
          className={styles.menuDesktopChangeBtn}
          onClick={onChangeMeal}
        >
          <FaSyncAlt aria-hidden />
          Change
        </button>
      </div>
    </article>
  );
}

type MenuDaySectionProps = {
  day: WeeklyMenuDay;
  isTwoMeals: boolean;
  getSlotMeal: (meal: WeeklyMealSlot) => WeeklyMealSlot;
  mealCustomizations: Record<string, MealCustomization>;
  onChangeMeal: (slotMeal: WeeklyMealSlot) => void;
  onCustomize: (slotMeal: WeeklyMealSlot) => void;
};

function MenuDaySection({
  day,
  isTwoMeals,
  getSlotMeal,
  mealCustomizations,
  onChangeMeal,
  onCustomize,
}: MenuDaySectionProps) {
  const lunchSlot = day.lunch;
  const dinnerSlot = day.dinner;
  const lunchMeal = getSlotMeal(lunchSlot);
  const dinnerMeal = getSlotMeal(dinnerSlot);

  return (
    <section className={styles.menuPlanDaySection}>
      <div className={styles.menuPlanDayLabel}>
        <span>{day.label}</span>
      </div>

      <div
        className={`${styles.menuPlanDayMeals} ${
          isTwoMeals ? styles.menuPlanDayMealsTwo : ""
        }`}
      >
        <MenuMealCard
          meal={lunchMeal}
          slotLabel={isTwoMeals ? "Lunch" : "Meal"}
          customization={resolveMealCustomization(
            lunchSlot.id,
            mealCustomizations,
          )}
          onChangeMeal={() => onChangeMeal(lunchSlot)}
          onCustomize={() => onCustomize(lunchSlot)}
        />

        {isTwoMeals ? (
          <MenuMealCard
            meal={dinnerMeal}
            slotLabel="Dinner"
            customization={resolveMealCustomization(
              dinnerSlot.id,
              mealCustomizations,
            )}
            onChangeMeal={() => onChangeMeal(dinnerSlot)}
            onCustomize={() => onCustomize(dinnerSlot)}
          />
        ) : null}
      </div>
    </section>
  );
}

export default function MenuStep({ planId }: MenuStepProps) {
  const isTwoMeals = planId === "2-meals";
  const allMealIds = useMemo(() => getAllWeeklyMealIds(planId), [planId]);
  const plan = SUBSCRIPTION_PLANS.find((item) => item.id === planId);
  const mealCount = allMealIds.length;

  const [selectedMealIds] = useState<string[]>(allMealIds);
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [changeMealTarget, setChangeMealTarget] = useState<WeeklyMealSlot | null>(
    null,
  );
  const [mealOverrides, setMealOverrides] = useState<
    Record<string, WeeklyMealSlot>
  >({});
  const [mealCustomizations, setMealCustomizations] = useState<
    Record<string, MealCustomization>
  >({});
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        "there";

      setUserName(name);
    };

    void loadUser();
  }, []);

  const getSlotMeal = (slotMeal: WeeklyMealSlot) =>
    mealOverrides[slotMeal.id] ?? slotMeal;

  const activeMeal = useMemo(() => {
    if (!activeSlotId) return null;

    const slotMeal = WEEKLY_MENU.flatMap((day) => [day.lunch, day.dinner]).find(
      (meal) => meal.id === activeSlotId,
    );

    if (!slotMeal) return null;
    return getSlotMeal(slotMeal);
  }, [activeSlotId, mealOverrides]);

  const continueHref = buildSubscriptionHref({
    step: "details",
    plan: planId,
  });

  const planHref = buildSubscriptionHref({
    step: "plan",
    plan: planId,
  });

  const openCustomize = (slotMeal: WeeklyMealSlot) => {
    setChangeMealTarget(null);
    setActiveSlotId(slotMeal.id);
  };

  const openChangeMeal = (slotMeal: WeeklyMealSlot) => {
    setActiveSlotId(null);
    setChangeMealTarget(slotMeal);
  };

  const closeModals = () => {
    setActiveSlotId(null);
    setChangeMealTarget(null);
  };

  const saveCustomization = (customization: MealCustomization) => {
    if (!activeSlotId) return;

    setMealCustomizations((current) => ({
      ...current,
      [activeSlotId]: customization,
    }));

    setActiveSlotId(null);
  };

  const swapMeal = (replacement: WeeklyMealSlot) => {
    if (!changeMealTarget) return;

    setMealOverrides((current) => ({
      ...current,
      [changeMealTarget.id]: replacement,
    }));
    closeModals();
  };

  const shuffleMenu = () => {
    const pool = WEEKLY_MENU.flatMap((day) => [day.lunch, day.dinner]);
    const slots = isTwoMeals
      ? WEEKLY_MENU.flatMap((day) => [day.lunch, day.dinner])
      : WEEKLY_MENU.map((day) => day.lunch);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);

    const overrides: Record<string, WeeklyMealSlot> = {};
    slots.forEach((slot, index) => {
      overrides[slot.id] = shuffled[index % shuffled.length];
    });

    setMealOverrides(overrides);
  };

  const alternateMeals = useMemo(() => {
    if (!changeMealTarget) return [];

    const currentMeal = getSlotMeal(changeMealTarget);

    return WEEKLY_MENU.flatMap((day) => [day.lunch, day.dinner]).filter(
      (meal) => meal.id !== currentMeal.id,
    );
  }, [changeMealTarget, mealOverrides]);

  const displayName = userName ?? "there";

  return (
    <>
      <div className={`${styles.flow} ${styles.menuFlowWide} ${styles.menuFlowInlineNav}`}>
        <div className={styles.menuPlanStepperRow}>
          <SubscriptionStepper currentStep="menu" />
          <p className={styles.menuPlanTagline}>
            <span>Eat better. Every day.</span>
            <FaHeart className={styles.menuPlanTaglineHeart} aria-hidden />
          </p>
        </div>

        <div className={styles.menuMobileOnly}>
          <header className={styles.menuPlanHeader}>
            {userName ? (
              <p className={styles.menuWelcome}>
                <span className={styles.menuWelcomeWave} aria-hidden>
                  👋
                </span>
                Welcome, {userName}!
              </p>
            ) : null}
            <h1 className={styles.stepTitle}>Your 5-Day Menu</h1>
            <p className={styles.stepSubtitle}>
              Select and customize your meals for the week.
            </p>
          </header>

          <div className={styles.menuPlanSummaryCards}>
            <article className={styles.menuPlanSummaryCard}>
              <span className={styles.menuPlanSummaryIcon} aria-hidden>
                <FaLeaf />
              </span>
              <strong>{mealCount} meals selected</strong>
              <span>{isTwoMeals ? "2 meals per day" : "1 meal per day"}</span>
            </article>

            <article className={styles.menuPlanSummaryCard}>
              <span className={styles.menuPlanSummaryIcon} aria-hidden>
                <FaUtensils />
              </span>
              <strong>5 different cuisines</strong>
              <span>Fresh • Nutritious • Delicious</span>
            </article>

            <article className={styles.menuPlanSummaryCard}>
              <span className={styles.menuPlanSummaryIcon} aria-hidden>
                <FaHeart />
              </span>
              <strong>You can change or customize any meal</strong>
            </article>
          </div>

          <div className={styles.menuPlanDayList}>
            {WEEKLY_MENU.map((day) => (
              <MenuDaySection
                key={day.id}
                day={day}
                isTwoMeals={isTwoMeals}
                getSlotMeal={getSlotMeal}
                mealCustomizations={mealCustomizations}
                onChangeMeal={openChangeMeal}
                onCustomize={openCustomize}
              />
            ))}
          </div>

          <div className={styles.menuPlanInfoBanner}>
            <FaHeart className={styles.menuPlanInfoIcon} aria-hidden />
            <p>
              <strong>Need to make changes?</strong> You can change the meal or
              customize the protein, add-ons or special instructions for any
              meal.
            </p>
          </div>

          <div className={styles.menuPlanFooterPrice}>
            <span>Plan Price</span>
            <strong>
              {plan?.price ?? "₹ 11,000"}
              <small>/ month</small>
            </strong>
          </div>
        </div>

        <div className={styles.menuDesktopOnly}>
          <section className={styles.menuDesktopWelcome}>
            <div className={styles.menuDesktopWelcomeCopy}>
              <h1 className={styles.menuDesktopWelcomeTitle}>
                Hi {displayName}{" "}
                <span className={styles.menuWelcomeWave} aria-hidden>
                  👋
                </span>
              </h1>
              <p className={styles.menuDesktopWelcomeLead}>
                Let&apos;s build your 5-day meal plan
              </p>
              <p className={styles.menuDesktopWelcomeTagline}>
                Delicious. Nutritious. Customizable. Just for you.
              </p>
            </div>

            <ul className={styles.menuDesktopValueList}>
              {DESKTOP_VALUE_PILLARS.map(({ icon: Icon, label }) => (
                <li key={label}>
                  <span className={styles.menuDesktopValueIcon} aria-hidden>
                    <Icon />
                  </span>
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className={styles.menuDesktopSectionHead}>
            <div>
              <h2 className={styles.menuDesktopSectionTitle}>Your 5-Day Menu</h2>
              <p className={styles.menuDesktopSectionSubtitle}>
                You can customize, swap or change any meal. Each meal is tailored
                to your plan.
              </p>
            </div>
            <button
              type="button"
              className={styles.menuDesktopShuffleBtn}
              onClick={shuffleMenu}
            >
              <FaRandom aria-hidden />
              Shuffle Menu
            </button>
          </div>

          <div className={styles.menuDesktopGrid}>
            {WEEKLY_MENU.map((day) => {
              const lunchSlot = day.lunch;
              const dinnerSlot = day.dinner;
              const lunchMeal = getSlotMeal(lunchSlot);
              const dinnerMeal = getSlotMeal(dinnerSlot);

              return (
                <div key={day.id} className={styles.menuDesktopDayColumn}>
                  <div className={styles.menuDesktopDayHead}>
                    <span>{WEEKLY_DAY_DISPLAY_NAMES[day.id] ?? day.label}</span>
                  </div>

                  <MenuDesktopMealCard
                    meal={lunchMeal}
                    slotLabel={isTwoMeals ? "Lunch" : "Meal"}
                    onChangeMeal={() => openChangeMeal(lunchSlot)}
                    onCustomize={() => openCustomize(lunchSlot)}
                  />

                  {isTwoMeals ? (
                    <MenuDesktopMealCard
                      meal={dinnerMeal}
                      slotLabel="Dinner"
                      onChangeMeal={() => openChangeMeal(dinnerSlot)}
                      onCustomize={() => openCustomize(dinnerSlot)}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className={styles.menuDesktopExtras}>
            <span className={styles.menuDesktopExtrasIcon} aria-hidden>
              <FaPlus />
            </span>
            <p>
              <strong>Add Extras to Your Plan:</strong> Smoothies, Soups,
              Starters and more
            </p>
            <button type="button" className={styles.menuDesktopExtrasBtn}>
              Browse Extras
            </button>
          </div>
        </div>

        <SubscriptionNavButtons
          layout="inline"
          backHref={planHref}
          backLabel="Back to Plan"
          continueHref={continueHref}
          continueDisabled={selectedMealIds.length === 0}
          continueLabel="Continue to Details"
        />

        <div className={styles.menuDesktopOnly}>
          <div className={styles.menuDesktopBottomRow}>
            <div className={styles.menuDesktopBottomValues}>
              <span>
                <FaUtensils aria-hidden />
                High Protein
              </span>
              <span>
                <FaLeaf aria-hidden />
                Fresh Ingredients
              </span>
              <span>
                <FaHeart aria-hidden />
                Balanced Nutrition
              </span>
            </div>
            <p className={styles.menuDesktopScript}>From Seoul to Salsa.</p>
          </div>
        </div>
      </div>

      {activeMeal && activeSlotId ? (
        <CustomizeMealModal
          meal={activeMeal}
          initialCustomization={
            mealCustomizations[activeSlotId] ?? getDefaultMealCustomization()
          }
          onClose={closeModals}
          onSave={saveCustomization}
        />
      ) : null}

      {changeMealTarget ? (
        <div className={styles.changeMealOverlay} role="presentation">
          <button
            type="button"
            className={styles.customizeBackdrop}
            aria-label="Close change meal"
            onClick={closeModals}
          />
          <div className={styles.changeMealPanel} role="dialog" aria-modal="true">
            <h2 className={styles.changeMealTitle}>Change Meal</h2>
            <p className={styles.changeMealSubtitle}>
              Replace {changeMealTarget.name} with another option.
            </p>
            <ul className={styles.changeMealList}>
              {alternateMeals.map((meal) => (
                <li key={meal.id}>
                  <button
                    type="button"
                    className={styles.changeMealOption}
                    onClick={() => swapMeal(meal)}
                  >
                    <span className={styles.changeMealOptionImageWrap}>
                      <Image
                        src={meal.imageUrl}
                        alt=""
                        fill
                        className={styles.imageContain}
                      />
                    </span>
                    {meal.name}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={styles.changeMealCancelBtn}
              onClick={closeModals}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
