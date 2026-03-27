
-- 1. Add establishment_id to product_option_groups (nullable for now)
ALTER TABLE public.product_option_groups ADD COLUMN IF NOT EXISTS establishment_id uuid;

-- 2. Populate establishment_id from existing product relationships
UPDATE public.product_option_groups g
SET establishment_id = (
  SELECT c.establishment_id
  FROM products p
  JOIN categories c ON c.id = p.category_id
  WHERE p.id = g.product_id
  LIMIT 1
);

-- 3. Make product_id nullable (groups are now shared)
ALTER TABLE public.product_option_groups ALTER COLUMN product_id DROP NOT NULL;

-- 4. Create the junction table product_modifiers
CREATE TABLE public.product_modifiers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL,
  group_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (product_id, group_id)
);

-- 5. Migrate existing relationships into product_modifiers
INSERT INTO public.product_modifiers (product_id, group_id)
SELECT DISTINCT product_id, id FROM public.product_option_groups
WHERE product_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 6. RLS for product_modifiers
ALTER TABLE public.product_modifiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage product_modifiers"
ON public.product_modifiers
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN establishments e ON e.id = c.establishment_id
    WHERE p.id = product_modifiers.product_id AND e.owner_id = auth.uid()
  )
);

CREATE POLICY "Public can view product_modifiers"
ON public.product_modifiers
FOR SELECT
TO anon, authenticated
USING (true);

-- 7. Update RLS on product_option_groups to use establishment_id
DROP POLICY IF EXISTS "Owners can manage option groups" ON public.product_option_groups;
CREATE POLICY "Owners can manage option groups"
ON public.product_option_groups
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM establishments e
    WHERE e.id = product_option_groups.establishment_id AND e.owner_id = auth.uid()
  )
);
