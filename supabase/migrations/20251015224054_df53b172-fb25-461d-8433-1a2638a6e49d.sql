-- מערכת תזכורות למשימות

-- יצירת טבלת תזכורות
CREATE TABLE task_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_task_id UUID REFERENCES project_tasks(id) ON DELETE CASCADE NOT NULL,
    reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
    message TEXT,
    sound_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view reminders"
ON task_reminders FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create reminders"
ON task_reminders FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their reminders"
ON task_reminders FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their reminders"
ON task_reminders FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Admins can manage all reminders"
ON task_reminders FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- יצירת Storage bucket לקבצי צליל
INSERT INTO storage.buckets (id, name, public)
VALUES ('reminder-sounds', 'reminder-sounds', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies עבור Storage
CREATE POLICY "Anyone can view reminder sounds"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'reminder-sounds');

CREATE POLICY "Authenticated users can upload sounds"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'reminder-sounds');

CREATE POLICY "Users can delete their sounds"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'reminder-sounds' AND auth.uid()::text = owner::text);

-- אינדקסים לביצועים
CREATE INDEX idx_reminders_time ON task_reminders(reminder_time) WHERE is_active = true;
CREATE INDEX idx_reminders_project_task ON task_reminders(project_task_id);

-- Trigger לעדכון updated_at
CREATE TRIGGER update_reminders_updated_at
BEFORE UPDATE ON task_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();