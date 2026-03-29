DO $$
BEGIN
  -- establishments
  IF to_regclass('public.establishments') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Public read establishments" ON public.establishments';
    EXECUTE 'DROP POLICY IF EXISTS "Public can view establishments" ON public.establishments';
    EXECUTE 'CREATE POLICY "Public can view establishments" ON public.establishments FOR SELECT TO anon, authenticated USING (true)';
  END IF;

  -- products
  IF to_regclass('public.products') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.products ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Public read products" ON public.products';
    EXECUTE 'DROP POLICY IF EXISTS "Public can view products" ON public.products';
    EXECUTE 'CREATE POLICY "Public can view products" ON public.products FOR SELECT TO anon, authenticated USING (true)';
  END IF;

  -- categories
  IF to_regclass('public.categories') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Public read categories" ON public.categories';
    EXECUTE 'DROP POLICY IF EXISTS "Public can view categories" ON public.categories';
    EXECUTE 'CREATE POLICY "Public can view categories" ON public.categories FOR SELECT TO anon, authenticated USING (true)';
  END IF;

  -- complements (legacy compatibility)
  IF to_regclass('public.complements') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.complements ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Public read complements" ON public.complements';
    EXECUTE 'DROP POLICY IF EXISTS "Public can view complements" ON public.complements';
    EXECUTE 'CREATE POLICY "Public can view complements" ON public.complements FOR SELECT TO anon, authenticated USING (true)';
  END IF;

  -- product_complements (legacy compatibility)
  IF to_regclass('public.product_complements') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.product_complements ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Public read product_complements" ON public.product_complements';
    EXECUTE 'DROP POLICY IF EXISTS "Public can view product_complements" ON public.product_complements';
    EXECUTE 'CREATE POLICY "Public can view product_complements" ON public.product_complements FOR SELECT TO anon, authenticated USING (true)';
  END IF;

  -- orders: anonymous inserts
  IF to_regclass('public.orders') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Public insert orders" ON public.orders';
    EXECUTE 'DROP POLICY IF EXISTS "Anon can insert orders" ON public.orders';
    EXECUTE 'CREATE POLICY "Anon can insert orders" ON public.orders FOR INSERT TO anon WITH CHECK (true)';
  END IF;

  -- push_subscriptions: anonymous inserts + nullable user_id
  IF to_regclass('public.push_subscriptions') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.push_subscriptions ALTER COLUMN user_id DROP NOT NULL';
    EXECUTE 'DROP POLICY IF EXISTS "Public insert push subscriptions" ON public.push_subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "Anyone can insert push subscriptions" ON public.push_subscriptions';
    EXECUTE 'CREATE POLICY "Anyone can insert push subscriptions" ON public.push_subscriptions FOR INSERT TO anon, authenticated WITH CHECK (true)';
  END IF;
END
$$;