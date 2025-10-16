-- Create project_folders table
CREATE TABLE IF NOT EXISTS public.project_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add folder_id to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.project_folders(id) ON DELETE SET NULL;

-- Enable RLS on project_folders
ALTER TABLE public.project_folders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_folders
CREATE POLICY "Authenticated users can view folders"
  ON public.project_folders
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create folders"
  ON public.project_folders
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their folders"
  ON public.project_folders
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their folders"
  ON public.project_folders
  FOR DELETE
  USING (auth.uid() = created_by);

CREATE POLICY "Admins can manage all folders"
  ON public.project_folders
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_project_folders_updated_at
  BEFORE UPDATE ON public.project_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();