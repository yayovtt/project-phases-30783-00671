import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, differenceInDays, addDays } from "date-fns";
import { he } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface GanttViewProps {
  projectId: string;
}

export function GanttView({ projectId }: GanttViewProps) {
  const { data: projectTasks, isLoading } = useQuery({
    queryKey: ["project-tasks-gantt", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_tasks")
        .select(`
          *,
          tasks (
            name,
            priority,
            category_id,
            categories (name, display_name, color)
          )
        `)
        .eq("project_id", projectId)
        .not("started_at", "is", null)
        .not("due_date_override", "is", null)
        .order("started_at");

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="text-center p-8">טוען...</div>;
  }

  if (!projectTasks || projectTasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          אין משימות עם תאריכי התחלה וסיום מוגדרים
        </CardContent>
      </Card>
    );
  }

  // Calculate timeline boundaries
  const allDates = projectTasks.flatMap((task: any) => [
    new Date(task.started_at),
    new Date(task.due_date_override),
  ]);
  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));
  const totalDays = differenceInDays(maxDate, minDate) + 1;

  // Generate week markers
  const weeks = [];
  let currentWeekStart = minDate;
  while (currentWeekStart <= maxDate) {
    weeks.push(currentWeekStart);
    currentWeekStart = addDays(currentWeekStart, 7);
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getTaskPosition = (startDate: string, dueDate: string) => {
    const start = new Date(startDate);
    const end = new Date(dueDate);
    const startOffset = differenceInDays(start, minDate);
    const duration = differenceInDays(end, start) + 1;

    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
    };
  };

  const today = new Date();
  const todayPosition = differenceInDays(today, minDate);
  const todayPercent = (todayPosition / totalDays) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          תצוגת Gantt - לוח זמנים
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Timeline header */}
            <div className="relative h-12 border-b mb-4">
              <div className="flex h-full">
                {weeks.map((week, index) => (
                  <div
                    key={index}
                    className="flex-1 text-center text-xs text-muted-foreground border-l p-1"
                  >
                    {format(week, "dd/MM", { locale: he })}
                  </div>
                ))}
              </div>
              {/* Today marker */}
              {todayPercent >= 0 && todayPercent <= 100 && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                  style={{ left: `${todayPercent}%` }}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-xs text-red-500 whitespace-nowrap">
                    היום
                  </div>
                </div>
              )}
            </div>

            {/* Tasks */}
            <div className="space-y-2">
              {projectTasks.map((task: any) => {
                const position = getTaskPosition(
                  task.started_at,
                  task.due_date_override
                );
                const isOverdue =
                  !task.completed &&
                  new Date(task.due_date_override) < new Date();

                return (
                  <div key={task.id} className="relative h-12">
                    {/* Task name */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-48 pr-2 text-sm truncate">
                      {task.tasks?.name}
                    </div>

                    {/* Task bar */}
                    <div className="relative h-full pr-52">
                      <div
                        className={cn(
                          "absolute top-1/2 -translate-y-1/2 h-8 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md",
                          getPriorityColor(task.tasks?.priority || "medium"),
                          task.completed && "opacity-50",
                          isOverdue && !task.completed && "ring-2 ring-red-500"
                        )}
                        style={position}
                      >
                        <div className="h-full flex items-center justify-center px-2">
                          <span className="text-xs text-white font-medium truncate">
                            {task.progress}%
                          </span>
                        </div>
                        {/* Progress overlay */}
                        {task.progress > 0 && task.progress < 100 && (
                          <div
                            className="absolute top-0 right-0 bottom-0 bg-white/30 rounded-r-lg"
                            style={{ width: `${100 - task.progress}%` }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span>דחוף</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-orange-500" />
                <span>גבוה</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-yellow-500" />
                <span>בינוני</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span>נמוך</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-0.5 h-3 bg-red-500" />
                <span>היום</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
