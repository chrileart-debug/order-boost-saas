
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Establishments
CREATE TABLE public.establishments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  niche TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  cover_url TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  cnpj TEXT DEFAULT '',
  address JSONB DEFAULT '{}',
  lat DOUBLE PRECISION DEFAULT 0,
  lng DOUBLE PRECISION DEFAULT 0,
  base_fee NUMERIC(10,2) DEFAULT 0,
  km_included NUMERIC(10,2) DEFAULT 0,
  km_extra_price NUMERIC(10,2) DEFAULT 0,
  is_open BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can manage own establishments" ON public.establishments FOR ALL USING (auth.uid() = owner_id);

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can manage categories" ON public.categories FOR ALL
  USING (EXISTS (SELECT 1 FROM public.establishments WHERE id = categories.establishment_id AND owner_id = auth.uid()));

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url TEXT DEFAULT '',
  is_available BOOLEAN DEFAULT true,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can manage products" ON public.products FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.establishments e ON e.id = c.establishment_id
    WHERE c.id = products.category_id AND e.owner_id = auth.uid()
  ));

-- Product option groups
CREATE TABLE public.product_option_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  min_selection INT DEFAULT 0,
  max_selection INT DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can manage option groups" ON public.product_option_groups FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.categories c ON c.id = p.category_id
    JOIN public.establishments e ON e.id = c.establishment_id
    WHERE p.id = product_option_groups.product_id AND e.owner_id = auth.uid()
  ));

-- Product options
CREATE TABLE public.product_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.product_option_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can manage options" ON public.product_options FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.product_option_groups g
    JOIN public.products p ON p.id = g.product_id
    JOIN public.categories c ON c.id = p.category_id
    JOIN public.establishments e ON e.id = c.establishment_id
    WHERE g.id = product_options.group_id AND e.owner_id = auth.uid()
  ));

-- Coupons
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'percentage',
  value NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_purchase NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can manage coupons" ON public.coupons FOR ALL
  USING (EXISTS (SELECT 1 FROM public.establishments WHERE id = coupons.establishment_id AND owner_id = auth.uid()));

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT DEFAULT '',
  address_text TEXT DEFAULT '',
  lat DOUBLE PRECISION DEFAULT 0,
  lng DOUBLE PRECISION DEFAULT 0,
  subtotal NUMERIC(10,2) DEFAULT 0,
  shipping_fee NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  total_price NUMERIC(10,2) DEFAULT 0,
  payment_method TEXT DEFAULT '',
  coupon_code TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can manage orders" ON public.orders FOR ALL
  USING (EXISTS (SELECT 1 FROM public.establishments WHERE id = orders.establishment_id AND owner_id = auth.uid()));
CREATE POLICY "Anyone can insert orders" ON public.orders FOR INSERT WITH CHECK (true);

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL DEFAULT '',
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view order items" ON public.order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.establishments e ON e.id = o.establishment_id
    WHERE o.id = order_items.order_id AND e.owner_id = auth.uid()
  ));
CREATE POLICY "Anyone can insert order items" ON public.order_items FOR INSERT WITH CHECK (true);

-- Order item options
CREATE TABLE public.order_item_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  option_name TEXT NOT NULL DEFAULT '',
  option_price NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.order_item_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view order item options" ON public.order_item_options FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    JOIN public.establishments e ON e.id = o.establishment_id
    WHERE oi.id = order_item_options.order_item_id AND e.owner_id = auth.uid()
  ));
CREATE POLICY "Anyone can insert order item options" ON public.order_item_options FOR INSERT WITH CHECK (true);
