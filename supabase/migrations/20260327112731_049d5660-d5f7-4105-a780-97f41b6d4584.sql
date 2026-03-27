
-- Create storage bucket for establishment assets
INSERT INTO storage.buckets (id, name, public) VALUES ('establishments', 'establishments', true);

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'establishments');

-- Allow public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'establishments');

-- Allow owners to update their files
CREATE POLICY "Owners can update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'establishments');

-- Allow owners to delete their files
CREATE POLICY "Owners can delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'establishments');

-- Add onboarding_completed flag to establishments
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
