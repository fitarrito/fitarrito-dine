import "server-only";

import { getSupabaseAdminClient } from "@lib/getSupabaseAdmin";
import { calculateDineInBill } from "@lib/dineInBill";
import { loadAsianStartersGravyCatalog } from "@lib/asianStartersGravyCatalog";
import { isAsianStartersGravyCuisine } from "@lib/asianStartersGravyOrder";
import { readFormatOptions, resolveItemFormat } from "@lib/menuFormat";
import { isBlockedMenuTitle, isMenuItemAvailable, unavailableCartMessage } from "@lib/menuVisibility";
import { quoteOrderItem } from "@lib/orderQuote";
import { loadPanAsianCatalog } from "@lib/panAsianCatalog";
import { isPanAsianCuisine } from "@lib/panAsianOrder";
import { isSoupsCategoryName } from "@lib/soups";
import { loadSoupsBowlsCatalog } from "@lib/soupsBowlsCatalog";
import { packWaiterSelection, unpackWaiterSelection } from "@lib/waiterSelection";
import type { menuItem } from "@/types/types";

const ACTIVE_STATUSES = ["pending", "confirmed", "preparing"] as const;
const SETTLED_STATUSES = ["delivered", "settled"] as const;

export class WaiterOrderError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "WaiterOrderError";
  }
}

export type WaiterTableStatus = "available" | "open" | "preparing" | "served" | "settled";

export type WaiterTableCard = {
  id: string;
  tableNumber: number;
  label: string;
  status: WaiterTableStatus;
  orderId: number | null;
  itemCount: number;
  total: number | null;
  openedAt: string | null;
  paymentStatus: "Unpaid" | "Paid";
};

export type WaiterOrderLine = {
  id: number;
  menu_item_id: string;
  title: string;
  quantity: number;
  price: number;
  selected_protein: string | null;
  selected_size: string | null;
  item_format: string | null;
};

export type WaiterTableOrder = {
  id: number;
  tableId: string;
  tableNumber: number;
  tableLabel: string;
  status: Exclude<WaiterTableStatus, "available">;
  kitchenStatus: string;
  createdAt: string | null;
  waiterName: string;
  notes: string | null;
  paymentStatus: "Unpaid" | "Paid";
  paymentMethod: string | null;
  subtotal: number;
  gst: number;
  deliveryCharge: 0;
  total: number;
  items: WaiterOrderLine[];
};

type TableRow = {
  id: string;
  table_number: number;
  table_name: string | null;
  is_active: boolean | null;
};

type OrderItemRow = {
  id: number;
  menu_item_id: string;
  item_name: string;
  selected_protein: string | null;
  item_format: string | null;
  unit_price: number | string;
  quantity: number;
};

type OrderRow = {
  id: number;
  dining_table_id: string | null;
  status: string;
  order_source: string | null;
  customer_name: string | null;
  special_requests: string | null;
  payment_method: string | null;
  subtotal: number | string | null;
  delivery_charge: number | string | null;
  total: number | string | null;
  created_at: string | null;
  order_items?: OrderItemRow[] | null;
};

function tableLabel(tableNumber: number) {
  return `T${tableNumber}`;
}

export function waiterStatusFromKitchen(status: string): WaiterTableStatus {
  if (status === "pending") return "open";
  if (status === "confirmed") return "preparing";
  if (status === "preparing") return "served";
  if (status === "delivered" || status === "settled") return "settled";

  return "available";
}

function isMissingColumn(error: { code?: string; message?: string } | null) {
  return error?.code === "42703" || error?.code === "PGRST204";
}

function paymentState(status: string, method: string | null): "Unpaid" | "Paid" {
  if (status === "delivered" || status === "settled") return "Paid";
  if ((method ?? "").toLowerCase() === "qr") return "Paid";

  return "Unpaid";
}

function mapLine(row: OrderItemRow): WaiterOrderLine {
  const unpacked = unpackWaiterSelection(row.selected_protein);

  return {
    id: row.id,
    menu_item_id: String(row.menu_item_id),
    title: row.item_name,
    quantity: row.quantity,
    price: Number(row.unit_price),
    selected_protein: unpacked.selectedProtein,
    selected_size: unpacked.selectedSize,
    item_format: row.item_format,
  };
}

