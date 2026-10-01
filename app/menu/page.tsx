"use client";

import styles from "./menu.module.css";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "next/navigation";
import { fetchMenu } from "@lib/features/menuSlice";
import { menuItem } from "@/types/types";
import CartDrawer from "@/components/CartDrawer";
import { fetchCategory } from "@lib/features/categorySlice";
import { RootState, AppDispatch } from "@lib/store";
import MenuItemDetails from "@/components/MenuItemDetails";
import MenuCategoryNav, {
  DEFAULT_MENU_CATEGORY,
  DINE_IN_CATEGORIES,
} from "@/components/MenuCategoryNav";
import OnDemandOrderingBanner from "@/components/OnDemandOrderingBanner";
import PanAsianMenu from "@/components/PanAsianMenu";
import FitarritoHouseMenu from "@/components/FitarritoHouseMenu";
import { cuisineSlugFromNavCategory } from "@lib/menuCuisine";

type FoodCategory = {
  id: number;
  name: string;
};

function MenuPageContent() {
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  const categoryParam = searchParams.get("category") ?? DEFAULT_MENU_CATEGORY;
  const activeSection =
    sectionParam === "order-now" ? "order-now" : ("dine-in" as const);
  const activeMenuCategory = DINE_IN_CATEGORIES.some(
    (c) => c.id === categoryParam,
  )
    ? categoryParam
    : DEFAULT_MENU_CATEGORY;
  const activeCuisine = cuisineSlugFromNavCategory(activeMenuCategory);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string | null>(null);
  const [selectedFoodCategoryId, setSelectedFoodCategoryId] = useState<
    number | null
  >(null);

  const { items: foodCategories, loading: categoryLoading, error: categoryError } = useSelector(
    (state: RootState) => state.category,
  ) as { items: FoodCategory[]; loading: boolean; error: string | null };

  const activeFoodCategoryId: number | null =
    selectedFoodCategoryId ?? foodCategories?.[0]?.id ?? null;

  const dispatch = useDispatch<AppDispatch>();
  const {
    items: menuItems,
    loading: menuLoading,
    error: menuError,
  } = useSelector((state: RootState) => state.menu);

  const activeTab = selectedTab ?? foodCategories?.[0]?.name ?? "";
  const showMexicanMenu =
    activeSection === "dine-in" && activeMenuCategory === "mexican";
  const showPanAsianMenu =
    activeSection === "dine-in" && activeMenuCategory === "pan-asian";
  const showFitarritoHouseMenu =
    activeSection === "dine-in" && activeMenuCategory === "fitarrito-house";
  const showComingSoon =
    activeSection === "order-now" ||
    (activeSection === "dine-in" &&
      activeMenuCategory !== "mexican" &&
      activeMenuCategory !== "pan-asian" &&
      activeMenuCategory !== "fitarrito-house");
  const showOnDemandBanner = activeSection === "dine-in";
  const needsMenuApiData = Boolean(activeCuisine);

  const filteredMenuItems = useMemo(() => {
    if (!showMexicanMenu || activeFoodCategoryId == null) return [];
    return menuItems.filter(
      (m: menuItem) => m.categoryId === activeFoodCategoryId,
    );
  }, [menuItems, activeFoodCategoryId, showMexicanMenu]);

  const handleTabChange = (item: FoodCategory) => {
    setSelectedTab(item.name);
    setSelectedFoodCategoryId(item.id);
  };

  useEffect(() => {
    setSelectedTab(null);
    setSelectedFoodCategoryId(null);
  }, [activeCuisine]);

  useEffect(() => {
    if (!activeCuisine) return;

    dispatch(fetchMenu({ cuisine: activeCuisine }));
    dispatch(fetchCategory({ cuisine: activeCuisine }));
  }, [dispatch, activeCuisine]);

  const loadError = menuError ?? categoryError;
  const isLoadingMenuData =
    needsMenuApiData && (menuLoading || categoryLoading);

  const handleRetry = () => {
    if (!activeCuisine) return;

    dispatch(fetchMenu({ cuisine: activeCuisine }));
    dispatch(fetchCategory({ cuisine: activeCuisine }));
  };

  const activeLabel =
    activeSection === "order-now"
      ? "Order Now"
      : (DINE_IN_CATEGORIES.find((c) => c.id === activeMenuCategory)?.label ??
        "Menu");

  const renderMenuContent = () => {
    if (isLoadingMenuData) {
      return <p className={styles.loadingState}>Loading...</p>;
    }

    if (loadError && needsMenuApiData) {
      return (
        <section className={styles.categorySection}>
          <p className={styles.errorState}>Unable to load menu. {loadError}</p>
          <button
            type="button"
            className={styles.retryButton}
            onClick={handleRetry}
          >
            Try again
          </button>
        </section>
      );
    }

    if (showPanAsianMenu) {
      return (
        <PanAsianMenu
          items={menuItems}
          onAddedToCart={() => setIsDrawerOpen(true)}
        />
      );
    }

    if (showFitarritoHouseMenu) {
      return (
        <FitarritoHouseMenu
          items={menuItems}
          onAddedToCart={() => setIsDrawerOpen(true)}
        />
      );
    }

    if (showMexicanMenu) {
      return (
        <>
          <section className={styles.categorySection}>
            <div className={styles.tabsControl}>
              {foodCategories?.map((item) => (
                <button
                  key={item.id}
                  className={styles.tabControl}
                  onClick={() => handleTabChange(item)}
                  data-active={activeTab === item.name}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </section>

          {(filteredMenuItems as menuItem[]).map((card, index) => (
            <article key={`${card.title}-${index}`} className={styles.menuCard}>
              <MenuItemDetails
                card={card}
                onAddedToCart={() => setIsDrawerOpen(true)}
                index={index}
              />
            </article>
          ))}
        </>
      );
    }

    if (showComingSoon) {
      return (
        <section className={styles.categorySection}>
          <p className={styles.emptyState}>
            {activeLabel} content coming soon.
          </p>
        </section>
      );
    }

    return null;
  };

  return (
    <div className={styles.menuContainer}>
      <div className={styles.pageHeading}>
        <div className="sub-heading">
          Checkout Our <span className="badge-skew">Menu</span>
        </div>
      </div>

      {activeSection === "dine-in" ? (
        <div className={styles.menuNavBlock}>
          {showOnDemandBanner ? <OnDemandOrderingBanner /> : null}
          <MenuCategoryNav activeCategory={activeMenuCategory} />
        </div>
      ) : null}

      {renderMenuContent()}

      {isDrawerOpen ? (
        <CartDrawer isOpen={isDrawerOpen} setIsOpen={setIsDrawerOpen} />
      ) : null}
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <MenuPageContent />
    </Suspense>
  );
}
