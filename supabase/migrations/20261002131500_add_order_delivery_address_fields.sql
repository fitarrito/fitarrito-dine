-- Add delivery address type and address fields to orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS delivery_address_type TEXT
    NOT NULL DEFAULT 'selected_location',
ADD COLUMN IF NOT EXISTS delivery_location_id TEXT,
ADD COLUMN IF NOT EXISTS delivery_location_name TEXT,
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS delivery_area TEXT,
ADD COLUMN IF NOT EXISTS delivery_city TEXT,
ADD COLUMN IF NOT EXISTS delivery_pincode TEXT,
ADD COLUMN IF NOT EXISTS delivery_landmark TEXT,
ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;

ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_delivery_address_type_check;

-- Allow only the two supported address types
ALTER TABLE public.orders
ADD CONSTRAINT orders_delivery_address_type_check
CHECK (
    delivery_address_type IN ('selected_location', 'normal_address')
);
