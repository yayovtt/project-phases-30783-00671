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
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Task {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  order_index: number;
  is_required: boolean;
}

interface TaskManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId: string;
  categoryName: string;
  tasks: Task[];
}

export const TaskManagementDialog = ({
  isOpen,
  onClose,
  categoryId,
  categoryName,
  tasks,
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
  });

  const categoryTasks = tasks.filter((t) => t.category_id === categoryId);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const maxOrder = Math.max(...categoryTasks.map((t) => t.order_index), 0);
      const { error } = await supabase.from('tasks').insert({
        category_id: categoryId,
        name: data.name,
        description: data.description || null,
        is_required: data.is_required,
        order_index: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: 'המשימה נוספה בהצלחה' });
      setIsAdding(false);
      setFormData({ name: '', description: '', is_required: false });
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
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
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
    });
    setIsAdding(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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
                          setFormData({ name: '', description: '', is_required: false });
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
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{task.name}</p>
                          {task.is_required && (
                            <Badge variant="outline" className="text-xs">
                              חובה
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
        <AlertDialogContent>
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
