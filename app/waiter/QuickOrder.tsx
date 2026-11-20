"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaChevronDown,
  FaMinus,
  FaPencilAlt,
  FaPlus,
  FaSearch,
  FaTimes,
  FaTrash,
  FaUser,
} from "react-icons/fa";
import { fetchJson } from "@lib/apiFetch";
import {
  getCartItemCustomization,
  getSaladToppingOptions,
  getSaladTypeOptions,
  isFitarritoHouseSalad,
} from "@lib/fitarritoHouseMenu";
import { quoteSizePrice } from "@lib/mexicanMiniOffer";
import { resolveMenuItemImageUrl } from "@lib/menuImages";
import { readFormatOptions } from "@lib/menuFormat";
import { getAvailableProteinVariants } from "@lib/menuPricing";
import {
  isPanAsianCategory,
  sortPanAsianIngredients,
  type PanAsianCategory,
} from "@lib/panAsianOrder";
import {
  availableAsianStartersGravyPrices,
  isAsianStartersGravyCategory,
  type AsianStartersGravyCategory,
} from "@lib/asianStartersGravyOrder";
import { isSoupsCategoryName } from "@lib/soups";
import {
  soupsBowlsPricesFor,
  type SoupsBowlsServing,
} from "@lib/soupsBowlsOrder";
import {
  getWaiterTableSessionId,
  readWaiterTableNotes,
  saveWaiterSubmittedOrder,
  writeWaiterTableNotes,
} from "@lib/waiterTableSession";
import {
  groupWaiterMenu,
  immediateWaiterChoice,
  quoteWaiterChoice,
  waiterGroupForItem,
  waiterGroupLabel,
  waiterInputFromCart,
  waiterNeedsCustomization,
  waiterPriceLine,
  WAITER_MENU_GROUPS,
  type WaiterChoice,
  type WaiterChoiceInput,
  type WaiterDishGroup,
  type WaiterMenuGroupId,
} from "@lib/waiterQuickOrder";
import type { menuItem } from "@/types/types";
import styles from "./QuickOrder.module.css";

const TABLES = Array.from({ length: 10 }, (_, index) => `T${index + 1}`);

type CartLine = {
  id: string;
  menu_item_id: string | number;
  title: string;
  quantity: number;
  price: number;
  image_url?: string | null;
  selected_protein?: string | null;
  selected_size?: string | null;
  item_format?: string | null;
};

type RepeatChoice = {
  input: WaiterChoiceInput;
  summary: string;
};

type SheetRequest = {
  item: menuItem;
  group: WaiterDishGroup;
  cartItemId?: string;
  quantity: number;
  initial?: WaiterChoiceInput;
};

function formatRupee(amount: number) {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function soupServingLabel(prices: { serving_type: string; price: number | string }[]) {
  const soupPrices = prices
    .filter((row) => row.serving_type === "Soup")
    .map((row) => Math.round(Number(row.price)));

  if (soupPrices.length > 0 && soupPrices.every((price) => price === soupPrices[0])) {
    return `Soup ${formatRupee(soupPrices[0] ?? 0)}`;
  }

  return "Soup";
}

function cartPresentation(line: CartLine) {
  const customization = getCartItemCustomization({
    title: line.title,
    selected_protein: line.selected_protein,
    selected_size: line.selected_size,
    item_format: line.item_format,
  });
  const size = customization.title.match(/\(([^)]+)\)$/)?.[1] ?? "";
  const baseName = customization.title.replace(/\s*\([^)]+\)$/, "");
  const protein = customization.protein ?? "";

  if (customization.toppings) {
    return {
      name: baseName,
      details: [[size, protein].filter(Boolean).join(" · "), customization.toppings].filter(Boolean),
    };
  }

  if (protein.includes(":")) {
    const [category, ingredients = ""] = protein.split(":").map((part) => part.trim());
    const details = [customization.format ? `Format: ${customization.format}` : null, category].filter(
      (detail): detail is string => Boolean(detail),
    );

    if (ingredients && ingredients.toLowerCase() !== category.toLowerCase()) details.push(ingredients);

    return { name: line.title, details };
  }

  if (size && protein) {
    return {
      name: `${protein} ${line.title}`,
      details: [`${size} · ${protein}`],
    };
  }

  if (size) {
    return { name: line.title, details: [size] };
  }

  return {
    name: line.title,
    details: protein ? [protein] : [],
  };
}

