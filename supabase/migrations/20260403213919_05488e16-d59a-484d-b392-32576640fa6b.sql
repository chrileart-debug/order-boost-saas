-- Add unique constraint to prevent duplicate reviews per job
ALTER TABLE public.driver_reviews
  ADD CONSTRAINT driver_reviews_unique_job
  UNIQUE (driver_id, establishment_id, job_id);