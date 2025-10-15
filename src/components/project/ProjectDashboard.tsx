import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Calendar,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface ProjectDashboardProps {
  projectId: string;
}

export function ProjectDashboard({ projectId }: ProjectDashboardProps) {
  const { data: projectTasks } = useQuery({
    queryKey: ["project-dashboard", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_tasks")
        .select(`
          *,
          tasks (
            name,
            priority,
            estimated_hours,
            categories (display_name)
          ),
          profiles:assigned_to (
            full_name,
            email
          )
        `)
        .eq("project_id", projectId);

      if (error) throw error;
      return data;
    },
  });

  // Calculate KPIs
  const totalTasks = projectTasks?.length || 0;
  const completedTasks = projectTasks?.filter((t: any) => t.completed).length || 0;
  const inProgressTasks =
    projectTasks?.filter((t: any) => !t.completed && t.progress > 0).length || 0;
  const overdueTasks =
    projectTasks?.filter(
      (t: any) =>
        !t.completed &&
        t.due_date_override &&
        new Date(t.due_date_override) < new Date()
    ).length || 0;

  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const totalEstimated =
    projectTasks?.reduce(
      (sum, t: any) => sum + (t.tasks?.estimated_hours || 0),
      0
    ) || 0;
  const totalActual =
    projectTasks?.reduce((sum, t: any) => sum + (t.actual_hours || 0), 0) || 0;

  // Get upcoming tasks (next 5)
  const upcomingTasks = projectTasks
    ?.filter((t: any) => !t.completed && t.due_date_override)
    .sort(
      (a: any, b: any) =>
        new Date(a.due_date_override).getTime() -
        new Date(b.due_date_override).getTime()
    )
    .slice(0, 5);

  // Get team workload
  const teamWorkload = projectTasks?.reduce((acc: any[], task: any) => {
    if (task.assigned_to && task.profiles) {
      const existing = acc.find((item) => item.userId === task.assigned_to);
      if (existing) {
        existing.totalTasks++;
        if (task.completed) existing.completedTasks++;
      } else {
        acc.push({
          userId: task.assigned_to,
          name: task.profiles.full_name || task.profiles.email,
          totalTasks: 1,
          completedTasks: task.completed ? 1 : 0,
        });
      }
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">סה"כ משימות</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
            <Progress value={completionRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {completedTasks} הושלמו ({completionRate.toFixed(1)}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">בתהליך</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressTasks}</div>
            <p className="text-xs text-muted-foreground mt-2">
              משימות פעילות כעת
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">באיחור</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {overdueTasks}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              דורש טיפול מיידי
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">זמן פרויקט</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalActual}h / {totalEstimated}h
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {totalEstimated > 0
                ? `${((totalActual / totalEstimated) * 100).toFixed(1)}% מהזמן`
                : "אין הערכה"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              משימות קרובות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingTasks && upcomingTasks.length > 0 ? (
                upcomingTasks.map((task: any) => {
                  const isOverdue =
                    new Date(task.due_date_override) < new Date();
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{task.tasks?.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={isOverdue ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {format(
                              new Date(task.due_date_override),
                              "dd/MM/yyyy",
                              { locale: he }
                            )}
                          </Badge>
                          {task.profiles && (
                            <span className="text-xs text-muted-foreground">
                              {task.profiles.full_name || task.profiles.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm font-medium">{task.progress}%</div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  אין משימות קרובות
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Team Workload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              עומס צוות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {teamWorkload && teamWorkload.length > 0 ? (
                teamWorkload.map((member: any) => {
                  const completionRate =
                    (member.completedTasks / member.totalTasks) * 100;
                  return (
                    <div
                      key={member.userId}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{member.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{member.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={completionRate} className="flex-1" />
                          <span className="text-xs text-muted-foreground">
                            {member.completedTasks}/{member.totalTasks}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  אין משימות משויכות
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
