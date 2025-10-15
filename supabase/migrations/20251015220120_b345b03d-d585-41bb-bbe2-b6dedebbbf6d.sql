-- Add helpful indices for better performance
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON public.project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_task_id ON public.project_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_completed ON public.project_tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON public.tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_order_index ON public.tasks(order_index);
CREATE INDEX IF NOT EXISTS idx_categories_order_index ON public.categories(order_index);

-- Add helpful comments for documentation
COMMENT ON TABLE public.project_tasks IS 'Links tasks to specific projects with completion status';
COMMENT ON TABLE public.tasks IS 'Master list of tasks that can be assigned to projects';
COMMENT ON TABLE public.categories IS 'Task categories for organizing workflow';
COMMENT ON TABLE public.projects IS 'Client projects with address and land registry details';