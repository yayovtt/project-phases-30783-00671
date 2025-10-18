import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, Plus, CalendarIcon, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { PriorityBadge } from './PriorityBadge';

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

interface TaskManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId: string;
  categoryName: string;
  tasks: Task[];
  projectId?: string;
}

export const TaskManagementDialog = ({
  isOpen,
  onClose,
  categoryId,
  categoryName,
  tasks,
  projectId,
}: TaskManagementDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_required: false,
    due_date: '',
    estimated_hours: '',
    priority: 'medium' as "low" | "medium" | "high" | "urgent",
  });

  const categoryTasks = tasks.filter((t) => t.category_id === categoryId);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const maxOrder = Math.max(...categoryTasks.map((t) => t.order_index), 0);
      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert({
          category_id: categoryId,
          name: data.name,
          description: data.description || null,
          is_required: data.is_required,
          order_index: maxOrder + 1,
          due_date: data.due_date || null,
          estimated_hours: data.estimated_hours ? parseInt(data.estimated_hours) : null,
          priority: data.priority,
        })
        .select('id')
        .single();
      if (error) throw error;
      
      // If projectId is provided, link the task to the project
      if (projectId && newTask) {
        const { error: linkError } = await supabase
          .from('project_tasks')
          .insert({
            project_id: projectId,
            task_id: newTask.id,
            completed: false,
          });
        if (linkError) throw linkError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
        queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      }
      toast({ title: 'המשימה נוספה בהצלחה' });
      setIsAdding(false);
      setFormData({ name: '', description: '', is_required: false, due_date: '', estimated_hours: '', priority: 'medium' });
    },
    onError: (error: Error) => {
      toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase
        .from('tasks')
        .update({
          name: data.name,
          description: data.description || null,
          is_required: data.is_required,
          due_date: data.due_date || null,
          estimated_hours: data.estimated_hours ? parseInt(data.estimated_hours) : null,
          priority: data.priority,
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      }
      toast({ title: 'המשימה עודכנה בהצלחה' });
      setEditingTask(null);
    },
    onError: (error: Error) => {
      toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
        queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      }
      toast({ title: 'המשימה נמחקה בהצלחה' });
      setDeletingTaskId(null);
    },
    onError: (error: Error) => {
      toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTask) {
      updateMutation.mutate({ ...formData, id: editingTask.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const startEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      name: task.name,
      description: task.description || '',
      is_required: task.is_required,
      due_date: task.due_date || '',
      estimated_hours: task.estimated_hours?.toString() || '',
      priority: task.priority || 'medium',
    });
    setIsAdding(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>ניהול משימות - {categoryName}</DialogTitle>
            <DialogDescription>הוסף, ערוך או מחק משימות בקטגוריה זו</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {!isAdding ? (
              <Button onClick={() => setIsAdding(true)} className="w-full">
                <Plus className="ml-2 h-4 w-4" />
                הוסף משימה חדשה
              </Button>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">שם המשימה</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="הגשת תוכנית למחלקה לתכנון"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">תיאור (אופציונלי)</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        placeholder="פרטים נוספים על המשימה..."
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>תאריך יעד</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-right font-normal",
                                !formData.due_date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="ml-2 h-4 w-4" />
                              {formData.due_date ? (
                                format(new Date(formData.due_date), "PPP", { locale: he })
                              ) : (
                                <span>בחר תאריך</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={formData.due_date ? new Date(formData.due_date) : undefined}
                              onSelect={(date) => setFormData({ ...formData, due_date: date?.toISOString() || '' })}
                              locale={he}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="estimated_hours">שעות משוערות</Label>
                        <Input
                          id="estimated_hours"
                          type="number"
                          min="0"
                          value={formData.estimated_hours}
                          onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priority">עדיפות</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => setFormData({ ...formData, priority: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">נמוכה</SelectItem>
                          <SelectItem value="medium">בינונית</SelectItem>
                          <SelectItem value="high">גבוהה</SelectItem>
                          <SelectItem value="urgent">דחוף</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="is_required"
                        checked={formData.is_required}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, is_required: checked as boolean })
                        }
                      />
                      <Label htmlFor="is_required" className="cursor-pointer">
                        משימה חובה
                      </Label>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                        {editingTask ? 'עדכן' : 'הוסף'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsAdding(false);
                          setEditingTask(null);
                          setFormData({ name: '', description: '', is_required: false, due_date: '', estimated_hours: '', priority: 'medium' });
                        }}
                      >
                        ביטול
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <h3 className="font-semibold">משימות קיימות ({categoryTasks.length})</h3>
              {categoryTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  אין משימות בקטגוריה זו
                </p>
              ) : (
                categoryTasks.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="flex items-start justify-between p-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-medium">{task.name}</p>
                          {task.is_required && (
                            <Badge variant="outline" className="text-xs">
                              חובה
                            </Badge>
                          )}
                          {task.priority && (
                            <PriorityBadge priority={task.priority} className="text-xs" />
                          )}
                          {task.due_date && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {format(new Date(task.due_date), "d/M/yy", { locale: he })}
                            </Badge>
                          )}
                          {task.estimated_hours && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Clock className="h-3 w-3" />
                              {task.estimated_hours}ש׳
                            </Badge>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(task)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingTaskId(task.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingTaskId} onOpenChange={() => setDeletingTaskId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את המשימה מכל הפרויקטים. לא ניתן לבטל פעולה זו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTaskId && deleteMutation.mutate(deletingTaskId)}
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
