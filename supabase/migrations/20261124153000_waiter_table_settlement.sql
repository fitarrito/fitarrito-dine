-- Waiter dine-in orders stay open on a table until payment is settled.
-- Run this after the earlier migrations in supabase/migrations.
-- Existing website orders are unchanged: every new column is nullable
-- or has a default, and current status values stay allowed.

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (
    status IN (
      'pending',
      'confirmed',
      'preparing',
      'cancelled',
      'delivered',
      'settled'
    )
  );

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_type TEXT,
  ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS waiter_name TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (
    payment_status IS NULL
    OR payment_status IN ('pending', 'paid', 'failed')
  );

ALTER TABLE public.restaurant_tables
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS active_order_id BIGINT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.restaurant_tables
  DROP CONSTRAINT IF EXISTS restaurant_tables_status_check;

ALTER TABLE public.restaurant_tables
  ADD CONSTRAINT restaurant_tables_status_check
  CHECK (status IN ('available', 'open', 'preparing', 'served', 'settled'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'restaurant_tables_active_order_id_fkey'
  ) THEN
    ALTER TABLE public.restaurant_tables
      ADD CONSTRAINT restaurant_tables_active_order_id_fkey
      FOREIGN KEY (active_order_id)
      REFERENCES public.orders (id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS orders_one_active_waiter_table
  ON public.orders (dining_table_id)
  WHERE order_source = 'waiter'
    AND dining_table_id IS NOT NULL
    AND status IN ('pending', 'confirmed', 'preparing');

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS selected_size TEXT;

CREATE TABLE IF NOT EXISTS public.order_payments (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES public.orders (id) ON DELETE RESTRICT,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'qr')),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'paid', 'failed')),
  transaction_reference TEXT,
  received_by TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS order_payments_one_paid_per_order
  ON public.order_payments (order_id)
  WHERE payment_status = 'paid';

ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