export default function QuickOrder({
  table,
  onSelectTable,
}: {
  table: string | null;
  onSelectTable: (table: string) => void;
}) {
  const [groups, setGroups] = useState<{ group: WaiterDishGroup; items: menuItem[] }[]>([]);
  const [itemsById, setItemsById] = useState<Map<string, menuItem>>(new Map());
  const [groupById, setGroupById] = useState<Map<string, WaiterDishGroup>>(new Map());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [category, setCategory] = useState<WaiterMenuGroupId>("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetRequest | null>(null);
  const [repeats, setRepeats] = useState<Record<string, RepeatChoice>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const pending = useRef(new Set<string>());
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMenu() {
      try {
        const [mexican, panAsian, house, starters, beverages, categories] = await Promise.all([
          fetchJson<menuItem[]>("/api/menu?cuisine=mexican"),
          fetchJson<menuItem[]>("/api/menu?cuisine=pan-asian"),
          fetchJson<menuItem[]>("/api/menu?cuisine=fitarrito-house"),
          fetchJson<menuItem[]>("/api/menu?cuisine=asian-starters-gravy"),
          fetchJson<menuItem[]>("/api/menu?cuisine=beverages"),
          fetchJson<{ id: number; name: string }[]>("/api/category?cuisine=pan-asian"),
        ]);
        const soupCategoryIds = new Set(
          categories.filter((entry) => isSoupsCategoryName(entry.name)).map((entry) => entry.id),
        );
        const dessertCategoryIds = new Set(
          categories
            .filter((entry) => entry.name.trim().toLowerCase() === "desserts")
            .map((entry) => entry.id),
        );
        const menu = groupWaiterMenu(
          [...mexican, ...panAsian, ...house, ...starters, ...beverages],
          soupCategoryIds,
          dessertCategoryIds,
        );
        const byId = new Map<string, menuItem>();
        const groupsById = new Map<string, WaiterDishGroup>();

        for (const section of menu) {
          for (const item of section.items) {
            byId.set(String(item.id), item);
            const group = waiterGroupForItem(item, soupCategoryIds, dessertCategoryIds);

            if (group) groupsById.set(String(item.id), group);
          }
        }

        if (!cancelled) {
          setGroups(menu);
          setItemsById(byId);
          setGroupById(groupsById);
          setLoadError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Unable to load the menu.");
        }
      } finally {
        if (!cancelled) setLoadingMenu(false);
      }
    }

    void loadMenu();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!table) {
      setCart([]);
      return;
    }

    setCart([]);
    let cancelled = false;
    const sessionId = getWaiterTableSessionId(table);

    async function loadCart() {
      try {
        const lines = await fetchJson<CartLine[]>(
          `/api/cart?session_id=${encodeURIComponent(sessionId)}`,
        );

        if (!cancelled) setCart(Array.isArray(lines) ? lines : []);
      } catch (error) {
        if (!cancelled) {
          setActionError(error instanceof Error ? error.message : "Unable to load this table.");
        }
      }
    }

    setNotes(readWaiterTableNotes(table));
    void loadCart();

    return () => {
      cancelled = true;
    };
  }, [table]);

  const visibleSections = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return groups
      .filter((section) => category === "all" || section.group === category)
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          needle ? item.title.toLowerCase().includes(needle) : true,
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [category, groups, query]);

  const itemCount = cart.reduce((total, line) => total + line.quantity, 0);
  const orderAmount = cart.reduce((total, line) => total + line.price * line.quantity, 0);

  async function refreshCart(sessionId: string) {
    const lines = await fetchJson<CartLine[]>(
      `/api/cart?session_id=${encodeURIComponent(sessionId)}`,
    );
    setCart(Array.isArray(lines) ? lines : []);
  }

  async function runCartChange(key: string, task: (sessionId: string) => Promise<void>) {
    if (!table || pending.current.has(key)) return;

    pending.current.add(key);
    setBusyKey(key);
    setActionError(null);

    try {
      await task(getWaiterTableSessionId(table));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to update the order.");
    } finally {
      pending.current.delete(key);
      setBusyKey(null);
    }
  }

  async function addChoice(
    item: menuItem,
    choice: WaiterChoice,
    input: WaiterChoiceInput,
    quantity: number,
    replaceId?: string,
  ) {
    await runCartChange(replaceId ?? `add-${item.id}`, async (sessionId) => {
      if (replaceId) {
        const current = cart.find((line) => String(line.id) === replaceId);
        const sameChoice =
          current?.selected_protein === choice.selectedProtein &&
          (current.selected_size ?? null) === (choice.selectedSize ?? null) &&
          (current.item_format ?? null) === (choice.itemFormat ?? null);

        if (sameChoice) {
          setSheet(null);
          return;
        }
      }

      await fetchJson("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          menuItemId: String(item.id),
          selectedProtein: choice.selectedProtein,
          selectedSize: choice.selectedSize,
          itemFormat: choice.itemFormat,
          quantity,
        }),
      });
      setRepeats((current) => ({
        ...current,
        [String(item.id)]: { input, summary: choice.summary },
      }));
      if (replaceId) {
        await fetchJson(`/api/cart?id=${encodeURIComponent(replaceId)}`, { method: "DELETE" });
      }

      setSheet(null);
      await refreshCart(sessionId);
    });
  }

  function addItem(item: menuItem, group: WaiterDishGroup) {
    const scrollTop = listRef.current?.scrollTop ?? 0;
    const immediate = immediateWaiterChoice(item, group);

    if (immediate && "error" in immediate) {
      setActionError(immediate.error);
      return;
    }

    if (immediate) {
      void addChoice(item, immediate, {}, 1).then(() => {
        if (listRef.current) listRef.current.scrollTop = scrollTop;
      });
      return;
    }

    setSheet({ item, group, quantity: 1 });
  }

  async function clearCart() {
    if (!table || cart.length === 0) return;

    const lines = cart.slice();

    await runCartChange("clear", async (sessionId) => {
      for (const line of lines) {
        await fetchJson(`/api/cart?id=${encodeURIComponent(String(line.id))}`, {
          method: "DELETE",
        });
      }

      writeWaiterTableNotes(table, "");
      setNotes("");
      await refreshCart(sessionId);
    });
  }

  async function submitOrder() {
    if (!table || cart.length === 0) return;

    const lines = cart.slice();
    const orderNotes = notes.trim();

    await runCartChange("submit", async (sessionId) => {
      saveWaiterSubmittedOrder({
        id: `order-${Date.now()}`,
        table,
        notes: orderNotes,
        lines: lines.map((line) => {
          const presentation = cartPresentation(line);

          return {
            title: presentation.name,
            detail: presentation.details.join(" · "),
            quantity: line.quantity,
            price: line.price,
          };
        }),
        total: lines.reduce((total, line) => total + line.price * line.quantity, 0),
        submittedAt: new Date().toISOString(),
      });

      for (const line of lines) {
        await fetchJson(`/api/cart?id=${encodeURIComponent(String(line.id))}`, {
          method: "DELETE",
        });
      }

      writeWaiterTableNotes(table, "");
      setNotes("");
      setCartOpen(false);
      await refreshCart(sessionId);
    });
  }

  async function changeQuantity(line: CartLine, quantity: number) {
    await runCartChange(`qty-${line.id}`, async (sessionId) => {
      if (quantity < 1) {
        await fetchJson(`/api/cart?id=${encodeURIComponent(String(line.id))}`, {
          method: "DELETE",
        });
      } else {
        await fetchJson("/api/cart", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: line.id, quantity }),
        });
      }

      await refreshCart(sessionId);
    });
  }

  return (
    <div className={styles.quickOrder}>
      <div className={styles.tableRow} role="listbox" aria-label="Selected table">
        {TABLES.map((name) => (
          <button
            key={name}
            type="button"
            role="option"
            aria-selected={table === name}
            className={`${styles.tableChip} ${table === name ? styles.tableChipSelected : ""}`}
            onClick={() => onSelectTable(name)}
          >
            {name}
          </button>
        ))}
      </div>

      {table ? <p className={styles.tableLabel}>Table {table}</p> : null}

      <div className={styles.categories} aria-label="Menu categories">
        {WAITER_MENU_GROUPS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`${styles.category} ${category === entry.id ? styles.categoryActive : ""}`}
            aria-pressed={category === entry.id}
            onClick={() => setCategory(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <label className={styles.search}>
        <FaSearch aria-hidden />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search dishes..."
          enterKeyHint="search"
        />
      </label>

      {actionError ? <p className={styles.error}>{actionError}</p> : null}
      {!table ? <p className={styles.notice}>Select a table before adding dishes.</p> : null}

      <div className={styles.list} ref={listRef}>
        {loadingMenu ? <p className={styles.notice}>Loading menu...</p> : null}
        {loadError ? <p className={styles.error}>{loadError}</p> : null}
        {!loadingMenu && !loadError && visibleSections.length === 0 ? (
          <p className={styles.notice}>No dishes match that search.</p>
        ) : null}
        {visibleSections.map((section) => (
          <section key={section.group} aria-label={waiterGroupLabel(section.group)}>
            <h2>{waiterGroupLabel(section.group)}</h2>
            {section.items.map((item) => (
              <article key={item.id} className={styles.row}>
                <div>
                  <h3>{item.title}</h3>
                  <p>{waiterPriceLine(item, section.group)}</p>
                </div>
                <button
                  type="button"
                  className={styles.add}
                  disabled={!table || busyKey === `add-${item.id}`}
                  onClick={() => addItem(item, section.group)}
                >
                  {busyKey === `add-${item.id}` ? "..." : "+ Add"}
                </button>
              </article>
            ))}
          </section>
        ))}
      </div>

      <button
        type="button"
        className={styles.cartBar}
        onClick={() => setCartOpen(true)}
        disabled={!table}
      >
        <span>
          {table ? `Table ${table}` : "No table"} · {itemCount}{" "}
          {itemCount === 1 ? "item" : "items"}
        </span>
        <strong>{formatRupee(orderAmount)}</strong>
      </button>

      {cartOpen && table ? (
        <div className={styles.review} role="dialog" aria-label={`Table ${table} order`}>
          <header className={styles.reviewHeader}>
            <button
              type="button"
              className={styles.back}
              onClick={() => setCartOpen(false)}
              aria-label="Back to menu"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path
                  d="M15.5 19.5 8 12l7.5-7.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <h2>Table {table}</h2>
            <p className={styles.waiterLabel}>
              <FaUser aria-hidden />
              Waiter
              <FaChevronDown aria-hidden />
            </p>
          </header>

          <div className={styles.reviewBody}>
            <div className={styles.reviewTools}>
              {cart.length > 0 ? (
                <button
                  type="button"
                  className={styles.clearOrder}
                  onClick={() => void clearCart()}
                  disabled={busyKey === "clear"}
                >
                  <FaTrash aria-hidden />
                  Clear
                </button>
              ) : null}
            </div>

            {cart.length === 0 ? <p className={styles.notice}>No dishes on this table yet.</p> : null}
            {cart.map((line) => {
              const menuItemRow = itemsById.get(String(line.menu_item_id));
              const group = groupById.get(String(line.menu_item_id));
              const presentation = cartPresentation(line);
              const image = resolveMenuItemImageUrl({
                title: menuItemRow?.title || line.title || "",
                imageUrl: line.image_url || menuItemRow?.imageUrl,
              });
              const hasImage = image !== "/fallback-image.jpg";

              return (
                <article key={line.id} className={styles.reviewItem}>
                  {hasImage ? (
                    <img src={image} alt="" className={styles.thumb} />
                  ) : (
                    <span className={styles.thumb} />
                  )}
                  <div className={styles.reviewCopy}>
                    <div className={styles.reviewTitle}>
                      <h3>{presentation.name}</h3>
                      <strong>{formatRupee(line.price * line.quantity)}</strong>
                    </div>
                    {presentation.details.map((detail) => (
                      <p key={detail}>{detail}</p>
                    ))}
                    <div className={styles.reviewActions}>
                      <div className={styles.qty}>
                        <button
                          type="button"
                          aria-label={`Remove one ${line.title}`}
                          onClick={() => void changeQuantity(line, line.quantity - 1)}
                          disabled={line.quantity <= 1 || busyKey === `qty-${line.id}`}
                        >
                          <FaMinus aria-hidden />
                        </button>
                        <span>{line.quantity}</span>
                        <button
                          type="button"
                          aria-label={`Add another ${line.title}`}
                          onClick={() => void changeQuantity(line, line.quantity + 1)}
                          disabled={busyKey === `qty-${line.id}`}
                        >
                          <FaPlus aria-hidden />
                        </button>
                      </div>
                      {menuItemRow && group && waiterNeedsCustomization(menuItemRow, group) ? (
                        <button
                          type="button"
                          className={styles.iconButton}
                          aria-label={`Edit ${line.title}`}
                          onClick={() => {
                            setSheet({
                              item: menuItemRow,
                              group,
                              cartItemId: String(line.id),
                              quantity: line.quantity,
                              initial: waiterInputFromCart({
                                group,
                                selectedProtein: line.selected_protein,
                                selectedSize: line.selected_size,
                                itemFormat: line.item_format,
                              }),
                            });
                          }}
                        >
                          <FaPencilAlt aria-hidden />
                        </button>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        className={styles.iconButton}
                        aria-label={`Remove ${line.title}`}
                        onClick={() => void changeQuantity(line, 0)}
                        disabled={busyKey === `qty-${line.id}`}
                      >
                        <FaTrash aria-hidden />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            <label className={styles.notes}>
              <span>Special Instructions (Order level)</span>
              <input
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                  writeWaiterTableNotes(table, event.target.value);
                }}
                placeholder="e.g. serve after 10 mins, no onion etc."
              />
            </label>

            <dl className={styles.totals}>
              <div>
                <dt>Subtotal</dt>
                <dd>{formatRupee(orderAmount)}</dd>
              </div>
              <div>
                <dt>Taxes</dt>
                <dd>{formatRupee(0)}</dd>
              </div>
              <div className={styles.grandTotal}>
                <dt>Total</dt>
                <dd>{formatRupee(orderAmount)}</dd>
              </div>
            </dl>

            <button
              type="button"
              className={styles.submitOrder}
              disabled={cart.length === 0 || busyKey === "submit"}
              onClick={() => void submitOrder()}
            >
              {busyKey === "submit" ? "Submitting..." : `Submit Order for Table ${table}`}
            </button>
          </div>
        </div>
      ) : null}

      {sheet && table ? (
        <QuickOrderSheet
          key={`${sheet.item.id}-${sheet.cartItemId ?? "new"}`}
          item={sheet.item}
          group={sheet.group}
          quantity={sheet.quantity}
          initial={sheet.initial}
          repeat={repeats[String(sheet.item.id)]}
          busy={busyKey != null}
          onClose={() => setSheet(null)}
          onConfirm={(choice, input, quantity) =>
            void addChoice(sheet.item, choice, input, quantity, sheet.cartItemId)
          }
        />
      ) : null}
    </div>
  );
}

function QuickOrderSheet({
  item,
  group,
  quantity,
  initial,
  repeat,
  busy,
  onClose,
  onConfirm,
}: {
  item: menuItem;
  group: WaiterDishGroup;
  quantity: number;
  initial?: WaiterChoiceInput;
  repeat?: RepeatChoice;
  busy: boolean;
  onClose: () => void;
  onConfirm: (choice: WaiterChoice, input: WaiterChoiceInput, quantity: number) => void;
}) {
  const sizes = item.sizeVariants ?? [];
  const soupsBowlsPrices = soupsBowlsPricesFor(item.title, item.soupsBowlsPrices);
  const useSoupsBowls = group === "soups" && soupsBowlsPrices.length > 0;
  const panPrices = (item.panAsianPrices ?? [])
    .filter((option) => option.is_available && isPanAsianCategory(option.category))
    .sort((left, right) => left.sort_order - right.sort_order);
  const starterPrices = availableAsianStartersGravyPrices(
    item.asianStartersGravyPrices,
    item.title,
  ).filter((option) => option.category !== "Fixed");
  const saladTypes = getSaladTypeOptions(item);
  const toppings = getSaladToppingOptions(item);
  const saladDefaults = isFitarritoHouseSalad(item) && !initial;
  const defaultTopping =
    toppings.find((topping) => topping.name.toLowerCase() === "roasted peanuts") ?? toppings[0];
  const [size, setSize] = useState(initial?.size ?? (saladDefaults ? sizes[0]?.name ?? "" : ""));
  const [protein, setProtein] = useState(
    initial?.protein ??
      (saladDefaults
        ? getAvailableProteinVariants(item, sizes[0]?.name)[0]?.name ?? ""
        : ""),
  );
  const defaultPan = panPrices[0]?.category;
  const defaultStarter =
    starterPrices.find((option) => option.category === "Veg")?.category ??
    starterPrices[0]?.category;
  const [serving, setServing] = useState<SoupsBowlsServing>(
    initial?.serving === "Bowl" ? "Bowl" : "Soup",
  );
  const [panCategory, setPanCategory] = useState<PanAsianCategory | null>(
    initial?.panCategory ?? (defaultPan && isPanAsianCategory(defaultPan) ? defaultPan : null),
  );
  const formatOptions = readFormatOptions(item.formatOptions);
  const [itemFormat, setItemFormat] = useState(initial?.itemFormat ?? "");
  const [ingredient, setIngredient] = useState(initial?.ingredient ?? "");
  const [starterCategory, setStarterCategory] = useState<AsianStartersGravyCategory | null>(
    initial?.starterCategory ??
      (defaultStarter && isAsianStartersGravyCategory(defaultStarter) ? defaultStarter : null),
  );
  const [saladType, setSaladType] = useState(initial?.saladType ?? saladTypes[0]?.name ?? "");
  const [selectedToppings, setSelectedToppings] = useState<string[]>(
    initial?.toppings ?? (saladDefaults && defaultTopping ? [defaultTopping.name] : []),
  );
  const [error, setError] = useState<string | null>(null);
  const proteins = getAvailableProteinVariants(item, size || sizes[0]?.name);
  const input: WaiterChoiceInput = {
    size,
    protein,
    serving,
    panCategory,
    ingredient,
    starterCategory,
    saladType,
    toppings: selectedToppings,
    itemFormat,
  };
  const quote = quoteWaiterChoice(item, group, input);
  const panIngredients =
    panCategory == null
      ? []
      : sortPanAsianIngredients(
          (item.panAsianIngredients ?? []).filter(
            (entry) =>
              entry.dish_title === item.title &&
              entry.category === panCategory &&
              entry.is_available,
          ),
        );

  const applyRepeat = () => {
    if (!repeat) return;

    setSize(repeat.input.size ?? "");
    setProtein(repeat.input.protein ?? "");
    setServing(repeat.input.serving === "Bowl" ? "Bowl" : "Soup");
    setPanCategory(repeat.input.panCategory ?? panCategory);
    setItemFormat(repeat.input.itemFormat ?? "");
    setIngredient(repeat.input.ingredient ?? "");
    setStarterCategory(repeat.input.starterCategory ?? starterCategory);
    setSaladType(repeat.input.saladType ?? saladType);
    setSelectedToppings(repeat.input.toppings ?? []);
    setError(null);
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <form
        className={styles.sheet}
        role="dialog"
        aria-label={item.title}
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();

          if ("error" in quote || busy) {
            if ("error" in quote) setError(quote.error);
            return;
          }

          onConfirm(quote, input, quantity);
        }}
      >
        <div className={styles.sheetHeader}>
          <h2>{item.title}</h2>
          <button type="button" className={styles.close} onClick={onClose}>
            <FaTimes aria-hidden />
            <span className={styles.srOnly}>Close</span>
          </button>
        </div>
        {repeat && !initial ? (
          <button type="button" className={styles.repeat} onClick={applyRepeat}>
            Repeat last: {repeat.summary}
          </button>
        ) : null}
        {useSoupsBowls ? (
          <>
            <ChoiceButtons
              label="Serving"
              value={serving}
              options={[
                soupsBowlsPrices.some((row) => row.serving_type === "Soup")
                  ? {
                      id: "Soup" as const,
                      label: soupServingLabel(soupsBowlsPrices),
                    }
                  : null,
                soupsBowlsPrices.some((row) => row.serving_type === "Bowl")
                  ? { id: "Bowl" as const, label: "Bowl" }
                  : null,
              ].flatMap((option) => (option ? [option] : []))}
              onChange={(value) => {
                setServing(value);
                setPanCategory(null);
                setIngredient("");
                setError(null);
              }}
            />
            <ChoiceButtons
              label="Protein"
              value={panCategory}
              options={["Veg", "Chicken", "Prawn"].flatMap((stored) => {
                const row = soupsBowlsPrices.find(
                  (option) => option.serving_type === serving && option.protein === stored,
                );

                if (!row) return [];

                const label = stored === "Prawn" ? "Seafood" : stored;

                return [
                  {
                    id: label as PanAsianCategory,
                    label: `${label} ${formatRupee(Number(row.price))}`,
                  },
                ];
              })}
              onChange={(value) => {
                setPanCategory(value);
                if (value !== "Veg") setIngredient("");
                setError(null);
              }}
            />
          </>
        ) : null}
        {(group === "pan-asian" || group === "soups") && panPrices.length > 0 && !useSoupsBowls ? (
          <>
            {formatOptions.length > 1 ? (
              <ChoiceButtons
                label="Choose your base"
                value={itemFormat || null}
                options={formatOptions.map((option) => ({ id: option, label: option }))}
                onChange={(value) => {
                  setItemFormat(value);
                  setError(null);
                }}
              />
            ) : null}
            <ChoiceButtons
              label="Choice"
              value={panCategory}
              options={panPrices.flatMap((option) =>
                isPanAsianCategory(option.category)
                  ? [
                      {
                        id: option.category,
                        label: `${option.category} ${formatRupee(Number(option.price))}`,
                      },
                    ]
                  : [],
              )}
              onChange={(value) => {
                setPanCategory(value);
                setIngredient("");
                setError(null);
              }}
            />
            {panCategory === "Veg" ? (
              <ChoiceButtons
                label="Ingredient"
                value={ingredient}
                options={panIngredients.map((entry) => ({
                  id: entry.ingredient_name,
                  label: entry.ingredient_name,
                }))}
                onChange={(value) => {
                  setIngredient(value);
                  setError(null);
                }}
              />
            ) : (
              <p className={styles.notice}>
                Includes {panIngredients.map((entry) => entry.ingredient_name).join(", ")}
              </p>
            )}
          </>
        ) : null}
        {group === "asian-starters-gravy" &&
        starterPrices.length > 0 &&
        (item.proteinVariants?.length ?? 0) === 0 ? (
          <ChoiceButtons
            label="Choice"
            value={starterCategory}
            options={starterPrices.flatMap((option) =>
              isAsianStartersGravyCategory(option.category)
                ? [
                    {
                      id: option.category,
                      label: `${option.category} ${formatRupee(Number(option.price))}`,
                    },
                  ]
                : [],
            )}
            onChange={(value) => {
              setStarterCategory(value);
              setError(null);
            }}
          />
        ) : null}
        {isFitarritoHouseSalad(item) ? (
          <ChoiceButtons
            label="Salad"
            value={saladType}
            options={saladTypes.map((salad) => ({ id: salad.name, label: salad.name }))}
            onChange={setSaladType}
          />
        ) : null}
        {sizes.length > 0 &&
        !useSoupsBowls &&
        !((group === "pan-asian" || group === "soups") && panPrices.length > 0) &&
        !(
          group === "asian-starters-gravy" &&
          starterPrices.length > 0 &&
          (item.proteinVariants?.length ?? 0) === 0
        ) ? (
          <ChoiceButtons
            label={group === "desserts" ? "Option" : "Size"}
            value={size}
            options={sizes.map((entry) => ({
              id: entry.name,
              label: `${entry.name} ${formatRupee(quoteSizePrice(item, entry, Number(item.price)).price)}`,
            }))}
            onChange={(value) => {
              setSize(value);
              if (value.toLowerCase() === "mini" && protein.toLowerCase() === "prawn") {
                setProtein("");
              }
              setError(null);
            }}
          />
        ) : null}
        {proteins.length > 0 &&
        !useSoupsBowls &&
        !((group === "pan-asian" || group === "soups") && panPrices.length > 0) &&
        !(
          group === "asian-starters-gravy" &&
          starterPrices.length > 0 &&
          (item.proteinVariants?.length ?? 0) === 0
        ) ? (
          <ChoiceButtons
            label="Protein"
            value={protein}
            options={proteins.map((entry) => ({
              id: entry.name,
              label:
                Number(entry.price) > 0
                  ? `${entry.name} +${formatRupee(Number(entry.price))}`
                  : entry.name,
            }))}
            onChange={(value) => {
              setProtein(value);
              setError(null);
            }}
          />
        ) : null}
        {isFitarritoHouseSalad(item) && toppings.length > 0 ? (
          <fieldset className={styles.choices}>
            <legend>Toppings</legend>
            <div>
              {toppings.map((topping) => {
                const checked = selectedToppings.includes(topping.name);

                return (
                  <label key={topping.name} className={styles.check}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedToppings((current) =>
                          checked
                            ? current.filter((name) => name !== topping.name)
                            : [...current, topping.name],
                        );
                      }}
                    />
                    {topping.name}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : null}
        {error ? <p className={styles.error}>{error}</p> : null}
        <button type="submit" className={styles.confirm} disabled={busy || "error" in quote}>
          {"error" in quote
            ? "Add to table"
            : `Add to table · ${formatRupee(quote.price * quantity)}`}
        </button>
      </form>
    </div>
  );
}

function ChoiceButtons<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | null;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
}) {
  if (options.length === 0) return null;

  return (
    <fieldset className={styles.choices}>
      <legend>{label}</legend>
      <div>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={value === option.id}
            className={value === option.id ? styles.choiceSelected : undefined}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
