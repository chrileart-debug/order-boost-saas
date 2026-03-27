
-- Add missing columns to coupons
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS description text DEFAULT '',
  ADD COLUMN IF NOT EXISTS usage_count integer DEFAULT 0;

-- Create coupon_usage_history table
CREATE TABLE IF NOT EXISTS public.coupon_usage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for coupon_usage_history
ALTER TABLE public.coupon_usage_history ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (needed at checkout time)
CREATE POLICY "Anyone can insert coupon usage" ON public.coupon_usage_history
  FOR INSERT TO public WITH CHECK (true);

-- Anon can insert
CREATE POLICY "Anon can insert coupon usage" ON public.coupon_usage_history
  FOR INSERT TO anon WITH CHECK (true);

-- Owners can view usage history for their coupons
CREATE POLICY "Owners can view coupon usage" ON public.coupon_usage_history
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM coupons c
    JOIN establishments e ON e.id = c.establishment_id
    WHERE c.id = coupon_usage_history.coupon_id AND e.owner_id = auth.uid()
  ));

-- Public can read coupons (needed for checkout validation)
CREATE POLICY "Public can view coupons" ON public.coupons
  FOR SELECT TO anon, authenticated
  USING (true);