function mapOrder(order: OrderRow, table: TableRow, items: OrderItemRow[]): WaiterTableOrder {
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.unit_price) * item.quantity,
    0,
  );
  const bill = calculateDineInBill(subtotal);
  const status = waiterStatusFromKitchen(order.status);

  return {
    id: order.id,
    tableId: table.id,
    tableNumber: Number(table.table_number),
    tableLabel: tableLabel(Number(table.table_number)),
    status: status === "available" ? "settled" : status,
    kitchenStatus: order.status,
    createdAt: order.created_at,
    waiterName: order.customer_name?.trim() || "Waiter",
    notes: order.special_requests?.trim() || null,
    paymentStatus: paymentState(order.status, order.payment_method),
    paymentMethod: order.payment_method,
    subtotal: bill.subtotal,
    gst: bill.gst,
    deliveryCharge: 0,
    total: bill.total,
    items: items.map(mapLine),
  };
}

async function loadTable(tableNumber: number) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("restaurant_tables")
    .select("id, table_number, table_name, is_active")
    .eq("table_number", tableNumber)
    .maybeSingle();

  if (error) throw new WaiterOrderError(500, "Unable to load this table.");
  if (!data || data.is_active === false) {
    throw new WaiterOrderError(404, "That table is not available.");
  }

  return data as TableRow;
}

async function loadOrderById(orderId: number) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, dining_table_id, status, order_source, customer_name, special_requests, payment_method, subtotal, delivery_charge, total, created_at, order_items(id, menu_item_id, item_name, selected_protein, item_format, unit_price, quantity)",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) throw new WaiterOrderError(500, "Unable to load this order.");
  if (!data || data.order_source !== "waiter") {
    throw new WaiterOrderError(404, "Table order not found.");
  }

  return data as OrderRow;
}

async function activeOrderForTable(tableId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, status")
    .eq("dining_table_id", tableId)
    .eq("order_source", "waiter")
    .in("status", [...ACTIVE_STATUSES])
    .order("id", { ascending: false })
    .limit(1);

  if (error) throw new WaiterOrderError(500, "Unable to check this table.");

  return (data?.[0] as { id: number; status: string } | undefined) ?? null;
}

async function quoteSelection(input: {
  menuItemId: string;
  selectedProtein: string;
  selectedSize?: string | null;
  itemFormat?: string | null;
}) {
  const supabase = getSupabaseAdminClient();
  const { data: menuItemRow, error } = await supabase
    .from("MenuItem")
    .select(
      "id, title, price, imageUrl, proteinVariants, sizeVariants, order_type, cuisine, categoryId, is_available, formatOptions",
    )
    .eq("id", input.menuItemId)
    .maybeSingle();

  if (error || !menuItemRow) throw new WaiterOrderError(404, "Menu item not found.");
  if (menuItemRow.order_type && menuItemRow.order_type !== "on_demand") {
    throw new WaiterOrderError(400, "This item is not available for dine-in ordering.");
  }
  if (isBlockedMenuTitle(menuItemRow.title) || !isMenuItemAvailable(menuItemRow)) {
    throw new WaiterOrderError(400, unavailableCartMessage([menuItemRow]));
  }

  const categoryId = Number(menuItemRow.categoryId);
  let categoryName: string | null = null;

  if (Number.isInteger(categoryId) && categoryId > 0) {
    const category = await supabase.from("Category").select("name").eq("id", categoryId).maybeSingle();

    if (category.error) throw new WaiterOrderError(500, "Unable to price this menu item.");
    categoryName = category.data?.name ?? null;
  }

  const title = String(menuItemRow.title ?? "");
  const [panCatalog, starterPrices, soupsBowlsPrices] = await Promise.all([
    isPanAsianCuisine(menuItemRow.cuisine) ? loadPanAsianCatalog([title]) : Promise.resolve(null),
    isAsianStartersGravyCuisine(menuItemRow.cuisine)
      ? loadAsianStartersGravyCatalog([title])
      : Promise.resolve([]),
    isSoupsCategoryName(categoryName) ? loadSoupsBowlsCatalog([title]) : Promise.resolve([]),
  ]);
  const quote = quoteOrderItem({
    item: menuItemRow as menuItem,
    categoryName,
    selectedProtein: input.selectedProtein,
    selectedSize: input.selectedSize,
    panAsianPrices: panCatalog?.prices ?? [],
    panAsianIngredients: panCatalog?.ingredients ?? [],
    asianStarterPrices: starterPrices,
    soupsBowlsPrices,
  });

  if ("error" in quote) throw new WaiterOrderError(400, quote.error);

  const format = resolveItemFormat(readFormatOptions(menuItemRow.formatOptions), input.itemFormat);

  if ("error" in format) throw new WaiterOrderError(400, format.error);

  return {
    menuItemId: String(menuItemRow.id),
    title,
    selection: packWaiterSelection(quote.selection, input.selectedSize),
    itemFormat: format.itemFormat,
    basePrice: quote.base_price,
    proteinPrice: quote.protein_price,
    unitPrice: quote.price,
  };
}

