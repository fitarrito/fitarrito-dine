-- Existing check only allowed cash/qr, which blocked paid Razorpay orders.
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('cash', 'qr', 'razorpay'));
