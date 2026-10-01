-- Stores the selected preparation estimate as its upper bound in minutes.
-- 15 = 10–15 minutes, 30 = 20–30 minutes, 45 = 30–45 minutes, 60 = 45–60 minutes.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS preparation_time_minutes INTEGER;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_preparation_time_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_preparation_time_check
  CHECK (
    preparation_time_minutes IS NULL
    OR preparation_time_minutes IN (15, 30, 45, 60)
  );
