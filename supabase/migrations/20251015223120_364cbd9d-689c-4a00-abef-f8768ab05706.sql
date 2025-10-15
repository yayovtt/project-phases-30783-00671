-- שלב 1: הוספת עמודות לניהול זמנים ותאריכים

-- הוספת עמודות לטבלת tasks
ALTER TABLE tasks
ADD COLUMN due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN estimated_hours INTEGER,
ADD COLUMN priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- הוספת עמודות לטבלת project_tasks
ALTER TABLE project_tasks
ADD COLUMN started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN due_date_override TIMESTAMP WITH TIME ZONE,
ADD COLUMN actual_hours INTEGER DEFAULT 0;

-- יצירת אינדקסים לביצועים טובים יותר
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_project_tasks_due_date ON project_tasks(due_date_override);
CREATE INDEX idx_tasks_priority ON tasks(priority);

-- עדכון task order_index להיות nullable אם לא כבר
ALTER TABLE tasks ALTER COLUMN order_index DROP NOT NULL;