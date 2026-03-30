
-- Add trial_ends_at to establishments
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  plan_type text NOT NULL DEFAULT 'essential',
  status text NOT NULL DEFAULT 'inactive',
  gateway_name text NOT NULL DEFAULT 'mercadopago',
  gateway_subscription_id text,
  next_billing_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  gateway_name text NOT NULL DEFAULT 'mercadopago',
  gateway_transaction_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS policies for subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage own subscriptions" ON public.subscriptions
  FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM establishments e WHERE e.id = subscriptions.establishment_id AND e.owner_id = auth.uid()));

CREATE POLICY "Public can view subscriptions" ON public.subscriptions
  FOR SELECT TO anon, authenticated
  USING (true);

-- RLS policies for payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own payments" ON public.payments
  FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM establishments e WHERE e.id = payments.establishment_id AND e.owner_id = auth.uid()));

CREATE POLICY "System can insert payments" ON public.payments
  FOR INSERT TO public
  WITH CHECK (true);
