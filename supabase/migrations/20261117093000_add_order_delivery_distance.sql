-- Driving distance and the restaurant pin used to price delivery.
-- Customer coordinates already live in delivery_latitude / delivery_longitude.
-- The fee itself already lives in delivery_charge.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_distance_km DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS restaurant_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS restaurant_longitude DOUBLE PRECISION;
