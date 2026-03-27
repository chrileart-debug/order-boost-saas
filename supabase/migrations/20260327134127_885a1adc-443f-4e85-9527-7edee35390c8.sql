DROP POLICY IF EXISTS "Owners can manage options" ON public.product_options;

CREATE POLICY "Owners can manage options" ON public.product_options
FOR ALL TO public
USING (
  EXISTS (
    SELECT 1
    FROM product_option_groups g
    JOIN establishments e ON e.id = g.establishment_id
    WHERE g.id = product_options.group_id
      AND e.owner_id = auth.uid()
  )
);