-- Add timeline tracking fields to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS target_completion_days INTEGER,
ADD COLUMN IF NOT EXISTS actual_completion_date TIMESTAMP WITH TIME ZONE;

-- Add timeline tracking fields to categories table
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS target_days INTEGER,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;

-- Add start_date field to project_tasks if not exists
ALTER TABLE public.project_tasks
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;

-- Update existing projects to set started_at based on created_at
UPDATE public.projects
SET started_at = created_at
WHERE started_at IS NULL;

-- Create function to auto-update project started_at when first task starts
CREATE OR REPLACE FUNCTION update_project_started_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.started_at IS NOT NULL AND OLD.started_at IS NULL THEN
    UPDATE projects
    SET started_at = LEAST(COALESCE(started_at, NEW.started_at), NEW.started_at)
    WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating project started_at
DROP TRIGGER IF EXISTS trigger_update_project_started_at ON project_tasks;
CREATE TRIGGER trigger_update_project_started_at
  AFTER UPDATE ON project_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_project_started_at();