async function refreshTotals(orderId: number) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("order_items")
    .select("unit_price, quantity")
    .eq("order_id", orderId);

  if (error) throw new WaiterOrderError(500, "Unable to total this order.");

  const subtotal = (data ?? []).reduce(
    (sum, item) => sum + Number(item.unit_price) * Number(item.quantity),
    0,
  );
  const bill = calculateDineInBill(subtotal);
  const patch = {
    subtotal: bill.subtotal,
    delivery_charge: 0,
    total: bill.total,
    updated_at: new Date().toISOString(),
  };
  const { error: updateError } = await supabase.from("orders").update(patch).eq("id", orderId);

  if (updateError) throw new WaiterOrderError(500, "Unable to save the bill.");

  const gstUpdate = await supabase
    .from("orders")
    .update({ gst_amount: bill.gst })
    .eq("id", orderId);

  if (gstUpdate.error && !isMissingColumn(gstUpdate.error)) {
    throw new WaiterOrderError(500, "Unable to save GST.");
  }

  return bill;
}

async function presentOrder(orderId: number) {
  const order = await loadOrderById(orderId);

  if (!order.dining_table_id) throw new WaiterOrderError(409, "This order is not on a table.");

  const supabase = getSupabaseAdminClient();
  const { data: table, error } = await supabase
    .from("restaurant_tables")
    .select("id, table_number, table_name, is_active")
    .eq("id", order.dining_table_id)
    .maybeSingle();

  if (error || !table) throw new WaiterOrderError(404, "Table not found for this order.");

  return mapOrder(order, table as TableRow, order.order_items ?? []);
}

function assertActive(order: OrderRow) {
  if (!ACTIVE_STATUSES.includes(order.status as (typeof ACTIVE_STATUSES)[number])) {
    throw new WaiterOrderError(409, "This table order is already settled.");
  }
}

export async function listWaiterTables(): Promise<WaiterTableCard[]> {
  const supabase = getSupabaseAdminClient();
  const [tablesResult, ordersResult] = await Promise.all([
    supabase
      .from("restaurant_tables")
      .select("id, table_number, table_name, is_active")
      .eq("is_active", true)
      .order("table_number"),
    supabase
      .from("orders")
      .select(
        "id, dining_table_id, status, total, created_at, payment_method, order_items(quantity)",
      )
      .eq("order_source", "waiter")
      .in("status", [...ACTIVE_STATUSES]),
  ]);

  if (tablesResult.error || ordersResult.error) {
    throw new WaiterOrderError(500, "Unable to load tables.");
  }

  const ordersByTable = new Map<string, OrderRow>();

  for (const order of (ordersResult.data ?? []) as OrderRow[]) {
    if (!order.dining_table_id) continue;

    const current = ordersByTable.get(order.dining_table_id);

    if (!current || order.id > current.id) ordersByTable.set(order.dining_table_id, order);
  }

  return ((tablesResult.data ?? []) as TableRow[]).map((table) => {
    const order = ordersByTable.get(table.id);
    const items = order?.order_items ?? [];
    const status = order ? waiterStatusFromKitchen(order.status) : "available";

    return {
      id: table.id,
      tableNumber: Number(table.table_number),
      label: tableLabel(Number(table.table_number)),
      status: status === "settled" ? "available" : status,
      orderId: order?.id ?? null,
      itemCount: items.reduce((sum, item) => sum + Number(item.quantity), 0),
      total: order ? Number(order.total) : null,
      openedAt: order?.created_at ?? null,
      paymentStatus: order ? paymentState(order.status, order.payment_method) : "Unpaid",
    };
  });
}

