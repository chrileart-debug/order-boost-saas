
-- Owners can view job_applications for their jobs
CREATE POLICY "Owners can view job applications"
ON public.job_applications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    JOIN establishments e ON e.id = j.establishment_id
    WHERE j.id = job_applications.job_id AND e.owner_id = auth.uid()
  )
);

-- Owners can update job_applications for their jobs (accept/reject)
CREATE POLICY "Owners can update job applications"
ON public.job_applications
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    JOIN establishments e ON e.id = j.establishment_id
    WHERE j.id = job_applications.job_id AND e.owner_id = auth.uid()
  )
);

-- Owners can insert into fleet_history
CREATE POLICY "Owners can insert fleet_history"
ON public.fleet_history
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM establishments e
    WHERE e.id = fleet_history.establishment_id AND e.owner_id = auth.uid()
  )
);

-- Owners can view their fleet_history
CREATE POLICY "Owners can view fleet_history"
ON public.fleet_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM establishments e
    WHERE e.id = fleet_history.establishment_id AND e.owner_id = auth.uid()
  )
);

-- Owners can update fleet_history (deactivate drivers)
CREATE POLICY "Owners can update fleet_history"
ON public.fleet_history
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM establishments e
    WHERE e.id = fleet_history.establishment_id AND e.owner_id = auth.uid()
  )
);

-- Owners can manage their own jobs
CREATE POLICY "Owners can insert jobs"
ON public.jobs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM establishments e
    WHERE e.id = jobs.establishment_id AND e.owner_id = auth.uid()
  )
);

CREATE POLICY "Owners can update jobs"
ON public.jobs
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM establishments e
    WHERE e.id = jobs.establishment_id AND e.owner_id = auth.uid()
  )
);

CREATE POLICY "Owners can delete jobs"
ON public.jobs
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM establishments e
    WHERE e.id = jobs.establishment_id AND e.owner_id = auth.uid()
  )
);

-- Allow owners to view driver profiles for applicants
CREATE POLICY "Owners can view applicant driver profiles"
ON public.driver_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM job_applications ja
    JOIN jobs j ON j.id = ja.job_id
    JOIN establishments e ON e.id = j.establishment_id
    WHERE ja.driver_id = driver_profiles.id AND e.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM fleet_history fh
    JOIN establishments e ON e.id = fh.establishment_id
    WHERE fh.driver_id = driver_profiles.id AND e.owner_id = auth.uid()
  )
);

-- Allow owners to view applicant profiles (names)
CREATE POLICY "Owners can view applicant profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM job_applications ja
    JOIN jobs j ON j.id = ja.job_id
    JOIN establishments e ON e.id = j.establishment_id
    WHERE ja.driver_id = profiles.id AND e.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM fleet_history fh
    JOIN establishments e ON e.id = fh.establishment_id
    WHERE fh.driver_id = profiles.id AND e.owner_id = auth.uid()
  )
);
