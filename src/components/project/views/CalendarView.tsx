import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, isSameDay, isPast, differenceInDays } from "date-fns";
import { he } from "date-fns/locale";
import { Clock, AlertCircle } from "lucide-react";
import { PriorityBadge } from "../PriorityBadge";

interface Task {
  id: string;
  name: string;
  category_id: string;
  due_date?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  estimated_hours?: number;
}

interface Category {
  id: string;
  name: string;
  display_name: string;
  color?: string;
  tasks: Task[];
}

interface ProjectTask {
  task_id: string;
  completed: boolean;
  due_date_override?: string;
  started_at?: string;
  actual_hours?: number;
}

interface CalendarViewProps {
  categories: Category[];
  projectTasks: ProjectTask[];
  isTaskCompleted: (taskId: string) => boolean;
}

export function CalendarView({ categories, projectTasks, isTaskCompleted }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Get all tasks with due dates
  const allTasks = categories.flatMap(cat => 
    cat.tasks.map(task => ({
      ...task,
      category: cat,
    }))
  );

  // Get tasks for selected date
  const tasksForSelectedDate = selectedDate
    ? allTasks.filter(task => {
        const projectTask = projectTasks.find(pt => pt.task_id === task.id);
        const dueDate = projectTask?.due_date_override || task.due_date;
        
        return dueDate && isSameDay(new Date(dueDate), selectedDate);
      })
    : [];

  // Get dates with tasks for calendar highlighting
  const datesWithTasks = allTasks
    .map(task => {
      const projectTask = projectTasks.find(pt => pt.task_id === task.id);
      const dueDate = projectTask?.due_date_override || task.due_date;
      return dueDate ? new Date(dueDate) : null;
    })
    .filter(Boolean) as Date[];

  const getTaskStatus = (task: Task) => {
    const projectTask = projectTasks.find(pt => pt.task_id === task.id);
    const dueDate = projectTask?.due_date_override || task.due_date;
    
    if (!dueDate) return null;
    
    const isCompleted = isTaskCompleted(task.id);
    const isOverdue = isPast(new Date(dueDate)) && !isCompleted;
    const daysUntilDue = differenceInDays(new Date(dueDate), new Date());
    const isUpcoming = daysUntilDue >= 0 && daysUntilDue <= 7 && !isCompleted;

    return { isCompleted, isOverdue, isUpcoming, daysUntilDue };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>לוח שנה</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={he}
            className="rounded-border"
            modifiers={{
              hasTask: datesWithTasks,
            }}
            modifiersStyles={{
              hasTask: {
                fontWeight: "bold",
                textDecoration: "underline",
              },
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {selectedDate
                ? format(selectedDate, "d MMMM yyyy", { locale: he })
                : "בחר תאריך"}
            </span>
            <Badge variant="secondary">{tasksForSelectedDate.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {tasksForSelectedDate.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>אין משימות לתאריך זה</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasksForSelectedDate.map(task => {
                  const status = getTaskStatus(task);
                  const isCompleted = isTaskCompleted(task.id);

                  return (
                    <Card
                      key={task.id}
                      className={`p-4 ${
                        isCompleted
                          ? "bg-muted/50 opacity-60"
                          : status?.isOverdue
                          ? "border-destructive bg-destructive/5"
                          : status?.isUpcoming
                          ? "border-orange-500/50 bg-orange-500/5"
                          : ""
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`font-medium ${isCompleted ? "line-through" : ""}`}>
                            {task.name}
                          </h4>
                          {status?.isOverdue && !isCompleted && (
                            <Badge variant="destructive" className="gap-1 shrink-0">
                              <AlertCircle className="h-3 w-3" />
                              באיחור
                            </Badge>
                          )}
                          {status?.isUpcoming && !isCompleted && (
                            <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 shrink-0">
                              בקרוב
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge
                            variant="outline"
                            style={{
                              backgroundColor: task.category.color
                                ? `${task.category.color}15`
                                : undefined,
                              borderColor: task.category.color || undefined,
                            }}
                          >
                            {task.category.display_name}
                          </Badge>

                          {task.priority && (
                            <PriorityBadge priority={task.priority} />
                          )}

                          {task.estimated_hours && (
                            <Badge variant="secondary" className="gap-1">
                              <Clock className="h-3 w-3" />
                              {task.estimated_hours} שעות
                            </Badge>
                          )}
                        </div>

                        {isCompleted && (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                            הושלם ✓
                          </Badge>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
