import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, ArrowLeft, CheckCircle2, Circle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TaskNotesDialog } from './TaskNotesDialog';
import { RoadmapView } from './views/RoadmapView';

interface Category {
  id: string;
  name: string;
  display_name: string;
  order_index: number;
  color: string | null;
}

interface Task {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  order_index: number;
  is_required: boolean;
}

interface ProjectTask {
  id: string;
  task_id: string;
  completed: boolean;
  status: string;
  notes: string | null;
}

interface WorkflowCategoriesProps {
  projectId: string;
}

export const WorkflowCategories = ({ projectId }: WorkflowCategoriesProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<{
    id: string;
    name: string;
    notes: string | null;
  } | null>(null);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('order_index');

      if (error) throw error;
      return data as Category[];
    },
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('order_index');

      if (error) throw error;
      return data as Task[];
    },
  });

  const { data: projectTasks } = useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      return data as ProjectTask[];
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      const { error } = await supabase
        .from('project_tasks')
        .upsert({
          project_id: projectId,
          task_id: taskId,
          completed,
          status: completed ? 'completed' : 'pending',
          completed_at: completed ? new Date().toISOString() : null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      toast({
        title: 'עודכן בהצלחה',
        description: 'סטטוס המשימה עודכן',
      });
    },
    onError: (error) => {
      toast({
        title: 'שגיאה',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const isTaskCompleted = (taskId: string) => {
    return projectTasks?.find((pt) => pt.task_id === taskId)?.completed || false;
  };

  const getCategoryProgress = (categoryId: string) => {
    const categoryTasks = tasks?.filter((t) => t.category_id === categoryId) || [];
    if (categoryTasks.length === 0) return 0;

    const completed = categoryTasks.filter((t) => isTaskCompleted(t.id)).length;
    return Math.round((completed / categoryTasks.length) * 100);
  };

  const handleOpenNotes = (projectTaskId: string, taskName: string, currentNotes: string | null) => {
    setSelectedTask({ id: projectTaskId, name: taskName, notes: currentNotes });
    setNotesDialogOpen(true);
  };

  const getProjectTaskId = (taskId: string) => {
    return projectTasks?.find((pt) => pt.task_id === taskId)?.id || '';
  };

  const getCategoriesWithTasks = () => {
    if (!categories || !tasks || !projectTasks) return [];

    return categories.map((category) => ({
      ...category,
      tasks: tasks.filter((t) => t.category_id === category.id),
      projectTasks: projectTasks.filter((pt) =>
        tasks.some((t) => t.id === pt.task_id && t.category_id === category.id)
      ),
    }));
  };

  if (!categories || !tasks) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const categoriesWithTasks = getCategoriesWithTasks();

  return (
    <div className="space-y-6">
      <Tabs defaultValue="list" className="w-full" dir="rtl">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="list">רשימת משימות</TabsTrigger>
          <TabsTrigger value="flow">זרימה אופקית</TabsTrigger>
          <TabsTrigger value="vertical">זרימה אנכית</TabsTrigger>
          <TabsTrigger value="roadmap">מפת דרך</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {categories.map((category) => {
            const categoryTasks = tasks.filter((t) => t.category_id === category.id);
            const progress = getCategoryProgress(category.id);

            return (
              <Card key={category.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {category.color && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                      )}
                      <CardTitle>{category.display_name}</CardTitle>
                      <Badge variant="secondary">{categoryTasks.length} משימות</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{progress}%</span>
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categoryTasks.map((task) => {
                      const projectTask = projectTasks?.find((pt) => pt.task_id === task.id);
                      return (
                        <div
                          key={task.id}
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors group"
                        >
                          <Checkbox
                            checked={isTaskCompleted(task.id)}
                            onCheckedChange={(checked) =>
                              toggleTaskMutation.mutate({
                                taskId: task.id,
                                completed: checked as boolean,
                              })
                            }
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-medium ${
                                  isTaskCompleted(task.id)
                                    ? 'line-through text-muted-foreground'
                                    : ''
                                }`}
                              >
                                {task.name}
                              </span>
                              {task.is_required && (
                                <Badge variant="outline" className="text-xs">
                                  חובה
                                </Badge>
                              )}
                            </div>
                            {task.description && (
                              <p className="text-sm text-muted-foreground">
                                {task.description}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() =>
                              handleOpenNotes(
                                getProjectTaskId(task.id),
                                task.name,
                                projectTask?.notes || null
                              )
                            }
                          >
                            <MessageSquare className="h-4 w-4 ml-1" />
                            {projectTask?.notes && (
                              <Badge
                                variant="secondary"
                                className="mr-1 h-5 w-5 p-0 flex items-center justify-center rounded-full"
                              >
                                ✓
                              </Badge>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="flow">
          <div className="overflow-x-auto pb-8">
            <div className="flex items-center gap-8 min-w-max px-4">
              {categories.map((category, index) => {
                const categoryTasks = tasks.filter((t) => t.category_id === category.id);
                const completedTasks = categoryTasks.filter((t) => isTaskCompleted(t.id)).length;
                const totalTasks = categoryTasks.length;
                const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
                const isCompleted = completedTasks === totalTasks && totalTasks > 0;

                return (
                  <div key={category.id} className="flex items-center gap-4">
                    <Card
                      className={`w-80 transition-all duration-500 hover:shadow-2xl hover:scale-105 ${
                        isCompleted ? 'border-primary shadow-lg shadow-primary/20' : ''
                      }`}
                      style={{
                        borderColor: isCompleted ? category.color || undefined : undefined,
                      }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xl">{category.display_name}</CardTitle>
                          {isCompleted && (
                            <CheckCircle2 className="h-6 w-6 text-primary animate-pulse" />
                          )}
                        </div>
                        <CardDescription>
                          {completedTasks} מתוך {totalTasks} משימות הושלמו
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                            <div
                              className="absolute top-0 right-0 h-full bg-gradient-to-l from-primary to-primary/70 transition-all duration-700 rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="space-y-2">
                            {categoryTasks.slice(0, 3).map((task) => (
                              <div key={task.id} className="flex items-center gap-2 text-sm">
                                <Checkbox
                                  checked={isTaskCompleted(task.id)}
                                  onCheckedChange={(checked) =>
                                    toggleTaskMutation.mutate({
                                      taskId: task.id,
                                      completed: checked as boolean,
                                    })
                                  }
                                />
                                <span
                                  className={
                                    isTaskCompleted(task.id)
                                      ? 'line-through text-muted-foreground'
                                      : ''
                                  }
                                >
                                  {task.name}
                                </span>
                              </div>
                            ))}
                            {categoryTasks.length > 3 && (
                              <p className="text-xs text-muted-foreground mr-6">
                                + עוד {categoryTasks.length - 3} משימות
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {index < categories.length - 1 && (
                      <div className="flex items-center">
                        <ArrowLeft className="h-12 w-12 text-primary animate-pulse" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="vertical">
          <div className="max-w-3xl mx-auto space-y-8 px-4">
            {categories.map((category, index) => {
              const categoryTasks = tasks.filter((t) => t.category_id === category.id);
              const completedTasks = categoryTasks.filter((t) => isTaskCompleted(t.id)).length;
              const totalTasks = categoryTasks.length;
              const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
              const isCompleted = completedTasks === totalTasks && totalTasks > 0;

              return (
                <div key={category.id} className="relative">
                  {index < categories.length - 1 && (
                    <div className="absolute right-16 top-full h-8 w-1 bg-gradient-to-b from-primary to-primary/50" />
                  )}

                  <div className="flex items-start gap-6">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div
                        className={`w-32 h-32 rounded-full border-8 flex items-center justify-center transition-all duration-500 ${
                          isCompleted
                            ? 'bg-primary border-primary shadow-lg shadow-primary/50'
                            : 'bg-card border-border'
                        }`}
                        style={{
                          borderColor: category.color || undefined,
                        }}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-12 w-12 text-primary-foreground" />
                        ) : (
                          <span className="text-3xl font-bold">{index + 1}</span>
                        )}
                      </div>
                    </div>

                    <Card className="flex-1 hover:shadow-xl transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-2xl">{category.display_name}</CardTitle>
                        <CardDescription className="text-base">
                          {completedTasks} מתוך {totalTasks} משימות הושלמו
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                            <div
                              className="absolute top-0 right-0 h-full bg-gradient-to-l from-primary to-primary/70 transition-all duration-700 rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="grid gap-3">
                            {categoryTasks.map((task) => (
                              <div
                                key={task.id}
                                className="flex items-center gap-3 p-2 rounded hover:bg-accent/50"
                              >
                                <Checkbox
                                  checked={isTaskCompleted(task.id)}
                                  onCheckedChange={(checked) =>
                                    toggleTaskMutation.mutate({
                                      taskId: task.id,
                                      completed: checked as boolean,
                                    })
                                  }
                                />
                                <span
                                  className={
                                    isTaskCompleted(task.id)
                                      ? 'line-through text-muted-foreground'
                                      : ''
                                  }
                                >
                                  {task.name}
                                </span>
                                {task.is_required && (
                                  <Badge variant="outline" className="mr-auto text-xs">
                                    חובה
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="roadmap">
          <RoadmapView categories={categoriesWithTasks} />
        </TabsContent>
      </Tabs>

      {selectedTask && (
        <TaskNotesDialog
          projectTaskId={selectedTask.id}
          currentNotes={selectedTask.notes}
          taskName={selectedTask.name}
          isOpen={notesDialogOpen}
          onClose={() => {
            setNotesDialogOpen(false);
            setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
};
