import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle, Clock, AlertCircle, TrendingUp, Calendar, Users, Target, Zap } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
interface ProjectDashboardProps {
  projectId: string;
}
export function ProjectDashboard({
  projectId
}: ProjectDashboardProps) {
  const {
    data: projectTasks
  } = useQuery({
    queryKey: ["project-dashboard", projectId],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("project_tasks").select(`
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
        `).eq("project_id", projectId);
      if (error) throw error;
      return data;
    }
  });

  // Calculate KPIs
  const totalTasks = projectTasks?.length || 0;
  const completedTasks = projectTasks?.filter((t: any) => t.completed).length || 0;
  const inProgressTasks = projectTasks?.filter((t: any) => !t.completed && t.progress > 0).length || 0;
  const overdueTasks = projectTasks?.filter((t: any) => !t.completed && t.due_date_override && new Date(t.due_date_override) < new Date()).length || 0;
  const completionRate = totalTasks > 0 ? completedTasks / totalTasks * 100 : 0;
  const totalEstimated = projectTasks?.reduce((sum, t: any) => sum + (t.tasks?.estimated_hours || 0), 0) || 0;
  const totalActual = projectTasks?.reduce((sum, t: any) => sum + (t.actual_hours || 0), 0) || 0;

  // Get upcoming tasks (next 5)
  const upcomingTasks = projectTasks?.filter((t: any) => !t.completed && t.due_date_override).sort((a: any, b: any) => new Date(a.due_date_override).getTime() - new Date(b.due_date_override).getTime()).slice(0, 5);

  // Get team workload
  const teamWorkload = projectTasks?.reduce((acc: any[], task: any) => {
    if (task.assigned_to && task.profiles) {
      const existing = acc.find(item => item.userId === task.assigned_to);
      if (existing) {
        existing.totalTasks++;
        if (task.completed) existing.completedTasks++;
      } else {
        acc.push({
          userId: task.assigned_to,
          name: task.profiles.full_name || task.profiles.email,
          totalTasks: 1,
          completedTasks: task.completed ? 1 : 0
        });
      }
    }
    return acc;
  }, []);
  return <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary overflow-hidden hover:shadow-xl transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">סה"כ משימות</CardTitle>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {totalTasks}
            </div>
            <Progress value={completionRate} className="mt-3 h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {completedTasks} הושלמו • {completionRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-info overflow-hidden hover:shadow-xl transition-all duration-300">
          
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">בתהליך</CardTitle>
            <div className="h-10 w-10 rounded-full bg-info/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-info" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-info">{inProgressTasks}</div>
            <p className="text-xs text-muted-foreground mt-3">
              משימות פעילות כרגע
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-warning overflow-hidden hover:shadow-xl transition-all duration-300">
          
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">באיחור</CardTitle>
            <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center animate-pulse">
              <AlertCircle className="h-5 w-5 text-warning" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-warning">{overdueTasks}</div>
            <p className="text-xs text-muted-foreground mt-3">
              דורש טיפול מיידי 🔔
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success overflow-hidden hover:shadow-xl transition-all duration-300">
          
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">זמן פרויקט</CardTitle>
            <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-success">
              {totalActual}h / {totalEstimated}h
            </div>
            <Progress value={totalEstimated > 0 ? totalActual / totalEstimated * 100 : 0} className="mt-3 h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {totalEstimated > 0 ? `${(totalActual / totalEstimated * 100).toFixed(1)}% מהזמן הושקע` : "אין הערכת זמן"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Tasks */}
        <Card className="animate-scale-in hover:shadow-xl transition-shadow">
          <CardHeader className="bg-gradient-subtle">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              משימות קרובות
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {upcomingTasks && upcomingTasks.length > 0 ? upcomingTasks.map((task: any, index: number) => {
              const isOverdue = new Date(task.due_date_override) < new Date();
              return <div key={task.id} className="flex items-center justify-between p-4 border rounded-xl hover:shadow-md hover:scale-[1.02] transition-all duration-300 bg-gradient-to-l from-transparent to-primary/5" style={{
                animationDelay: `${index * 0.1}s`
              }}>
                      <div className="flex-1">
                        <p className="font-semibold text-sm mb-2">{task.tasks?.name}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={isOverdue ? "destructive" : "secondary"} className="text-xs animate-fade-in">
                            {isOverdue && "⚠️ "}
                            {format(new Date(task.due_date_override), "dd/MM/yyyy", {
                        locale: he
                      })}
                          </Badge>
                          {task.profiles && <Badge variant="outline" className="text-xs">
                              👤 {task.profiles.full_name || task.profiles.email}
                            </Badge>}
                        </div>
                      </div>
                      <div className="text-center mr-4">
                        <div className="text-2xl font-bold text-primary">{task.progress}%</div>
                        <Progress value={task.progress} className="w-16 h-2 mt-1" />
                      </div>
                    </div>;
            }) : <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-success mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    אין משימות קרובות
                  </p>
                </div>}
            </div>
          </CardContent>
        </Card>

        {/* Team Workload */}
        <Card className="animate-scale-in hover:shadow-xl transition-shadow">
          <CardHeader className="bg-gradient-subtle">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              עומס צוות
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {teamWorkload && teamWorkload.length > 0 ? teamWorkload.map((member: any, index: number) => {
              const completionRate = member.completedTasks / member.totalTasks * 100;
              return <div key={member.userId} className="flex items-center gap-3 p-4 border rounded-xl hover:shadow-md hover:scale-[1.02] transition-all duration-300 bg-gradient-to-l from-transparent to-accent/5" style={{
                animationDelay: `${index * 0.1}s`
              }}>
                      <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                        <AvatarFallback className="bg-gradient-primary text-white font-bold">
                          {member.name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold text-sm mb-2">{member.name}</p>
                        <div className="flex items-center gap-2">
                          <Progress value={completionRate} className="flex-1 h-2" />
                          <Badge variant="secondary" className="text-xs">
                            {member.completedTasks}/{member.totalTasks}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${completionRate === 100 ? 'text-success' : 'text-primary'}`}>
                          {completionRate.toFixed(0)}%
                        </div>
                      </div>
                    </div>;
            }) : <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    אין משימות משויכות לצוות
                  </p>
                </div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
}