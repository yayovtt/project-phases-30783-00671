import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface Category {
  id: string;
  name: string;
  display_name: string;
  color: string | null;
  order_index: number;
}

interface CategorySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (categoryId: string, categoryName: string) => void;
}

export const CategorySelector = ({ isOpen, onClose, onSelectCategory }: CategorySelectorProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState({
    name: '',
    display_name: '',
    color: '#3B82F6',
  });

  const { data: categories, isLoading } = useQuery({
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

  const createCategoryMutation = useMutation({
    mutationFn: async (data: typeof newCategoryData) => {
      const maxOrder = Math.max(...(categories?.map((c) => c.order_index) || [0]), 0);
      const { data: newCategory, error } = await supabase
        .from('categories')
        .insert({
          name: data.name.toLowerCase().replace(/\s+/g, '_'),
          display_name: data.display_name,
          color: data.color,
          order_index: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return newCategory;
    },
    onSuccess: (newCategory) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'הקטגוריה נוצרה בהצלחה' });
      setShowNewCategoryForm(false);
      setNewCategoryData({ name: '', display_name: '', color: '#3B82F6' });
      // Automatically open task management for new category
      onSelectCategory(newCategory.id, newCategory.display_name);
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: 'שגיאה', description: error.message, variant: 'destructive' });
    },
  });

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    createCategoryMutation.mutate(newCategoryData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-background" dir="rtl">
        <DialogHeader>
          <DialogTitle>בחר קטגוריה</DialogTitle>
          <DialogDescription>בחר קטגוריה קיימת או צור חדשה להוספת משימות</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!showNewCategoryForm ? (
            <>
              <Button
                onClick={() => setShowNewCategoryForm(true)}
                className="w-full"
                variant="outline"
              >
                <Plus className="ml-2 h-4 w-4" />
                צור קטגוריה חדשה
              </Button>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground">קטגוריות קיימות</h3>
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : categories && categories.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {categories.map((category) => (
                      <Card
                        key={category.id}
                        className="cursor-pointer hover:bg-accent/50 transition-colors border-2 hover:border-primary"
                        onClick={() => {
                          onSelectCategory(category.id, category.display_name);
                          onClose();
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {category.color && (
                                <div
                                  className="w-4 h-4 rounded-full"
                                  style={{ backgroundColor: category.color }}
                                />
                              )}
                              <div>
                                <h4 className="font-semibold">{category.display_name}</h4>
                                <p className="text-xs text-muted-foreground">{category.name}</p>
                              </div>
                            </div>
                            <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    אין קטגוריות. צור קטגוריה חדשה
                  </p>
                )}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleCreateCategory} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="display_name">שם הקטגוריה</Label>
                    <Input
                      id="display_name"
                      value={newCategoryData.display_name}
                      onChange={(e) =>
                        setNewCategoryData({
                          ...newCategoryData,
                          display_name: e.target.value,
                          name: e.target.value,
                        })
                      }
                      placeholder="למשל: תכנון ורישוי"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="color">צבע</Label>
                    <div className="flex gap-2">
                      <Input
                        id="color"
                        type="color"
                        value={newCategoryData.color}
                        onChange={(e) =>
                          setNewCategoryData({ ...newCategoryData, color: e.target.value })
                        }
                        className="w-20 h-10"
                      />
                      <Input
                        type="text"
                        value={newCategoryData.color}
                        onChange={(e) =>
                          setNewCategoryData({ ...newCategoryData, color: e.target.value })
                        }
                        placeholder="#3B82F6"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={createCategoryMutation.isPending}>
                      צור קטגוריה
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowNewCategoryForm(false);
                        setNewCategoryData({ name: '', display_name: '', color: '#3B82F6' });
                      }}
                    >
                      ביטול
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
