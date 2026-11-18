-- Additive payment references. Safe to run once in the Supabase SQL editor.
-- Existing orders are unchanged: every new column is nullable.
-- Until this is applied, the app stores the Razorpay link in
-- orders.whatsapp_message_id and keeps unpaid checkouts out of the
-- kitchen list with order_source = 'awaiting_payment'.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (
    payment_status IS NULL
    OR payment_status IN ('pending', 'paid', 'failed')
  );

CREATE UNIQUE INDEX IF NOT EXISTS orders_razorpay_order_id_key
  ON public.orders (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_razorpay_payment_id_key
  ON public.orders (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;
