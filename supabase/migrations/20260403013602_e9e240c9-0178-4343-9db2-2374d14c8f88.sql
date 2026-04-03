
-- Attach the existing assign_owner_role function as a trigger on profiles
CREATE TRIGGER on_profile_created_assign_owner
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_owner_role();

-- Also allow authenticated users to insert their own 'owner' role (for manual fallback)
-- Policy already exists for 'driver', add one for 'owner'
CREATE POLICY "Users can insert own owner role"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND role = 'owner'::app_role);
