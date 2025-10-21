import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSyncedQuery } from '@/hooks/useSyncedQuery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, ArrowRight, CheckCircle2, Circle, Settings, Download, Upload, Database, Calendar as CalendarIcon, Bell, Clock, BarChart3, Map, FileSpreadsheet, Edit3, Trash2, Plus, Palette } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { TaskNotesDialog } from './TaskNotesDialog';
import { RoadmapView } from './views/RoadmapView';
import { TimelineView } from './views/TimelineView';
import { CategoryManagementDialog } from './CategoryManagementDialog';
import { CategorySelector } from './CategorySelector';
import { TaskManagementDialog } from './TaskManagementDialog';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { TaskFilters } from './TaskFilters';
import { OfflineIndicator } from '@/components/ui/offline-indicator';
import { ExportImport } from './ExportImport';
import { BackupRestore } from './BackupRestore';
import { CalendarView } from './views/CalendarView';
import { ReminderManager } from '@/components/reminders/ReminderManager';
import { ReminderNotification } from '@/components/reminders/ReminderNotification';
import { useReminders } from '@/hooks/useReminders';
import { TaskScheduler } from './TaskScheduler';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TaskTimeAnalytics } from './TaskTimeAnalytics';
import { ProjectTimeline } from './ProjectTimeline';
import { GanttView } from './views/GanttView';
import { ProjectDashboard } from './ProjectDashboard';
import { KanbanBoard } from './KanbanBoard';
import { CommandPalette } from './CommandPalette';
import { MobileBottomNav } from './MobileBottomNav';
import { SpreadsheetView } from './SpreadsheetView';

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
  due_date?: string | null;
  estimated_hours?: number | null;
  priority?: "low" | "medium" | "high" | "urgent";
}

interface ProjectTask {
  id: string;
  task_id: string;
  completed: boolean;
  status: string;
  notes: string | null;
  started_at?: string | null;
  due_date_override?: string | null;
  actual_hours?: number | null;
}

interface WorkflowCategoriesProps {
  projectId: string;
}

