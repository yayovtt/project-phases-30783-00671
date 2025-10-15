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

interface Category {
  id: string;
  name: string;
  display_name: string;
  order_index: number;
  color: string | null;
}

interface CategoryManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
}

export const CategoryManagementDialog = ({
  isOpen,
  onClose,
  categories,
}: CategoryManagementDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    color: '#3b82f6',
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const maxOrder = Math.max(...categories.map((c) => c.order_index), 0);
      const { error } = await supabase.from('categories').insert({
        name: data.name,
        display_name: data.display_name,
        color: data.color,
        order_index: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'הקטגוריה נוספה בהצלחה' });
      setIsAdding(false);
      setFormData({ name: '', display_name: '', color: '#3b82f6' });
    },
    onError: (error: Error) => {
      toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase
        .from('categories')
        .update({
          name: data.name,
          display_name: data.display_name,
          color: data.color,
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'הקטגוריה עודכנה בהצלחה' });
      setEditingCategory(null);
    },
    onError: (error: Error) => {
      toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'הקטגוריה נמחקה בהצלחה' });
      setDeletingCategoryId(null);
    },
    onError: (error: Error) => {
      toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      updateMutation.mutate({ ...formData, id: editingCategory.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const startEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      display_name: category.display_name,
      color: category.color || '#3b82f6',
    });
    setIsAdding(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ניהול קטגוריות</DialogTitle>
            <DialogDescription>הוסף, ערוך או מחק קטגוריות</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {!isAdding ? (
              <Button onClick={() => setIsAdding(true)} className="w-full">
                <Plus className="ml-2 h-4 w-4" />
                הוסף קטגוריה חדשה
              </Button>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">שם טכני (אנגלית)</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="planning"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="display_name">שם תצוגה</Label>
                      <Input
                        id="display_name"
                        value={formData.display_name}
                        onChange={(e) =>
                          setFormData({ ...formData, display_name: e.target.value })
                        }
                        placeholder="תכנון ותיכנון"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="color">צבע</Label>
                      <div className="flex gap-2">
                        <Input
                          id="color"
                          type="color"
                          value={formData.color}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          className="w-20 h-10"
                        />
                        <Input
                          value={formData.color}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          placeholder="#3b82f6"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                        {editingCategory ? 'עדכן' : 'הוסף'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsAdding(false);
                          setEditingCategory(null);
                          setFormData({ name: '', display_name: '', color: '#3b82f6' });
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
              <h3 className="font-semibold">קטגוריות קיימות</h3>
              {categories.map((category) => (
                <Card key={category.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full border-2 border-border"
                        style={{ backgroundColor: category.color || '#ccc' }}
                      />
                      <div>
                        <p className="font-medium">{category.display_name}</p>
                        <p className="text-sm text-muted-foreground">{category.name}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingCategoryId(category.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingCategoryId} onOpenChange={() => setDeletingCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את הקטגוריה וכל המשימות הקשורות אליה. לא ניתן לבטל פעולה זו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCategoryId && deleteMutation.mutate(deletingCategoryId)}
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
