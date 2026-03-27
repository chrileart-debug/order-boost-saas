
-- 1. Create item_library table
CREATE TABLE public.item_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.item_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage items" ON public.item_library
FOR ALL TO public
USING (EXISTS (
  SELECT 1 FROM establishments e WHERE e.id = item_library.establishment_id AND e.owner_id = auth.uid()
));

CREATE POLICY "Public can view items" ON public.item_library
FOR SELECT TO anon, authenticated
USING (true);

-- 2. Add selection_type to product_option_groups
ALTER TABLE public.product_option_groups
ADD COLUMN IF NOT EXISTS selection_type text NOT NULL DEFAULT 'selection';

-- 3. Create group_items junction table (group -> item_library)
CREATE TABLE public.group_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  item_id uuid NOT NULL,
  max_quantity integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, item_id)
);

ALTER TABLE public.group_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage group_items" ON public.group_items
FOR ALL TO public
USING (EXISTS (
  SELECT 1 FROM product_option_groups g
  JOIN establishments e ON e.id = g.establishment_id
  WHERE g.id = group_items.group_id AND e.owner_id = auth.uid()
));

CREATE POLICY "Public can view group_items" ON public.group_items
FOR SELECT TO anon, authenticated
USING (true);
