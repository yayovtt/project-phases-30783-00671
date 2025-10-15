-- Create project_backups table for storing backups in database
CREATE TABLE project_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  backup_name TEXT NOT NULL,
  backup_data JSONB NOT NULL,
  files_metadata JSONB,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  backup_size BIGINT NOT NULL,
  backup_type TEXT CHECK (backup_type IN ('manual', 'auto', 'scheduled')) DEFAULT 'manual',
  notes TEXT
);

-- Create indexes for better performance
CREATE INDEX idx_project_backups_project ON project_backups(project_id);
CREATE INDEX idx_project_backups_created_at ON project_backups(created_at DESC);

-- Enable RLS
ALTER TABLE project_backups ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view project backups"
ON project_backups FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = project_backups.project_id
  )
);

CREATE POLICY "Authenticated users can create backups"
ON project_backups FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Backup creator or admin can delete"
ON project_backups FOR DELETE
TO authenticated
USING (
  auth.uid() = created_by OR 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can manage all backups"
ON project_backups FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));