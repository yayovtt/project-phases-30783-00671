-- שלב 2: ניהול קבצים - יצירת טבלת קבצים מצורפים

-- יצירת טבלת קבצים מצורפים
CREATE TABLE task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_task_id UUID REFERENCES project_tasks(id) ON DELETE CASCADE NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_by UUID NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view attachments"
ON task_attachments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can upload attachments"
ON task_attachments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own attachments"
ON task_attachments FOR DELETE
TO authenticated
USING (auth.uid() = uploaded_by);

CREATE POLICY "Admins can manage all attachments"
ON task_attachments FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- יצירת Storage bucket לקבצים
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-files', 'task-files', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies עבור Storage
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-files');

CREATE POLICY "Authenticated users can view files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'task-files');

CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'task-files' AND auth.uid()::text = owner::text);

CREATE POLICY "Admins can delete all files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'task-files' AND has_role(auth.uid(), 'admin'));