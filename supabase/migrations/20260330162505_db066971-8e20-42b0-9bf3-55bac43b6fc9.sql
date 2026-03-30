CREATE OR REPLACE FUNCTION public.set_trial_period()
RETURNS TRIGGER AS $$
BEGIN
  NEW.trial_ends_at := NOW() + INTERVAL '7 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_trial_on_insert
BEFORE INSERT ON public.establishments
FOR EACH ROW
EXECUTE FUNCTION public.set_trial_period();