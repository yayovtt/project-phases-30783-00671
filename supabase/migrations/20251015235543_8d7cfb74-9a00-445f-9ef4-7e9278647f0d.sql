-- Fix RLS policy for project_tasks to allow updates
-- Drop existing policy and recreate with proper WITH CHECK
DROP POLICY IF EXISTS "Authenticated users can update project tasks" ON public.project_tasks;

-- Recreate policy with both USING and WITH CHECK expressions
CREATE POLICY "Authenticated users can update project tasks"
ON public.project_tasks
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Also ensure INSERT policy exists with WITH CHECK
DROP POLICY IF EXISTS "Authenticated users can insert project tasks" ON public.project_tasks;

CREATE POLICY "Authenticated users can insert project tasks"
ON public.project_tasks
FOR INSERT
TO authenticated
WITH CHECK (true);