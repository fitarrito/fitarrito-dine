ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS special_requests TEXT;
