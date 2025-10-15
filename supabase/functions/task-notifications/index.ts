import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting task notifications check...');

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Fetch all active project tasks with due dates
    const { data: projectTasks, error: tasksError } = await supabase
      .from('project_tasks')
      .select(`
        id,
        task_id,
        project_id,
        completed,
        due_date_override,
        assigned_to,
        progress,
        tasks!inner (
          name,
          priority
        ),
        projects!inner (
          client_name
        )
      `)
      .eq('completed', false)
      .not('due_date_override', 'is', null);

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      throw tasksError;
    }

    console.log(`Found ${projectTasks?.length || 0} active tasks with due dates`);

    const notifications: any[] = [];

    // Check each task for notification conditions
    for (const task of projectTasks || []) {
      const dueDate = new Date(task.due_date_override);
      const tasks = task.tasks as any;
      const projects = task.projects as any;
      const taskName = tasks?.name || 'משימה ללא שם';
      const projectName = projects?.client_name || 'פרויקט';

      // Task is overdue
      if (dueDate < now) {
        console.log(`Task ${taskName} is overdue`);
        
        if (task.assigned_to) {
          notifications.push({
            project_task_id: task.id,
            user_id: task.assigned_to,
            notification_type: 'overdue',
            message: `המשימה "${taskName}" בפרויקט "${projectName}" באיחור! תאריך יעד: ${dueDate.toLocaleDateString('he-IL')}`,
          });
        }
      }
      // Task due in 1 day
      else if (dueDate <= oneDayFromNow && dueDate > now) {
        console.log(`Task ${taskName} due in 1 day`);
        
        if (task.assigned_to) {
          notifications.push({
            project_task_id: task.id,
            user_id: task.assigned_to,
            notification_type: 'due_soon',
            message: `המשימה "${taskName}" בפרויקט "${projectName}" תסתיים מחר!`,
          });
        }
      }
      // Task due in 3 days
      else if (dueDate <= threeDaysFromNow && dueDate > oneDayFromNow) {
        console.log(`Task ${taskName} due in 3 days`);
        
        if (task.assigned_to) {
          notifications.push({
            project_task_id: task.id,
            user_id: task.assigned_to,
            notification_type: 'due_soon',
            message: `המשימה "${taskName}" בפרויקט "${projectName}" תסתיים בעוד 3 ימים`,
          });
        }
      }
      // Task due in 7 days
      else if (dueDate <= sevenDaysFromNow && dueDate > threeDaysFromNow) {
        console.log(`Task ${taskName} due in 7 days`);
        
        if (task.assigned_to) {
          notifications.push({
            project_task_id: task.id,
            user_id: task.assigned_to,
            notification_type: 'due_soon',
            message: `המשימה "${taskName}" בפרויקט "${projectName}" תסתיים בעוד שבוע`,
          });
        }
      }
    }

    // Check for completed dependencies
    const { data: dependencies, error: depsError } = await supabase
      .from('task_dependencies')
      .select(`
        id,
        task_id,
        depends_on_task_id,
        project_id
      `);

    if (!depsError && dependencies) {
      for (const dep of dependencies) {
        // Check if the dependency is now completed
        const { data: completedDep } = await supabase
          .from('project_tasks')
          .select(`completed, tasks!inner (name)`)
          .eq('task_id', dep.depends_on_task_id)
          .eq('project_id', dep.project_id)
          .maybeSingle();

        if (completedDep?.completed) {
          // Get the dependent task
          const { data: dependentTask } = await supabase
            .from('project_tasks')
            .select(`id, assigned_to, tasks!inner (name)`)
            .eq('task_id', dep.task_id)
            .eq('project_id', dep.project_id)
            .maybeSingle();

          if (dependentTask?.assigned_to) {
            const depTasks = dependentTask.tasks as any;
            const compTasks = completedDep.tasks as any;
            const taskName = depTasks?.name || 'משימה';
            const completedTaskName = compTasks?.name || 'משימה תלויה';
            
            notifications.push({
              project_task_id: dependentTask.id,
              user_id: dependentTask.assigned_to,
              notification_type: 'dependency_completed',
              message: `המשימה "${completedTaskName}" הושלמה! כעת ניתן להתחיל את "${taskName}"`,
            });
          }
        }
      }
    }

    // Insert all notifications
    if (notifications.length > 0) {
      console.log(`Inserting ${notifications.length} notifications`);
      
      const { error: insertError } = await supabase
        .from('task_notifications')
        .insert(notifications);

      if (insertError) {
        console.error('Error inserting notifications:', insertError);
        throw insertError;
      }

      console.log('Notifications inserted successfully');
    } else {
      console.log('No notifications to send');
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsCreated: notifications.length,
        message: `Created ${notifications.length} notifications`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in task-notifications function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
