
-- Add unique constraint for UPSERT support
ALTER TABLE fleet_history
  ADD CONSTRAINT fleet_history_establishment_driver
  UNIQUE (establishment_id, driver_id);

-- Create trigger function to sync fleet_history automatically
CREATE OR REPLACE FUNCTION public.sync_fleet_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'contracted' AND NEW.driver_id IS NOT NULL THEN
    INSERT INTO fleet_history (establishment_id, driver_id, is_active, hired_at)
    VALUES (NEW.establishment_id, NEW.driver_id, true, now())
    ON CONFLICT ON CONSTRAINT fleet_history_establishment_driver
    DO UPDATE SET is_active = true, hired_at = now();
  END IF;

  IF NEW.status IN ('completed', 'cancelled') AND NEW.driver_id IS NOT NULL THEN
    UPDATE fleet_history
    SET is_active = false
    WHERE establishment_id = NEW.establishment_id
      AND driver_id = NEW.driver_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on jobs table
CREATE TRIGGER trg_sync_fleet_history
  AFTER INSERT OR UPDATE OF status ON jobs
  FOR EACH ROW EXECUTE FUNCTION sync_fleet_history();
