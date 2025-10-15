import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Circle, Clock, AlertCircle, MoreVertical, Plus, Settings, Trash2, Edit, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { TaskManagementDialog } from './TaskManagementDialog';
import { CategoryManagementDialog } from './CategoryManagementDialog';
import { ReminderManager } from '@/components/reminders/ReminderManager';

interface Task {
  id: string;
  name: string;
  status: string;
  priority?: "low" | "medium" | "high" | "urgent";
  assignedTo?: string;
  dueDate?: string;
}

interface KanbanBoardProps {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: string) => void;
  onTaskClick: (task: Task) => void;
  projectId?: string;
  allTasks?: any[];
  categories?: any[];
}

interface KanbanStatus {
  id: string;
  name: string;
  label: string;
  color: string;
  order_index: number;
  icon: string;
  project_id?: string;
}

const iconMap: Record<string, any> = {
  'circle': Circle,
  'clock': Clock,
  'alert-circle': AlertCircle,
  'check-circle-2': CheckCircle2,
};

const priorityColors = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-info text-white',
  high: 'bg-warning text-white',
  urgent: 'bg-destructive text-white',
};

export const KanbanBoard = ({ tasks, onStatusChange, onTaskClick, projectId, allTasks = [], categories = [] }: KanbanBoardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useIsAdmin();
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [newStatusLabel, setNewStatusLabel] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#6B7280');
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [selectedProjectTaskId, setSelectedProjectTaskId] = useState<string | null>(null);

  const { data: statuses = [] } = useQuery({
    queryKey: ['kanban-statuses', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kanban_statuses')
        .select('*')
        .or(projectId ? `project_id.is.null,project_id.eq.${projectId}` : 'project_id.is.null')
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      return data as KanbanStatus[];
    },
  });

  const createStatusMutation = useMutation({
    mutationFn: async (newStatus: { label: string; color: string }) => {
      const maxOrder = Math.max(...statuses.map(s => s.order_index), 0);
      const { error } = await supabase
        .from('kanban_statuses')
        .insert({
          name: newStatus.label.toLowerCase().replace(/\s+/g, '_'),
          label: newStatus.label,
          color: newStatus.color,
          order_index: maxOrder + 1,
          icon: 'circle',
          project_id: projectId || null,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-statuses', projectId] });
      setNewStatusLabel('');
      setNewStatusColor('#6B7280');
      toast({
        title: 'נוסף בהצלחה',
        description: 'הסטטוס החדש נוסף ללוח',
      });
    },
    onError: (error) => {
      toast({
        title: 'שגיאה',
        description: 'לא ניתן להוסיף סטטוס',
        variant: 'destructive',
      });
      console.error('Error creating status:', error);
    },
  });

  const deleteStatusMutation = useMutation({
    mutationFn: async (statusId: string) => {
      const { error } = await supabase
        .from('kanban_statuses')
        .delete()
        .eq('id', statusId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-statuses', projectId] });
      toast({
        title: 'נמחק בהצלחה',
        description: 'הסטטוס הוסר מהלוח',
      });
    },
    onError: (error) => {
      toast({
        title: 'שגיאה',
        description: 'לא ניתן למחוק סטטוס',
        variant: 'destructive',
      });
      console.error('Error deleting status:', error);
    },
  });

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (status: string) => {
    if (draggedTask) {
      onStatusChange(draggedTask.id, status);
      setDraggedTask(null);
    }
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  const handleAddStatus = () => {
    if (!newStatusLabel.trim()) {
      toast({
        title: 'שגיאה',
        description: 'יש להזין שם לסטטוס',
        variant: 'destructive',
      });
      return;
    }

    createStatusMutation.mutate({
      label: newStatusLabel,
      color: newStatusColor,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button onClick={() => setCategoryDialogOpen(true)} variant="outline" size="sm">
          <Plus className="h-4 w-4 ml-1" />
          הוסף קטגוריה
        </Button>
        {isAdmin && (
          <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 ml-1" />
                ניהול סטטוסים
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" dir="rtl">
              <DialogHeader>
                <DialogTitle>ניהול סטטוסים בלוח קנבן</DialogTitle>
                <DialogDescription>
                  הוסף, ערוך או מחק סטטוסים בלוח הקנבן
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 pt-4">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">הוספת סטטוס חדש</h3>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Label htmlFor="status-label">שם הסטטוס</Label>
                      <Input
                        id="status-label"
                        value={newStatusLabel}
                        onChange={(e) => setNewStatusLabel(e.target.value)}
                        placeholder="לדוגמה: בבדיקת איכות"
                      />
                    </div>
                    <div className="w-32">
                      <Label htmlFor="status-color">צבע</Label>
                      <div className="flex gap-2">
                        <Input
                          id="status-color"
                          type="color"
                          value={newStatusColor}
                          onChange={(e) => setNewStatusColor(e.target.value)}
                          className="h-10 w-16 p-1"
                        />
                        <div
                          className="h-10 w-10 rounded border"
                          style={{ backgroundColor: newStatusColor }}
                        />
                      </div>
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleAddStatus} disabled={createStatusMutation.isPending}>
                        <Plus className="h-4 w-4 ml-1" />
                        הוסף
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">סטטוסים קיימים</h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {statuses.map((status) => (
                      <div
                        key={status.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: status.color }}
                          />
                          <span className="font-medium">{status.label}</span>
                          {status.project_id && (
                            <Badge variant="secondary" className="text-xs">מותאם אישית</Badge>
                          )}
                        </div>
                        {status.project_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteStatusMutation.mutate(status.id)}
                            disabled={deleteStatusMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-6" style={{ gridTemplateColumns: `repeat(${statuses.length}, minmax(0, 1fr))` }}>
        {statuses.map((statusConfig) => {
          const statusTasks = getTasksByStatus(statusConfig.name);
          const StatusIcon = iconMap[statusConfig.icon] || Circle;

          return (
            <div
              key={statusConfig.id}
              className="flex flex-col gap-3 min-w-[250px]"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(statusConfig.name)}
            >
              <Card className="border-2 animate-fade-in">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      <StatusIcon 
                        className="h-4 w-4" 
                        style={{ color: statusConfig.color }}
                      />
                      <span>{statusConfig.label}</span>
                    </div>
                    <Badge variant="secondary" className="rounded-full">
                      {statusTasks.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
              </Card>

              <div className="flex flex-col gap-2 min-h-[200px]">
                {statusTasks.map(task => (
                  <Card
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task)}
                    className={cn(
                      "cursor-move hover:scale-[1.02] transition-transform",
                      draggedTask?.id === task.id && "opacity-50"
                    )}
                    style={{ 
                      backgroundColor: `${statusConfig.color}15`,
                      borderLeft: `3px solid ${statusConfig.color}`
                    }}
                    onClick={() => onTaskClick(task)}
                  >
                     <CardContent className="p-4">
                       <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-medium text-sm line-clamp-2">{task.name}</h4>
                         <div className="flex gap-1">
                           <Button
                             variant="ghost"
                             size="icon"
                             className="h-6 w-6"
                             onClick={(e) => {
                               e.stopPropagation();
                               const projectTask = tasks.find(t => t.id === task.id);
                               if (projectTask) {
                                 setSelectedProjectTaskId(projectTask.id);
                                 setReminderDialogOpen(true);
                               }
                             }}
                           >
                             <Bell className="h-3 w-3" />
                           </Button>
                           <DropdownMenu>
                             <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                               <Button variant="ghost" size="icon" className="h-6 w-6">
                                 <MoreVertical className="h-4 w-4" />
                               </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent align="end" className="bg-popover z-50">
                               {statuses.map((newStatus) => (
                                 newStatus.name !== statusConfig.name && (
                                   <DropdownMenuItem
                                     key={newStatus.id}
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       onStatusChange(task.id, newStatus.name);
                                     }}
                                   >
                                     העבר ל{newStatus.label}
                                   </DropdownMenuItem>
                                 )
                               ))}
                             </DropdownMenuContent>
                           </DropdownMenu>
                         </div>
                       </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {task.priority && (
                          <Badge className={cn("text-xs", priorityColors[task.priority])}>
                            {task.priority === 'urgent' ? 'דחוף' : 
                             task.priority === 'high' ? 'גבוה' :
                             task.priority === 'medium' ? 'בינוני' : 'נמוך'}
                          </Badge>
                        )}
                        {task.dueDate && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(task.dueDate).toLocaleDateString('he-IL')}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {statusTasks.length === 0 && (
                  <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                    גרור משימות לכאן
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialogs */}
      {isAdmin && selectedCategoryId && allTasks && (
        <TaskManagementDialog
          isOpen={taskDialogOpen}
          onClose={() => {
            setTaskDialogOpen(false);
            setSelectedCategoryId('');
          }}
          categoryId={selectedCategoryId}
          categoryName={categories.find(c => c.id === selectedCategoryId)?.display_name || ''}
          tasks={allTasks}
        />
      )}

      {isAdmin && categories && (
        <CategoryManagementDialog
          isOpen={categoryDialogOpen}
          onClose={() => setCategoryDialogOpen(false)}
          categories={categories}
        />
      )}

      {selectedProjectTaskId && (
        <ReminderManager
          projectTaskId={selectedProjectTaskId}
          taskName={tasks.find(t => t.id === selectedProjectTaskId)?.name || ''}
          isOpen={reminderDialogOpen}
          onClose={() => {
            setReminderDialogOpen(false);
            setSelectedProjectTaskId(null);
          }}
        />
      )}
    </div>
  );
};
