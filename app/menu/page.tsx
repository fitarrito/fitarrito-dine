"use client";

import styles from "./menu.module.css";
import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
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
import AsianStartersGravyMenu from "@/components/AsianStartersGravyMenu";
import DessertsMenu from "@/components/DessertsMenu";
import PanAsianMenu from "@/components/PanAsianMenu";
import SoupsMenu from "@/components/SoupsMenu";
import FitarritoHouseMenu from "@/components/FitarritoHouseMenu";
import { cuisineSlugFromNavCategory } from "@lib/menuCuisine";
import { isSoupsCategoryName } from "@lib/soups";
import { isMexicanMiniOfferActive } from "@lib/mexicanMiniOffer";
import MexicanMiniOfferBanner from "@/components/MexicanMiniOfferBanner";

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
  const requestedCategory = DINE_IN_CATEGORIES.find(
    (category) => category.id === categoryParam && !category.hidden,
  );
  const activeMenuCategory = requestedCategory?.id ?? DEFAULT_MENU_CATEGORY;
  const activeCuisine = cuisineSlugFromNavCategory(activeMenuCategory);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [offerClockReady, setOfferClockReady] = useState(false);
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
  const totalCartItems = useSelector(
    (state: RootState) => state.cart.totalCartItems,
  );

  const activeTab = selectedTab ?? foodCategories?.[0]?.name ?? "";
  const showMexicanMenu =
    activeSection === "dine-in" && activeMenuCategory === "mexican";
  const showPanAsianMenu =
    activeSection === "dine-in" && activeMenuCategory === "pan-asian";
  const showAsianStartersGravyMenu =
    activeSection === "dine-in" && activeMenuCategory === "asian-starters-gravy";
  const showDessertsMenu =
    activeSection === "dine-in" && activeMenuCategory === "desserts";
  const showSoupsMenu =
    activeSection === "dine-in" && activeMenuCategory === "soups";
  const showFitarritoHouseMenu =
    activeSection === "dine-in" && activeMenuCategory === "fitarrito-house";
  const showComingSoon =
    activeSection === "order-now" ||
    (activeSection === "dine-in" &&
      activeMenuCategory !== "mexican" &&
      activeMenuCategory !== "pan-asian" &&
      activeMenuCategory !== "asian-starters-gravy" &&
      activeMenuCategory !== "desserts" &&
      activeMenuCategory !== "soups" &&
      activeMenuCategory !== "fitarrito-house");
  const showOnDemandBanner = activeSection === "dine-in";
  const showMexicanMiniOffer =
    offerClockReady && showMexicanMenu && isMexicanMiniOfferActive();
  const needsMenuApiData = Boolean(activeCuisine);

  const filteredMenuItems = useMemo(() => {
    if (!showMexicanMenu || activeFoodCategoryId == null) return [];
    return menuItems.filter(
      (m: menuItem) => m.categoryId === activeFoodCategoryId,
    );
  }, [menuItems, activeFoodCategoryId, showMexicanMenu]);

  const soupsCategory = useMemo(
    () => foodCategories.find((category) => isSoupsCategoryName(category.name)) ?? null,
    [foodCategories],
  );
  const soupItems = useMemo(
    () =>
      soupsCategory
        ? menuItems.filter((item: menuItem) => item.categoryId === soupsCategory.id)
        : [],
    [menuItems, soupsCategory],
  );

  const handleTabChange = (item: FoodCategory) => {
    setSelectedTab(item.name);
    setSelectedFoodCategoryId(item.id);
  };

  useEffect(() => {
    setOfferClockReady(true);
  }, []);

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

  useEffect(() => {
    if (!showSoupsMenu || isLoadingMenuData || loadError) return;

    if (!soupsCategory) {
      console.warn("Soups menu loaded without a Soups category.");
    }
  }, [showSoupsMenu, isLoadingMenuData, loadError, soupsCategory]);

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
      const cartNote =
        totalCartItems === 0
          ? "Your cart is safe."
          : totalCartItems === 1
            ? "Your cart is safe — your 1 item is saved."
            : `Your cart is safe — your ${totalCartItems} items are saved.`;

      return (
        <section className={styles.loadError} role="alert">
          <Image
            src="/images/menu-load-error.png"
            alt=""
            width={140}
            height={96}
            className={styles.loadErrorIcon}
          />
          <h2 className={styles.loadErrorTitle}>We couldn&apos;t load the menu</h2>
          <p className={styles.loadErrorText}>
            Please check your connection and try again.
          </p>
          <button
            type="button"
            className={styles.retryButton}
            onClick={handleRetry}
          >
            <svg
              className={styles.retryIcon}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Try again
          </button>
          <p className={styles.loadErrorHelp}>
            Still having trouble?{" "}
            <button
              type="button"
              className={styles.loadErrorRefresh}
              onClick={() => window.location.reload()}
            >
              Refresh the page
            </button>
          </p>
          <p className={styles.loadErrorCart}>
            <svg
              className={styles.loadErrorShield}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M12 3.5l7 2.8v5.4c0 4.2-2.8 7.2-7 8.8-4.2-1.6-7-4.6-7-8.8V6.3l7-2.8z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
            {cartNote}
          </p>
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

    if (showAsianStartersGravyMenu) {
      return (
        <AsianStartersGravyMenu
          items={menuItems}
          onAddedToCart={() => setIsDrawerOpen(true)}
        />
      );
    }

    if (showDessertsMenu) {
      return (
        <DessertsMenu
          items={menuItems}
          onAddedToCart={() => setIsDrawerOpen(true)}
        />
      );
    }

    if (showSoupsMenu) {
      return (
        <SoupsMenu
          items={soupItems}
          categoryName={soupsCategory?.name ?? "Soups"}
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
      {showMexicanMiniOffer ? <MexicanMiniOfferBanner /> : null}
      {showMexicanMiniOffer ? null : (
        <div className={styles.pageHeading}>
          <div className="sub-heading">
            Checkout Our <span className="badge-skew">Menu</span>
          </div>
        </div>
      )}

      {activeSection === "dine-in" ? (
        <div className={styles.menuNavBlock}>
          {showOnDemandBanner ? (
            <OnDemandOrderingBanner
              subtitle={
                showMexicanMenu
                  ? "Freshly made burritos, tacos, bowls & more!"
                  : showDessertsMenu
                    ? "Sweet mango, dates, and water chestnut."
                    : showSoupsMenu
                      ? "Freshly prepared soups."
                      : undefined
              }
            />
          ) : null}
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