export async function listWaiterOrders(scope: "active" | "settled") {
  const supabase = getSupabaseAdminClient();
  const statuses = scope === "active" ? ACTIVE_STATUSES : SETTLED_STATUSES;
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, dining_table_id, status, order_source, customer_name, special_requests, payment_method, subtotal, delivery_charge, total, created_at, order_items(id, menu_item_id, item_name, selected_protein, item_format, unit_price, quantity)",
    )
    .eq("order_source", "waiter")
    .in("status", [...statuses])
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) throw new WaiterOrderError(500, "Unable to load table orders.");

  const tableIds = [
    ...new Set(
      ((data ?? []) as OrderRow[])
        .map((order) => order.dining_table_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const tables = tableIds.length
    ? await supabase
        .from("restaurant_tables")
        .select("id, table_number, table_name, is_active")
        .in("id", tableIds)
    : { data: [], error: null };

  if (tables.error) throw new WaiterOrderError(500, "Unable to load table orders.");

  const tableById = new Map(((tables.data ?? []) as TableRow[]).map((table) => [table.id, table]));

  return ((data ?? []) as OrderRow[]).flatMap((order) => {
    const table = order.dining_table_id ? tableById.get(order.dining_table_id) : undefined;

    if (!table) return [];

    return [mapOrder(order, table, order.order_items ?? [])];
  });
}

export async function openWaiterTable(tableNumber: number, waiterName: string) {
  const table = await loadTable(tableNumber);
  const existing = await activeOrderForTable(table.id);

  if (existing) return presentOrder(existing.id);

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const label = tableLabel(Number(table.table_number));
  const inserted = await supabase
    .from("orders")
    .insert({
      session_id: `waiter-${table.id}-${Date.now()}`,
      customer_name: waiterName,
      customer_phone: "Dine-in",
      area: label,
      delivery_address_type: "selected_location",
      delivery_location_name: label,
      dining_table_id: table.id,
      special_requests: null,
      subtotal: 0,
      delivery_charge: 0,
      total: 0,
      status: "pending",
      order_source: "waiter",
      payment_method: "cash",
      whatsapp_status: "pending",
      updated_at: now,
    })
    .select("id")
    .single();

  if (inserted.error?.code === "23505") {
    const raced = await activeOrderForTable(table.id);

    if (raced) return presentOrder(raced.id);
  }

  if (inserted.error || !inserted.data) {
    throw new WaiterOrderError(500, "Unable to open this table.");
  }

  const extras = await supabase
    .from("orders")
    .update({ order_type: "dine_in", waiter_name: waiterName, payment_status: "pending" })
    .eq("id", inserted.data.id);

  if (extras.error && !isMissingColumn(extras.error)) {
    console.error("Unable to store dine-in order details:", extras.error.message);
  }

  return presentOrder(inserted.data.id as number);
}

export async function getWaiterOrder(orderId: number) {
  return presentOrder(orderId);
}

export async function saveWaiterOrderNotes(orderId: number, notes: string) {
  const order = await loadOrderById(orderId);

  assertActive(order);

  const { error } = await getSupabaseAdminClient()
    .from("orders")
    .update({
      special_requests: notes.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (error) throw new WaiterOrderError(500, "Unable to save the order note.");

  return presentOrder(orderId);
}

export async function addWaiterOrderItem(
  orderId: number,
  input: {
    menuItemId: string;
    selectedProtein: string;
    selectedSize?: string | null;
    itemFormat?: string | null;
    quantity: number;
  },
) {
  const order = await loadOrderById(orderId);

  assertActive(order);

  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw new WaiterOrderError(400, "Invalid quantity.");
  }

  const priced = await quoteSelection(input);
  const supabase = getSupabaseAdminClient();
  const existing = (order.order_items ?? []).find(
    (item) =>
      String(item.menu_item_id) === priced.menuItemId &&
      (item.selected_protein ?? "") === priced.selection &&
      (item.item_format ?? null) === priced.itemFormat,
  );

  if (existing) {
    const { error } = await supabase
      .from("order_items")
      .update({
        quantity: existing.quantity + input.quantity,
        unit_price: priced.unitPrice,
        base_price: priced.basePrice,
        protein_price: priced.proteinPrice,
      })
      .eq("id", existing.id)
      .eq("order_id", orderId);

    if (error) throw new WaiterOrderError(500, "Unable to update this dish.");
  } else {
    const { error } = await supabase.from("order_items").insert({
      order_id: orderId,
      menu_item_id: priced.menuItemId,
      item_name: priced.title,
      selected_protein: priced.selection,
      item_format: priced.itemFormat,
      base_price: priced.basePrice,
      protein_price: priced.proteinPrice,
      unit_price: priced.unitPrice,
      quantity: input.quantity,
    });

    if (error) throw new WaiterOrderError(500, "Unable to add this dish.");
  }

  await refreshTotals(orderId);

  return presentOrder(orderId);
}

export async function updateWaiterOrderItem(orderId: number, itemId: number, quantity: number) {
  const order = await loadOrderById(orderId);

  assertActive(order);

  const supabase = getSupabaseAdminClient();

  if (!Number.isInteger(quantity) || quantity < 1) {
    const { error } = await supabase
      .from("order_items")
      .delete()
      .eq("id", itemId)
      .eq("order_id", orderId);

    if (error) throw new WaiterOrderError(500, "Unable to remove this dish.");
  } else {
    const line = (order.order_items ?? []).find((item) => item.id === itemId);

    if (!line) throw new WaiterOrderError(404, "That dish is not on this order.");

    const { error } = await supabase
      .from("order_items")
      .update({ quantity })
      .eq("id", itemId)
      .eq("order_id", orderId);

    if (error) throw new WaiterOrderError(500, "Unable to update the quantity.");
  }

  await refreshTotals(orderId);

  return presentOrder(orderId);
}

export async function clearWaiterOrderItems(orderId: number) {
  const order = await loadOrderById(orderId);

  assertActive(order);

  const { error } = await getSupabaseAdminClient()
    .from("order_items")
    .delete()
    .eq("order_id", orderId);

  if (error) throw new WaiterOrderError(500, "Unable to clear this order.");

  await refreshTotals(orderId);

  return presentOrder(orderId);
}

export async function settleWaiterOrder(
  orderId: number,
  input: {
    method: "cash" | "qr";
    amountReceived?: number | null;
    transactionReference?: string | null;
    confirmed: boolean;
    receivedBy: string;
  },
) {
  const order = await loadOrderById(orderId);

  if (SETTLED_STATUSES.includes(order.status as (typeof SETTLED_STATUSES)[number])) {
    throw new WaiterOrderError(409, "This table is already settled.");
  }

  assertActive(order);

  if (!input.confirmed) {
    throw new WaiterOrderError(400, "Confirm the payment before closing the table.");
  }

  const items = order.order_items ?? [];

  if (items.length === 0) {
    throw new WaiterOrderError(400, "Add at least one dish before settling.");
  }

  const bill = await refreshTotals(orderId);

  if (input.method === "cash") {
    const received = Number(input.amountReceived);

    if (!Number.isFinite(received) || received + 0.001 < bill.total) {
      throw new WaiterOrderError(400, "Cash received is less than the bill.");
    }
  }

  if (input.method === "qr" && !input.confirmed) {
    throw new WaiterOrderError(400, "Verify the QR payment before marking it paid.");
  }

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const reference = input.transactionReference?.trim().slice(0, 80) || null;
  let settled = await supabase
    .from("orders")
    .update({
      status: "settled",
      payment_method: input.method,
      updated_at: now,
    })
    .eq("id", orderId)
    .in("status", [...ACTIVE_STATUSES])
    .select("id")
    .maybeSingle();

  if (settled.error?.code === "23514") {
    settled = await supabase
      .from("orders")
      .update({
        status: "delivered",
        payment_method: input.method,
        updated_at: now,
      })
      .eq("id", orderId)
      .in("status", [...ACTIVE_STATUSES])
      .select("id")
      .maybeSingle();
  }

  if (settled.error) throw new WaiterOrderError(500, "Unable to settle this table.");
  if (!settled.data) throw new WaiterOrderError(409, "This table was already settled.");

  const paidMarker = await supabase
    .from("orders")
    .update({
      payment_status: "paid",
      settled_at: now,
      order_type: "dine_in",
    })
    .eq("id", orderId);

  if (paidMarker.error && !isMissingColumn(paidMarker.error)) {
    console.error("Unable to store settlement details:", paidMarker.error.message);
  }

  const payment = await supabase.from("order_payments").insert({
    order_id: orderId,
    payment_method: input.method,
    amount: bill.total,
    payment_status: "paid",
    transaction_reference: reference,
    received_by: input.receivedBy,
    paid_at: now,
  });

  if (payment.error && payment.error.code !== "PGRST205" && !isMissingColumn(payment.error)) {
    console.error("Unable to store the payment record:", payment.error.message);
  }

  const tableUpdate = await supabase
    .from("restaurant_tables")
    .update({ status: "available", active_order_id: null, updated_at: now })
    .eq("id", order.dining_table_id);

  if (tableUpdate.error && !isMissingColumn(tableUpdate.error)) {
    console.error("Unable to reset the table status:", tableUpdate.error.message);
  }

  return presentOrder(orderId);
}
