
-- Helper function to check if current user is the support admin
CREATE OR REPLACE FUNCTION public.is_support_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND email = 'chrileart@gmail.com'
  )
$$;

-- Create support_tickets table
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL,
  establishment_name text NOT NULL,
  plan_name text NOT NULL DEFAULT 'free',
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Lojistas can view own tickets
CREATE POLICY "Owners can view own tickets"
ON public.support_tickets FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM establishments e
    WHERE e.id = support_tickets.establishment_id
      AND e.owner_id = auth.uid()
  )
  OR public.is_support_admin()
);

-- Lojistas can create tickets for own establishment
CREATE POLICY "Owners can insert own tickets"
ON public.support_tickets FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM establishments e
    WHERE e.id = support_tickets.establishment_id
      AND e.owner_id = auth.uid()
  )
  OR public.is_support_admin()
);

-- Admin can update any ticket (close, etc.)
CREATE POLICY "Admin can update tickets"
ON public.support_tickets FOR UPDATE
TO authenticated
USING (public.is_support_admin())
WITH CHECK (public.is_support_admin());

-- Owners can also update own tickets (close)
CREATE POLICY "Owners can update own tickets"
ON public.support_tickets FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM establishments e
    WHERE e.id = support_tickets.establishment_id
      AND e.owner_id = auth.uid()
  )
);

-- Create support_messages table
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_name text NOT NULL DEFAULT '',
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages of their own tickets + admin sees all
CREATE POLICY "Users can view ticket messages"
ON public.support_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM support_tickets t
    JOIN establishments e ON e.id = t.establishment_id
    WHERE t.id = support_messages.ticket_id
      AND e.owner_id = auth.uid()
  )
  OR public.is_support_admin()
);

-- Users can send messages in their own tickets + admin can send in any
CREATE POLICY "Users can insert ticket messages"
ON public.support_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM support_tickets t
      JOIN establishments e ON e.id = t.establishment_id
      WHERE t.id = support_messages.ticket_id
        AND e.owner_id = auth.uid()
    )
    OR public.is_support_admin()
  )
);

-- Admin can update messages (mark as read)
CREATE POLICY "Admin can update messages"
ON public.support_messages FOR UPDATE
TO authenticated
USING (public.is_support_admin());

-- Owners can update messages in own tickets (mark as read)
CREATE POLICY "Owners can update own ticket messages"
ON public.support_messages FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM support_tickets t
    JOIN establishments e ON e.id = t.establishment_id
    WHERE t.id = support_messages.ticket_id
      AND e.owner_id = auth.uid()
  )
);

-- Enable realtime on support_messages
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;

-- Trigger to update support_tickets.updated_at on new message
CREATE OR REPLACE FUNCTION public.update_ticket_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE support_tickets SET updated_at = now() WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_ticket_on_message
AFTER INSERT ON public.support_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_ticket_on_message();
