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

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string | null>(null);
  const [selectedFoodCategoryId, setSelectedFoodCategoryId] = useState<
    number | null
  >(null);

  const { items: foodCategories, loading: categoryLoading } = useSelector(
    (state: RootState) => state.category,
  ) as { items: FoodCategory[]; loading: boolean };

  const activeFoodCategoryId: number | null =
    selectedFoodCategoryId ?? foodCategories?.[0]?.id ?? null;

  const dispatch = useDispatch<AppDispatch>();
  const { items: menuItems, loading: menuLoading } = useSelector(
    (state: RootState) => state.menu,
  );

  const activeTab = selectedTab ?? foodCategories?.[0]?.name ?? "";
  const showFoodMenu =
    activeSection === "dine-in" && activeMenuCategory === "mexican";
  const showComingSoon = activeSection === "order-now" || !showFoodMenu;

  const filteredMenuItems = useMemo(() => {
    if (!showFoodMenu || activeFoodCategoryId == null) return [];
    return menuItems.filter(
      (m: menuItem) => m.categoryId === activeFoodCategoryId,
    );
  }, [menuItems, activeFoodCategoryId, showFoodMenu]);

  const handleTabChange = (item: FoodCategory) => {
    setSelectedTab(item.name);
    setSelectedFoodCategoryId(item.id);
  };

  useEffect(() => {
    dispatch(fetchMenu());
    dispatch(fetchCategory());
  }, [dispatch]);

  if (menuLoading || categoryLoading) return <p>Loading...</p>;

  const activeLabel =
    activeSection === "order-now"
      ? "Order Now"
      : (DINE_IN_CATEGORIES.find((c) => c.id === activeMenuCategory)?.label ??
        "Menu");

  return (
    <div className={styles.menuContainer}>
      <div className={styles.pageHeading}>
        <div className="sub-heading">
          Checkout Our <span className="badge-skew">Menu</span>
        </div>
      </div>

      {activeSection === "dine-in" ? (
        <MenuCategoryNav activeCategory={activeMenuCategory} />
      ) : null}

      {showFoodMenu ? (
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
                isDrawerOpen={() => setIsDrawerOpen(true)}
                index={index}
              />
            </article>
          ))}
        </>
      ) : showComingSoon ? (
        <section className={styles.categorySection}>
          <p className={styles.emptyState}>
            {activeLabel} content coming soon.
          </p>
        </section>
      ) : null}

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
