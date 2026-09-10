export type SubscriptionPlanId = "1-meal" | "2-meals";

export type SubscriptionStep =
  | "landing"
  | "plan"
  | "account"
  | "menu"
  | "details"
  | "payment";

export const SUBSCRIPTION_STEPS: {
  id: SubscriptionStep;
  label: string;
}[] = [
  { id: "plan", label: "Plan" },
  { id: "account", label: "Account" },
  { id: "menu", label: "Menu" },
  { id: "details", label: "Details" },
  { id: "payment", label: "Payment" },
];

export const SUBSCRIPTION_PLANS: {
  id: SubscriptionPlanId;
  title: string;
  subtitle: string;
  price: string;
  bowlImages: string[];
}[] = [
  {
    id: "1-meal",
    title: "1 MEAL / DAY",
    subtitle: "Lunch or Dinner",
    price: "₹ 5,500",
    bowlImages: ["/images/menuimages/QuinoaBowl.svg"],
  },
  {
    id: "2-meals",
    title: "2 MEALS / DAY",
    subtitle: "Lunch + Dinner",
    price: "₹ 11,000",
    bowlImages: [
      "/images/menuimages/QuinoaBowl.svg",
      "/images/menuimages/ChickenHummusBowl.svg",
    ],
  },
];

export type FoodPreferenceId =
  | "vegetarian"
  | "chicken"
  | "mutton"
  | "fish"
  | "egg"
  | "paneer"
  | "mushroom"
  | "tofu"
  | "no-preference";

export const FOOD_PREFERENCES: {
  id: FoodPreferenceId;
  label: string;
  imageUrl?: string;
  emoji?: string;
}[] = [
  {
    id: "vegetarian",
    label: "Vegetarian",
    imageUrl: "/images/menuimages/proteinImages/VeggiesIcon.svg",
  },
  {
    id: "chicken",
    label: "Chicken",
    imageUrl: "/images/menuimages/proteinImages/ChickenIcon.svg",
  },
  {
    id: "mutton",
    label: "Mutton",
    imageUrl: "/images/menuimages/proteinImages/MeatIcon.svg",
  },
  {
    id: "fish",
    label: "Fish",
    imageUrl: "/images/menuimages/proteinImages/FishIcon.svg",
  },
  { id: "egg", label: "Egg", emoji: "🥚" },
  {
    id: "paneer",
    label: "Paneer",
    imageUrl: "/images/menuimages/proteinImages/PaneerIcon.svg",
  },
  {
    id: "mushroom",
    label: "Mushroom",
    imageUrl: "/images/menuimages/proteinImages/MushroomIcon.svg",
  },
  { id: "tofu", label: "Tofu", emoji: "🧈" },
  { id: "no-preference", label: "No Preference", emoji: "⋯" },
];

export type MealSize = "mini" | "regular" | "jumbo";

export type CustomizeProteinId =
  | "chicken"
  | "mutton"
  | "fish"
  | "paneer"
  | "mushroom"
  | "tofu";

export type MealCustomization = {
  protein: CustomizeProteinId;
  size: MealSize;
  addOns: string[];
  specialInstructions: string;
};

export const MEAL_SIZE_OPTIONS: { id: MealSize; label: string }[] = [
  { id: "mini", label: "Mini" },
  { id: "regular", label: "Regular" },
  { id: "jumbo", label: "Jumbo" },
];

export const MEAL_ADD_ONS: {
  id: string;
  label: string;
  price: number;
}[] = [
  { id: "guacamole", label: "Guacamole", price: 50 },
  { id: "salsa", label: "Salsa", price: 30 },
  { id: "cheese", label: "Cheese", price: 40 },
  { id: "extra-protein", label: "Extra Protein", price: 90 },
];

export const CUSTOMIZE_PROTEIN_OPTIONS = FOOD_PREFERENCES.filter(
  (item): item is (typeof FOOD_PREFERENCES)[number] & { id: CustomizeProteinId } =>
    [
      "chicken",
      "mutton",
      "fish",
      "paneer",
      "mushroom",
      "tofu",
    ].includes(item.id),
);

export function getDefaultMealCustomization(): MealCustomization {
  return {
    protein: "chicken",
    size: "regular",
    addOns: [],
    specialInstructions: "",
  };
}

export function resolveMealCustomization(
  mealId: string,
  saved: Record<string, MealCustomization>,
): MealCustomization {
  return saved[mealId] ?? getDefaultMealCustomization();
}

export function isMealCustomized(
  mealId: string,
  saved: Record<string, MealCustomization>,
): boolean {
  return Boolean(saved[mealId]);
}

export function getProteinOption(id: CustomizeProteinId) {
  return CUSTOMIZE_PROTEIN_OPTIONS.find((item) => item.id === id);
}

export function getSizeLabel(id: MealSize) {
  return MEAL_SIZE_OPTIONS.find((item) => item.id === id)?.label ?? id;
}

export type WeeklyMealSlot = {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
};

export type WeeklyMenuDay = {
  id: string;
  label: string;
  dateLabel: string;
  lunch: WeeklyMealSlot;
  dinner: WeeklyMealSlot;
};

