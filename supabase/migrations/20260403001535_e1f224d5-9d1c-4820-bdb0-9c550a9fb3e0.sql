-- Add driver_id and started_at to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS driver_id uuid,
  ADD COLUMN IF NOT EXISTS started_at timestamp with time zone;