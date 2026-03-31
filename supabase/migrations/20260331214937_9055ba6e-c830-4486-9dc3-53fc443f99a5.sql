ALTER TABLE public.establishments
ADD COLUMN IF NOT EXISTS plan_status text NOT NULL DEFAULT 'inactive';

ALTER TABLE public.establishments
ADD COLUMN IF NOT EXISTS asaas_subscription_id text;