export const WorkflowCategories = ({ projectId }: WorkflowCategoriesProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useIsAdmin();

  // Fetch project data for timeline
  const { data: projectData } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [categoryManagementOpen, setCategoryManagementOpen] = useState(false);
  const [categorySelectorOpen, setCategorySelectorOpen] = useState(false);
  const [taskManagementOpen, setTaskManagementOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [selectedTaskForReminder, setSelectedTaskForReminder] = useState<{
    projectTaskId: string;
    taskName: string;
  } | null>(null);
  const [selectedCategoryForTasks, setSelectedCategoryForTasks] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedTask, setSelectedTask] = useState<{
    id: string;
    name: string;
    notes: string | null;
  } | null>(null);
  const [schedulerDialogOpen, setSchedulerDialogOpen] = useState(false);
  const [selectedTaskForScheduler, setSelectedTaskForScheduler] = useState<{
    projectTaskId: string;
    taskId: string;
    taskName: string;
  } | null>(null);
  const [activeView, setActiveView] = useState('tasks');

  const { activeReminders, dismissReminder } = useReminders();

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [requiredOnly, setRequiredOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: categories } = useSyncedQuery({
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

  const { data: tasks } = useSyncedQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      // Only fetch tasks that are linked to this project
      const { data: projectTasksIds, error: ptError } = await supabase
        .from('project_tasks')
        .select('task_id')
        .eq('project_id', projectId);
      
      if (ptError) throw ptError;
      
      const taskIds = projectTasksIds?.map(pt => pt.task_id) || [];
      
      if (taskIds.length === 0) {
        return [] as Task[];
      }
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .in('id', taskIds)
        .order('order_index');

      if (error) throw error;
      return data as Task[];
    },
  });

  const { data: projectTasks } = useSyncedQuery({
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
      const now = new Date().toISOString();
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('project_tasks')
        .upsert({
          project_id: projectId,
          task_id: taskId,
          completed,
          status: completed ? 'completed' : 'pending',
          completed_at: completed ? now : null,
          completed_by: completed ? user?.id : null,
          started_at: completed ? now : undefined
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

  // Filter functions
  const filterTasks = () => {
    if (!tasks) return [];

    return tasks.filter((task) => {
      // Search filter
      if (searchQuery && !task.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && task.category_id !== selectedCategory) {
        return false;
      }

      // Required filter
      if (requiredOnly && !task.is_required) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const isCompleted = isTaskCompleted(task.id);
        if (statusFilter === 'completed' && !isCompleted) return false;
        if (statusFilter === 'pending' && isCompleted) return false;
      }

      return true;
    });
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setRequiredOnly(false);
    setStatusFilter('all');
  };

  const filteredTasks = filterTasks();

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

  const handleOpenTaskManagement = (categoryId: string, categoryName: string) => {
    setSelectedCategoryForTasks({ id: categoryId, name: categoryName });
    setTaskManagementOpen(true);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <OfflineIndicator />
      

      <TaskFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        requiredOnly={requiredOnly}
        onRequiredOnlyChange={setRequiredOnly}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        categories={categories || []}
        totalResults={filteredTasks.length}
        onReset={resetFilters}
      />

      <Tabs defaultValue="list" className="w-full" dir="rtl">
        <TabsList className="hidden md:inline-flex h-auto items-center justify-center rounded-xl bg-gradient-to-r from-card to-card/80 backdrop-blur-sm shadow-lg border-2 border-primary/10 p-2 text-muted-foreground w-full flex-wrap gap-1" dir="rtl">
          <TabsTrigger 
            value="dashboard" 
            className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow transition-all duration-300 hover:scale-105 rounded-lg font-semibold py-2.5"
          >
            <BarChart3 className="h-4 w-4 ml-1" />
            דשבורד
          </TabsTrigger>
          <TabsTrigger 
            value="list" 
            className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow transition-all duration-300 hover:scale-105 rounded-lg font-semibold py-2.5"
          >
            משימות
          </TabsTrigger>
          <TabsTrigger 
            value="kanban" 
            className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow transition-all duration-300 hover:scale-105 rounded-lg font-semibold py-2.5"
          >
            <Map className="h-4 w-4 ml-1" />
            קנבן
          </TabsTrigger>
          <TabsTrigger 
            value="gantt" 
            className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow transition-all duration-300 hover:scale-105 rounded-lg font-semibold py-2.5"
          >
            Gantt
          </TabsTrigger>
          <TabsTrigger 
            value="calendar" 
            className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow transition-all duration-300 hover:scale-105 rounded-lg font-semibold py-2.5"
          >
            <CalendarIcon className="h-4 w-4 ml-1" />
            לוח שנה
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow transition-all duration-300 hover:scale-105 rounded-lg font-semibold py-2.5"
          >
            אנליטיקס
          </TabsTrigger>
          <TabsTrigger 
            value="time-tracking" 
            className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow transition-all duration-300 hover:scale-105 rounded-lg font-semibold py-2.5"
          >
            <Clock className="h-4 w-4 ml-1" />
            מעקב זמנים
          </TabsTrigger>
          <TabsTrigger 
            value="timeline" 
            className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow transition-all duration-300 hover:scale-105 rounded-lg font-semibold py-2.5"
          >
            ציר זמן
          </TabsTrigger>
          <TabsTrigger 
            value="roadmap" 
            className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow transition-all duration-300 hover:scale-105 rounded-lg font-semibold py-2.5"
          >
            מפת דרך
          </TabsTrigger>
          <TabsTrigger 
            value="spreadsheet" 
            className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow transition-all duration-300 hover:scale-105 rounded-lg font-semibold py-2.5"
          >
            <FileSpreadsheet className="h-4 w-4 ml-1" />
            טבלה
          </TabsTrigger>
          <TabsTrigger 
            value="export" 
            className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow transition-all duration-300 hover:scale-105 rounded-lg font-semibold py-2.5"
          >
            <Download className="h-4 w-4 ml-1" />
            יצוא/יבוא
          </TabsTrigger>
        </TabsList>
        
        <MobileBottomNav activeTab={activeView} onTabChange={setActiveView} />

        <TabsContent value="dashboard" className="space-y-4">
          <ProjectDashboard projectId={projectId} />
        </TabsContent>

        <TabsContent value="gantt" className="space-y-4">
          <GanttView projectId={projectId} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <TaskTimeAnalytics projectId={projectId} />
        </TabsContent>

        <TabsContent value="kanban" className="space-y-4">
          <KanbanBoard
            projectId={projectId}
            tasks={filteredTasks.map(task => ({
              id: task.id,
              name: task.name,
              status: projectTasks?.find(pt => pt.task_id === task.id)?.status || 'pending',
              priority: task.priority,
              dueDate: task.due_date,
            }))}
            allTasks={tasks}
            categories={categories}
            onStatusChange={async (taskId, newStatus) => {
              const existing = projectTasks?.find(pt => pt.task_id === taskId);
              
              // Optimistic update
              queryClient.setQueryData(['project-tasks', projectId], (old: any) => {
                if (!old) return old;
                if (existing) {
                  return old.map((pt: any) =>
                    pt.id === existing.id ? { ...pt, status: newStatus } : pt
                  );
                } else {
                  return [
                    ...old,
                    {
                      id: `temp-${taskId}`,
                      project_id: projectId,
                      task_id: taskId,
                      status: newStatus,
                      completed: newStatus === 'completed',
                      notes: null,
                    },
                  ];
                }
              });
              
              if (existing) {
                await supabase
                  .from('project_tasks')
                  .update({ status: newStatus })
                  .eq('id', existing.id);
              } else {
                await supabase
                  .from('project_tasks')
                  .insert({
                    project_id: projectId,
                    task_id: taskId,
                    status: newStatus,
                  });
              }
              queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
            }}
            onTaskClick={(task) => {
              setSelectedTask({ id: task.id, name: task.name, notes: null });
              setNotesDialogOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          {isAdmin && (
            <div className="flex flex-row-reverse gap-2 mb-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2 gap-1"
                onClick={() => setCategorySelectorOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="text-xs">קטגוריה</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2" 
                title="עריכה"
                onClick={() => setCategoryManagementOpen(true)}
              >
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2" 
                title="מחיקה"
                onClick={() => setCategoryManagementOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          
          {categories.map((category) => {
            const categoryTasks = filteredTasks.filter((t) => t.category_id === category.id);
            if (categoryTasks.length === 0) return null;
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleOpenTaskManagement(category.id, category.display_name)}
                        title="הוסף משימה"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
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
                           <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                setSelectedTaskForScheduler({
                                  projectTaskId: getProjectTaskId(task.id),
                                  taskId: task.id,
                                  taskName: task.name,
                                });
                                setSchedulerDialogOpen(true);
                              }}
                              title="תזמון משימה"
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                setSelectedTaskForReminder({
                                  projectTaskId: getProjectTaskId(task.id),
                                  taskName: task.name,
                                });
                                setReminderDialogOpen(true);
                              }}
                              title="הגדר תזכורת"
                            >
                              <Bell className="h-4 w-4" />
                            </Button>
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
                              title="הערות"
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
                            {isAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                                  onClick={() => {
                                    // TODO: Add edit task functionality
                                    toast({
                                      title: 'בקרוב',
                                      description: 'עריכת משימה תהיה זמינה בקרוב',
                                    });
                                  }}
                                  title="ערוך משימה"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                  onClick={() => {
                                    // TODO: Add delete task functionality
                                    toast({
                                      title: 'בקרוב',
                                      description: 'מחיקת משימה תהיה זמינה בקרוב',
                                    });
                                  }}
                                  title="מחק משימה"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
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
                        <ArrowRight className="h-12 w-12 text-primary animate-pulse rotate-180" />
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

        <TabsContent value="timeline">
          <TimelineView
            categories={categories.map((category) => ({
              ...category,
              tasks: tasks.filter((t) => t.category_id === category.id),
            }))}
            isTaskCompleted={isTaskCompleted}
            onToggleTask={(taskId, completed) =>
              toggleTaskMutation.mutate({ taskId, completed })
            }
            onOpenTaskManagement={handleOpenTaskManagement}
            onOpenCategoryManagement={() => setCategoryManagementOpen(true)}
          />
        </TabsContent>

        <TabsContent value="time-tracking">
          {projectData && categories && tasks && projectTasks && (
            <ProjectTimeline 
              project={projectData}
              categories={categories}
              allTasks={tasks}
              projectTasks={projectTasks}
            />
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <CalendarView
            categories={categories.map((category) => ({
              ...category,
              tasks: tasks.filter((t) => t.category_id === category.id),
            }))}
            projectTasks={projectTasks || []}
            isTaskCompleted={isTaskCompleted}
          />
        </TabsContent>

        <TabsContent value="roadmap">
          <RoadmapView 
            categories={categoriesWithTasks} 
            projectId={projectId}
            tasks={tasks}
          />
        </TabsContent>

        <TabsContent value="spreadsheet" className="mt-6">
          <SpreadsheetView projectId={projectId} />
        </TabsContent>

        <TabsContent value="export" className="mt-6">
          <ExportImport projectId={projectId} />
        </TabsContent>

        <TabsContent value="backup" className="mt-6">
          <BackupRestore projectId={projectId} />
        </TabsContent>
      </Tabs>

      {/* Active Reminders */}
      {activeReminders.map((reminder) => (
        <ReminderNotification
          key={reminder.id}
          message={reminder.message || "הגיע הזמן!"}
          soundUrl={reminder.sound_url}
          onDismiss={() => dismissReminder(reminder.id)}
        />
      ))}

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

      {selectedTaskForReminder && (
        <ReminderManager
          projectTaskId={selectedTaskForReminder.projectTaskId}
          taskName={selectedTaskForReminder.taskName}
          isOpen={reminderDialogOpen}
          onClose={() => {
            setReminderDialogOpen(false);
            setSelectedTaskForReminder(null);
          }}
        />
      )}

      {isAdmin && categories && (
        <CategoryManagementDialog
          isOpen={categoryManagementOpen}
          onClose={() => setCategoryManagementOpen(false)}
          categories={categories}
        />
      )}

      {isAdmin && (
        <CategorySelector
          isOpen={categorySelectorOpen}
          onClose={() => setCategorySelectorOpen(false)}
          onSelectCategory={(categoryId, categoryName) => {
            setSelectedCategoryForTasks({ id: categoryId, name: categoryName });
            setTaskManagementOpen(true);
          }}
        />
      )}

      {isAdmin && selectedCategoryForTasks && tasks && (
        <TaskManagementDialog
          isOpen={taskManagementOpen}
          onClose={() => {
            setTaskManagementOpen(false);
            setSelectedCategoryForTasks(null);
          }}
          categoryId={selectedCategoryForTasks.id}
          categoryName={selectedCategoryForTasks.name}
          tasks={tasks}
          projectId={projectId}
        />
      )}

      {selectedTaskForScheduler && (
        <Dialog open={schedulerDialogOpen} onOpenChange={setSchedulerDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>תזמון משימה: {selectedTaskForScheduler.taskName}</DialogTitle>
            </DialogHeader>
            <TaskScheduler
              projectId={projectId}
              taskId={selectedTaskForScheduler.taskId}
              taskName={selectedTaskForScheduler.taskName}
              currentDueDate={
                projectTasks?.find((pt) => pt.id === selectedTaskForScheduler.projectTaskId)
                  ?.due_date_override || undefined
              }
              currentStartedAt={
                projectTasks?.find((pt) => pt.id === selectedTaskForScheduler.projectTaskId)
                  ?.started_at || undefined
              }
              currentEstimatedHours={
                tasks?.find((t) => t.id === selectedTaskForScheduler.taskId)?.estimated_hours ||
                undefined
              }
              currentActualHours={
                projectTasks?.find((pt) => pt.id === selectedTaskForScheduler.projectTaskId)
                  ?.actual_hours || undefined
              }
              currentProgress={
                (projectTasks?.find((pt) => pt.id === selectedTaskForScheduler.projectTaskId) as any)
                  ?.progress || 0
              }
              currentAssignedTo={
                (projectTasks?.find((pt) => pt.id === selectedTaskForScheduler.projectTaskId) as any)
                  ?.assigned_to || undefined
              }
              currentPriority={
                tasks?.find((t) => t.id === selectedTaskForScheduler.taskId)?.priority
              }
              onUpdate={async (data) => {
                const { error } = await supabase
                  .from('project_tasks')
                  .update(data)
                  .eq('id', selectedTaskForScheduler.projectTaskId);

                if (error) {
                  toast({
                    title: 'שגיאה',
                    description: error.message,
                    variant: 'destructive',
                  });
                } else {
                  queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
                  toast({
                    title: 'עודכן בהצלחה',
                    description: 'תזמון המשימה עודכן',
                  });
                  setSchedulerDialogOpen(false);
                  setSelectedTaskForScheduler(null);
                }
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
