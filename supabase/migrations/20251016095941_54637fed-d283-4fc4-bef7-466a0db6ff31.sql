-- Fix search_path for update_project_started_at function
CREATE OR REPLACE FUNCTION update_project_started_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.started_at IS NOT NULL AND OLD.started_at IS NULL THEN
    UPDATE projects
    SET started_at = LEAST(COALESCE(started_at, NEW.started_at), NEW.started_at)
    WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;