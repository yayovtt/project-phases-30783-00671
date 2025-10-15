import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LayoutGrid, List, GitBranch, Columns } from 'lucide-react';

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
  task_id: string;
  completed: boolean;
  status: string;
  notes: string | null;
}

interface WorkflowCategoriesProps {
  projectId: string;
}

type ViewMode = 'accordion' | 'flow' | 'vertical' | 'horizontal';

export const WorkflowCategories = ({ projectId }: WorkflowCategoriesProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('accordion');

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

  const renderAccordionView = () => (
    <Accordion type="multiple" className="space-y-4">
      {categories.map((category) => {
        const categoryTasks = tasks.filter((t) => t.category_id === category.id);
        const progress = getCategoryProgress(category.id);

        return (
          <AccordionItem
            key={category.id}
            value={category.id}
            className="border rounded-lg overflow-hidden"
          >
            <AccordionTrigger className="px-6 py-4 hover:bg-accent/50">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-3">
                  {category.color && (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                  )}
                  <span className="font-semibold text-lg">{category.display_name}</span>
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
            </AccordionTrigger>
            <AccordionContent className="px-6 py-4 bg-card">
              <div className="space-y-3">
                {categoryTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/30 transition-colors"
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
                    <div className="flex-1">
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
                          <Badge variant="destructive" className="text-xs">
                            חובה
                          </Badge>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );

  const renderFlowView = () => (
    <div className="relative">
      <div className="flex gap-8 overflow-x-auto pb-4">
        {categories.map((category, idx) => {
          const categoryTasks = tasks.filter((t) => t.category_id === category.id);
          const progress = getCategoryProgress(category.id);

          return (
            <div key={category.id} className="flex items-center gap-4">
              <Card className="min-w-[280px] flex-shrink-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {category.color && (
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                    )}
                    {category.display_name}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">{progress}%</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {categoryTasks.map((task) => (
                      <div key={task.id} className="flex items-start gap-2 p-2 rounded hover:bg-accent/30">
                        <Checkbox
                          checked={isTaskCompleted(task.id)}
                          onCheckedChange={(checked) =>
                            toggleTaskMutation.mutate({
                              taskId: task.id,
                              completed: checked as boolean,
                            })
                          }
                        />
                        <div className="flex-1">
                          <span className={`text-sm ${isTaskCompleted(task.id) ? 'line-through text-muted-foreground' : ''}`}>
                            {task.name}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              {idx < categories.length - 1 && (
                <div className="text-4xl text-muted-foreground">→</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderVerticalView = () => (
    <div className="grid gap-4">
      {categories.map((category) => {
        const categoryTasks = tasks.filter((t) => t.category_id === category.id);
        const progress = getCategoryProgress(category.id);

        return (
          <Card key={category.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {category.color && (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                  )}
                  {category.display_name}
                  <Badge variant="secondary">{categoryTasks.length}</Badge>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">{progress}%</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {categoryTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-2 rounded hover:bg-accent/30">
                    <Checkbox
                      checked={isTaskCompleted(task.id)}
                      onCheckedChange={(checked) =>
                        toggleTaskMutation.mutate({
                          taskId: task.id,
                          completed: checked as boolean,
                        })
                      }
                    />
                    <div className="flex-1">
                      <span className={`${isTaskCompleted(task.id) ? 'line-through text-muted-foreground' : ''}`}>
                        {task.name}
                      </span>
                      {task.is_required && (
                        <Badge variant="destructive" className="text-xs mr-2">חובה</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const renderHorizontalView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {categories.map((category) => {
        const categoryTasks = tasks.filter((t) => t.category_id === category.id);
        const progress = getCategoryProgress(category.id);

        return (
          <Card key={category.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {category.color && (
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                )}
                {category.display_name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{progress}%</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {categoryTasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-2">
                    <Checkbox
                      checked={isTaskCompleted(task.id)}
                      onCheckedChange={(checked) =>
                        toggleTaskMutation.mutate({
                          taskId: task.id,
                          completed: checked as boolean,
                        })
                      }
                      className="mt-0.5"
                    />
                    <span className={`text-sm ${isTaskCompleted(task.id) ? 'line-through text-muted-foreground' : ''}`}>
                      {task.name}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">שלבי עבודה</h2>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-background z-50">
            <DropdownMenuItem onClick={() => setViewMode('accordion')} className="cursor-pointer">
              <List className="h-4 w-4 ml-2" />
              תצוגת רשימה
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setViewMode('flow')} className="cursor-pointer">
              <GitBranch className="h-4 w-4 ml-2" />
              תרשים זרימה
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setViewMode('vertical')} className="cursor-pointer">
              <Columns className="h-4 w-4 ml-2 rotate-90" />
              תצוגה אנכית
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setViewMode('horizontal')} className="cursor-pointer">
              <Columns className="h-4 w-4 ml-2" />
              תצוגה אופקית
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {viewMode === 'accordion' && renderAccordionView()}
      {viewMode === 'flow' && renderFlowView()}
      {viewMode === 'vertical' && renderVerticalView()}
      {viewMode === 'horizontal' && renderHorizontalView()}
    </div>
  );
};
