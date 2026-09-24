-- Run this in Supabase Dashboard → SQL Editor if the table does not exist yet.

CREATE TABLE IF NOT EXISTS public.order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  menu_item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  selected_protein TEXT,
  base_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  protein_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  unit_price NUMERIC(10, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx
  ON public.order_items (order_id);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
