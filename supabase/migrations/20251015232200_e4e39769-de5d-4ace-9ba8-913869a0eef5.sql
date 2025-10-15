-- Create table for custom kanban statuses
CREATE TABLE IF NOT EXISTS public.kanban_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  order_index INTEGER NOT NULL DEFAULT 0,
  icon TEXT NOT NULL DEFAULT 'circle',
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kanban_statuses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view kanban statuses"
  ON public.kanban_statuses
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage kanban statuses"
  ON public.kanban_statuses
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_kanban_statuses_updated_at
  BEFORE UPDATE ON public.kanban_statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default statuses (global - no project_id)
INSERT INTO public.kanban_statuses (name, label, color, order_index, icon) VALUES
  ('pending', 'ממתין', '#6B7280', 1, 'circle'),
  ('in_progress', 'בביצוע', '#3B82F6', 2, 'clock'),
  ('review', 'בבדיקה', '#F59E0B', 3, 'alert-circle'),
  ('completed', 'הושלם', '#10B981', 4, 'check-circle-2')
ON CONFLICT DO NOTHING;