-- Push subscriptions table
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  endpoint text NOT NULL,
  keys_p256dh text NOT NULL,
  keys_auth text NOT NULL,
  phone text,
  establishment_id uuid REFERENCES public.establishments(id) ON DELETE CASCADE,
  user_id uuid,
  role text NOT NULL DEFAULT 'customer',
  UNIQUE(endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert push subscriptions" ON public.push_subscriptions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can read push subscriptions" ON public.push_subscriptions
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can delete push subscriptions" ON public.push_subscriptions
  FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "Anyone can update push subscriptions" ON public.push_subscriptions
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.establishments 
  ADD COLUMN IF NOT EXISTS push_notify_statuses jsonb DEFAULT '["preparing","shipping","completed"]'::jsonb;