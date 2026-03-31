ALTER TABLE public.establishments
ADD COLUMN IF NOT EXISTS current_checkout_id text;