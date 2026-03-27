
-- Public read access for menu pages
CREATE POLICY "Public can view establishments" ON public.establishments FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public can view categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public can view products" ON public.products FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public can view option groups" ON public.product_option_groups FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Public can view options" ON public.product_options FOR SELECT TO anon, authenticated USING (true);

-- Allow anonymous users to insert orders
CREATE POLICY "Anon can insert orders" ON public.orders FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can insert order items" ON public.order_items FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can insert order item options" ON public.order_item_options FOR INSERT TO anon WITH CHECK (true);

-- Allow anyone to view their own order by ID
CREATE POLICY "Anyone can view orders by id" ON public.orders FOR SELECT TO anon USING (true);

CREATE POLICY "Anyone can view order items" ON public.order_items FOR SELECT TO anon USING (true);

CREATE POLICY "Anyone can view order item options" ON public.order_item_options FOR SELECT TO anon USING (true);
