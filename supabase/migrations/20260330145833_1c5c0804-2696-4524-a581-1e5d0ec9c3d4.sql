
CREATE TABLE public.combo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  child_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.combo_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view combo_items" ON public.combo_items
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Owners can manage combo_items" ON public.combo_items
  FOR ALL TO public USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN categories c ON c.id = p.category_id
      JOIN establishments e ON e.id = c.establishment_id
      WHERE p.id = combo_items.parent_product_id AND e.owner_id = auth.uid()
    )
  );
