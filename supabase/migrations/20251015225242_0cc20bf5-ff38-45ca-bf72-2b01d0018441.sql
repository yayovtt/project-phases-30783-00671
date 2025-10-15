-- Phase 1: Add progress, assigned_to, and assigned_at columns to project_tasks
ALTER TABLE project_tasks 
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

-- Phase 2: Create task_dependencies table
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type TEXT DEFAULT 'finish_to_start' CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, depends_on_task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_project ON task_dependencies(project_id);

-- Enable RLS on task_dependencies
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_dependencies
CREATE POLICY "Authenticated users can view task dependencies"
ON task_dependencies FOR SELECT
USING (true);

CREATE POLICY "Admins can manage task dependencies"
ON task_dependencies FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can create task dependencies"
ON task_dependencies FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = task_dependencies.project_id
  )
);

CREATE POLICY "Authenticated users can delete their project task dependencies"
ON task_dependencies FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = task_dependencies.project_id
  )
);

-- Phase 4: Create task_notifications table
CREATE TABLE IF NOT EXISTS task_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT CHECK (notification_type IN ('due_soon', 'overdue', 'dependency_completed', 'assigned', 'task_completed')),
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_notifications_user ON task_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_project_task ON task_notifications(project_task_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_read ON task_notifications(is_read);

-- Enable RLS on task_notifications
ALTER TABLE task_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_notifications
CREATE POLICY "Users can view their own notifications"
ON task_notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON task_notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON task_notifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage all notifications"
ON task_notifications FOR ALL
USING (has_role(auth.uid(), 'admin'));