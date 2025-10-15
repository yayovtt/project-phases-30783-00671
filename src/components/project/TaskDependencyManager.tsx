import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, GitBranch } from "lucide-react";
import { toast } from "sonner";

interface TaskDependencyManagerProps {
  projectId: string;
  taskId: string;
  currentTaskName: string;
}

interface Dependency {
  id: string;
  depends_on_task_id: string;
  dependency_type: string;
  task_name: string;
}

export function TaskDependencyManager({
  projectId,
  taskId,
  currentTaskName,
}: TaskDependencyManagerProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [dependencyType, setDependencyType] = useState<string>("finish_to_start");
  const queryClient = useQueryClient();

  // Fetch available tasks
  const { data: availableTasks } = useQuery({
    queryKey: ["available-tasks", projectId, taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, name")
        .eq("category_id", (
          await supabase
            .from("project_tasks")
            .select("task_id, tasks(category_id)")
            .eq("task_id", taskId)
            .single()
        ).data?.tasks?.category_id || "")
        .neq("id", taskId)
        .order("order_index");

      if (error) throw error;
      return data;
    },
  });

  // Fetch current dependencies
  const { data: dependencies } = useQuery({
    queryKey: ["task-dependencies", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_dependencies")
        .select(`
          id,
          depends_on_task_id,
          dependency_type,
          tasks:depends_on_task_id (
            name
          )
        `)
        .eq("task_id", taskId);

      if (error) throw error;
      return data.map((dep: any) => ({
        id: dep.id,
        depends_on_task_id: dep.depends_on_task_id,
        dependency_type: dep.dependency_type,
        task_name: dep.tasks.name,
      })) as Dependency[];
    },
  });

  // Add dependency mutation
  const addDependency = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("task_dependencies").insert({
        project_id: projectId,
        task_id: taskId,
        depends_on_task_id: selectedTaskId,
        dependency_type: dependencyType,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-dependencies"] });
      setSelectedTaskId("");
      toast.success("התלות נוספה בהצלחה");
    },
    onError: () => {
      toast.error("שגיאה בהוספת תלות");
    },
  });

  // Remove dependency mutation
  const removeDependency = useMutation({
    mutationFn: async (dependencyId: string) => {
      const { error } = await supabase
        .from("task_dependencies")
        .delete()
        .eq("id", dependencyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-dependencies"] });
      toast.success("התלות הוסרה בהצלחה");
    },
    onError: () => {
      toast.error("שגיאה בהסרת תלות");
    },
  });

  const getDependencyTypeLabel = (type: string) => {
    switch (type) {
      case "finish_to_start":
        return "סיום → התחלה";
      case "start_to_start":
        return "התחלה → התחלה";
      case "finish_to_finish":
        return "סיום → סיום";
      default:
        return type;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4" />
        <Label>תלויות משימה</Label>
      </div>

      {/* Current dependencies */}
      {dependencies && dependencies.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            המשימה "{currentTaskName}" תלויה ב:
          </p>
          <div className="flex flex-wrap gap-2">
            {dependencies.map((dep) => (
              <Badge key={dep.id} variant="secondary" className="gap-2">
                {dep.task_name}
                <span className="text-xs text-muted-foreground">
                  ({getDependencyTypeLabel(dep.dependency_type)})
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeDependency.mutate(dep.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Add new dependency */}
      <div className="space-y-3 p-4 border rounded-lg bg-card">
        <Label>הוסף תלות חדשה</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
            <SelectTrigger>
              <SelectValue placeholder="בחר משימה" />
            </SelectTrigger>
            <SelectContent>
              {availableTasks?.map((task) => (
                <SelectItem key={task.id} value={task.id}>
                  {task.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dependencyType} onValueChange={setDependencyType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="finish_to_start">סיום → התחלה</SelectItem>
              <SelectItem value="start_to_start">התחלה → התחלה</SelectItem>
              <SelectItem value="finish_to_finish">סיום → סיום</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => addDependency.mutate()}
          disabled={!selectedTaskId || addDependency.isPending}
          className="w-full"
        >
          הוסף תלות
        </Button>
      </div>
    </div>
  );
}
