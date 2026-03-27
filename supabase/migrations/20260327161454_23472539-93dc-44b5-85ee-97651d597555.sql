
CREATE TABLE public.delivery_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'fixed_global',
  value numeric NOT NULL DEFAULT 0,
  min_cep text,
  max_cep text,
  max_km numeric,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.delivery_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage delivery_rules"
ON public.delivery_rules FOR ALL
TO public
USING (EXISTS (
  SELECT 1 FROM establishments e
  WHERE e.id = delivery_rules.establishment_id AND e.owner_id = auth.uid()
));

CREATE POLICY "Public can view delivery_rules"
ON public.delivery_rules FOR SELECT
TO anon, authenticated
USING (true);
