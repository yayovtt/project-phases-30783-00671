import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Clock, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";

interface TaskTimeAnalyticsProps {
  projectId: string;
}

export function TaskTimeAnalytics({ projectId }: TaskTimeAnalyticsProps) {
  const { data: projectTasks } = useQuery({
    queryKey: ["project-tasks-analytics", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_tasks")
        .select(`
          *,
          tasks (
            name,
            estimated_hours,
            category_id,
            categories (name, display_name)
          )
        `)
        .eq("project_id", projectId);

      if (error) throw error;
      return data;
    },
  });

  // Calculate time comparison by category
  const categoryData = projectTasks?.reduce((acc: any[], task: any) => {
    const categoryName = task.tasks?.categories?.display_name || "ללא קטגוריה";
    const estimated = task.tasks?.estimated_hours || 0;
    const actual = task.actual_hours || 0;

    const existing = acc.find((item) => item.category === categoryName);
    if (existing) {
      existing.estimated += estimated;
      existing.actual += actual;
    } else {
      acc.push({ category: categoryName, estimated, actual });
    }
    return acc;
  }, []);

  // Calculate status distribution
  const statusData = projectTasks?.reduce(
    (acc: any, task: any) => {
      if (task.completed) {
        acc.find((s: any) => s.name === "הושלם").value++;
      } else if (
        task.due_date_override &&
        new Date(task.due_date_override) < new Date()
      ) {
        acc.find((s: any) => s.name === "באיחור").value++;
      } else {
        acc.find((s: any) => s.name === "בתהליך").value++;
      }
      return acc;
    },
    [
      { name: "הושלם", value: 0, color: "hsl(var(--chart-1))" },
      { name: "בתהליך", value: 0, color: "hsl(var(--chart-2))" },
      { name: "באיחור", value: 0, color: "hsl(var(--chart-3))" },
    ]
  );

  // Calculate KPIs
  const totalEstimated =
    projectTasks?.reduce(
      (sum, task: any) => sum + (task.tasks?.estimated_hours || 0),
      0
    ) || 0;
  const totalActual =
    projectTasks?.reduce((sum, task: any) => sum + (task.actual_hours || 0), 0) || 0;
  const completedTasks =
    projectTasks?.filter((task: any) => task.completed).length || 0;
  const totalTasks = projectTasks?.length || 0;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">שעות משוערות</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEstimated}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">שעות בפועל</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActual}h</div>
            <p className="text-xs text-muted-foreground">
              {totalEstimated > 0
                ? `${((totalActual / totalEstimated) * 100).toFixed(1)}% מהמשוער`
                : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">אחוז השלמה</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {completedTasks} מתוך {totalTasks} משימות
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">סטייה</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalEstimated > 0
                ? `${(((totalActual - totalEstimated) / totalEstimated) * 100).toFixed(1)}%`
                : "0%"}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalActual > totalEstimated ? "חריגה" : "חיסכון"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Time Comparison by Category */}
        <Card>
          <CardHeader>
            <CardTitle>השוואת זמנים לפי קטגוריה</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="estimated" fill="hsl(var(--chart-1))" name="משוער" />
                <Bar dataKey="actual" fill="hsl(var(--chart-2))" name="בפועל" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>התפלגות סטטוס משימות</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
