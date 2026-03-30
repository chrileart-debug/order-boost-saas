ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_promo boolean NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promo_price numeric NULL;