
INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('5f1e6644-1c0a-41c3-adda-598a720132f5', 'owner'),
  ('68f149a1-5a60-48a3-a559-096396291c69', 'owner')
ON CONFLICT (user_id, role) DO NOTHING;