export const WEEKLY_MENU: WeeklyMenuDay[] = [
  {
    id: "mon",
    label: "MON",
    dateLabel: "14 APR",
    lunch: {
      id: "mon-lunch",
      name: "Mexican Burrito Bowl",
      imageUrl: "/images/menuimages/ChickenBurrito.svg",
      description:
        "A hearty bowl with beans, salsa, corn, guacamole & fresh veggies.",
    },
    dinner: {
      id: "mon-dinner",
      name: "Ramen Bowl",
      imageUrl: "/images/menuimages/BrocolliPasta.svg",
      description:
        "Rich broth with noodles, greens, and your choice of protein.",
    },
  },
  {
    id: "tue",
    label: "TUE",
    dateLabel: "15 APR",
    lunch: {
      id: "tue-lunch",
      name: "Thai Curry Bowl",
      imageUrl: "/images/menuimages/StirFryVeggiesBowl.svg",
      description:
        "Aromatic Thai curry with fresh vegetables and fragrant rice.",
    },
    dinner: {
      id: "tue-dinner",
      name: "Mala Xiang Guo Bowl",
      imageUrl: "/images/menuimages/MalaxiangGuo.svg",
      description:
        "Bold mala spices with mixed veggies and your preferred protein.",
    },
  },
  {
    id: "wed",
    label: "WED",
    dateLabel: "16 APR",
    lunch: {
      id: "wed-lunch",
      name: "Mediterranean Bowl",
      imageUrl: "/images/menuimages/ChickenHummusBowl.svg",
      description:
        "Hummus, crisp greens, and Mediterranean flavours in one bowl.",
    },
    dinner: {
      id: "wed-dinner",
      name: "Laksa Bowl",
      imageUrl: "/images/menuimages/SingaporeLaksa.svg",
      description:
        "Creamy coconut laksa with noodles and fresh herbs.",
    },
  },
  {
    id: "thu",
    label: "THU",
    dateLabel: "17 APR",
    lunch: {
      id: "thu-lunch",
      name: "Whole Wheat Wrap",
      imageUrl: "/images/menuimages/VegQuesadilla.svg",
      description:
        "Whole wheat wrap packed with veggies and a protein of your choice.",
    },
    dinner: {
      id: "thu-dinner",
      name: "Korean Bowl",
      imageUrl: "/images/menuimages/SweetPotatoMashWithTeriyakiPaneer.svg",
      description:
        "Korean-inspired bowl with balanced grains and fresh toppings.",
    },
  },
  {
    id: "fri",
    label: "FRI",
    dateLabel: "18 APR",
    lunch: {
      id: "fri-lunch",
      name: "Quinoa Power Bowl",
      imageUrl: "/images/menuimages/QuinoaBowl.svg",
      description:
        "Protein-rich quinoa bowl with colourful vegetables and seeds.",
    },
    dinner: {
      id: "fri-dinner",
      name: "Sichuan Noodle Bowl",
      imageUrl: "/images/menuimages/BBQChickenNoodles.svg",
      description:
        "Sichuan-spiced noodles with vegetables and your chosen protein.",
    },
  },
];

export function getAllWeeklyMealIds(planId: SubscriptionPlanId) {
  return WEEKLY_MENU.flatMap((day) =>
    planId === "1-meal" ? [day.lunch.id] : [day.lunch.id, day.dinner.id],
  );
}

export const WEEKLY_DAY_DISPLAY_NAMES: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
};

export function buildSubscriptionHref(options: {
  step: Exclude<SubscriptionStep, "landing">;
  plan: SubscriptionPlanId;
}) {
  const params = new URLSearchParams({
    step: options.step,
    plan: options.plan,
  });

  return `/subscription?${params.toString()}`;
}

export type DeliveryDetails = {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  pincode: string;
  landmark: string;
  deliveryInstructions: string;
};

export function getEmptyDeliveryDetails(): DeliveryDetails {
  return {
    fullName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    pincode: "",
    landmark: "",
    deliveryInstructions: "",
  };
}

export function getSubscriptionDetailRows(planId: SubscriptionPlanId) {
  const plan = SUBSCRIPTION_PLANS.find((item) => item.id === planId);
  const mealCount = getAllWeeklyMealIds(planId).length;

  return [
    { label: "Plan", value: plan ? `${plan.title} (${plan.subtitle})` : "—" },
    { label: "Meals", value: `${mealCount} meals over 5 days` },
    { label: "Cuisines", value: "5 different cuisines" },
    {
      label: "Delivery window",
      value: planId === "2-meals" ? "Lunch + Dinner" : "Lunch or Dinner",
    },
    { label: "Plan price", value: `${plan?.price ?? "₹ 11,000"} / month` },
  ];
}

export function isDeliveryDetailsComplete(details: DeliveryDetails) {
  return (
    details.fullName.trim().length > 0 &&
    details.phone.trim().length >= 10 &&
    details.address.trim().length > 0 &&
    details.city.trim().length > 0 &&
    details.pincode.trim().length >= 6
  );
}

/** @deprecated Use FoodPreferenceId */
export type ProteinPreferenceId = FoodPreferenceId;

/** @deprecated Use FOOD_PREFERENCES */
export const PROTEIN_PREFERENCES = FOOD_PREFERENCES;

/** @deprecated Use FoodPreferenceId */
export type PreferenceId = FoodPreferenceId;

export function getPlanSummary(planId: SubscriptionPlanId) {
  const plan = SUBSCRIPTION_PLANS.find((item) => item.id === planId);
  if (!plan) return "You selected 2 Meals / Day (Lunch + Dinner)";
  return `You selected ${plan.title.replace(" / DAY", " / Day")} (${plan.subtitle})`;
}

export function isSubscriptionPlanId(value: string | null): value is SubscriptionPlanId {
  return value === "1-meal" || value === "2-meals";
}

export function isSubscriptionStep(value: string | null): value is SubscriptionStep {
  return (
    value === "plan" ||
    value === "account" ||
    value === "menu" ||
    value === "details" ||
    value === "payment"
  );
}
