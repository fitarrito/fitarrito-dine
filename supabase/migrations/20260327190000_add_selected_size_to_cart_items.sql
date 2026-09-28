ALTER TABLE public."CartItems"
ADD COLUMN IF NOT EXISTS selected_size TEXT;
