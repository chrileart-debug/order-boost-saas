CREATE TABLE public.customer_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  establishment_slug text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(phone, establishment_slug)
);

ALTER TABLE public.customer_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read carts" ON public.customer_carts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert carts" ON public.customer_carts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update carts" ON public.customer_carts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete carts" ON public.customer_carts FOR DELETE TO anon, authenticated USING (true);