import { CheckCircle2, Circle, Plus, Edit, Trash2, CheckSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

interface Task {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  order_index: number;
  is_required: boolean;
}

interface Category {
  id: string;
  name: string;
  display_name: string;
  order_index: number;
  color: string | null;
  tasks: Task[];
}

interface TimelineViewProps {
  categories: Category[];
  isTaskCompleted: (taskId: string) => boolean;
  onToggleTask: (taskId: string, completed: boolean) => void;
  onOpenTaskManagement?: (categoryId: string, categoryName: string) => void;
  onOpenCategoryManagement?: () => void;
}

export const TimelineView = ({ categories, isTaskCompleted, onToggleTask, onOpenTaskManagement, onOpenCategoryManagement }: TimelineViewProps) => {
  const [openCategories, setOpenCategories] = useState<string[]>(categories.map((c) => c.id));
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const getCategoryProgress = (category: Category) => {
    if (category.tasks.length === 0) return 0;
    const completed = category.tasks.filter((t) => isTaskCompleted(t.id)).length;
    return Math.round((completed / category.tasks.length) * 100);
  };

  const getCategoryStatus = (category: Category) => {
    const progress = getCategoryProgress(category);
    if (progress === 100) return 'completed';
    if (progress > 0) return 'in-progress';
    return 'pending';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-primary border-primary';
      case 'in-progress':
        return 'bg-orange-500 border-orange-500';
      default:
        return 'bg-muted border-muted';
    }
  };

  const getLineColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-gradient-to-b from-primary to-primary/50';
      case 'in-progress':
        return 'bg-gradient-to-b from-orange-500 to-orange-500/50';
      default:
        return 'bg-gradient-to-b from-muted to-muted/50';
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleBulkDelete = () => {
    selectedTasks.forEach(taskId => {
      // You would implement actual delete logic here
      console.log('Delete task:', taskId);
    });
    setSelectedTasks([]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4">
      {/* Toolbar */}
      <div className="flex flex-row-reverse gap-2 items-center">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 px-2 gap-1" 
          title="הוסף קטגוריה"
          onClick={onOpenCategoryManagement}
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="text-xs">קטגוריה</span>
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 px-2" 
          title="עריכה"
          onClick={onOpenCategoryManagement}
        >
          <Edit className="h-3.5 w-3.5" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 px-2" 
          title="מחיקה"
          onClick={onOpenCategoryManagement}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 px-2 gap-1" 
          title="בחירה מרובה"
          onClick={() => setSelectedTasks([])}
        >
          <CheckSquare className="h-3.5 w-3.5" />
          <span className="text-xs">({selectedTasks.length})</span>
        </Button>
        
        {selectedTasks.length > 0 && (
          <Button 
            variant="destructive" 
            size="sm" 
            className="h-8 px-2" 
            title="מחק נבחרים"
            onClick={handleBulkDelete}
          >
            <Trash2 className="h-3.5 w-3.5 ml-1" />
            מחק {selectedTasks.length}
          </Button>
        )}
      </div>
      
      <div className="space-y-0">
      {categories.map((category, index) => {
        const progress = getCategoryProgress(category);
        const status = getCategoryStatus(category);
        const completedCount = category.tasks.filter((t) => isTaskCompleted(t.id)).length;
        const isOpen = openCategories.includes(category.id);

        return (
          <div key={category.id} className="relative">
            {/* Connecting Line */}
            {index < categories.length - 1 && (
              <div
                className={`absolute right-20 top-32 h-12 w-1 ${getLineColor(
                  status
                )} animate-fade-in`}
              />
            )}

            <div className="flex items-start gap-8 pb-12">
              {/* Timeline Circle */}
              <div className="flex flex-col items-center flex-shrink-0 pt-6">
                <div
                  className={`w-40 h-40 rounded-full border-8 flex flex-col items-center justify-center transition-all duration-700 shadow-lg ${getStatusColor(
                    status
                  )} animate-scale-in`}
                  style={{
                    borderColor: status === 'completed' ? category.color || undefined : undefined,
                    boxShadow:
                      status === 'completed'
                        ? `0 10px 40px ${category.color}40`
                        : undefined,
                  }}
                >
                  {status === 'completed' ? (
                    <CheckCircle2 className="h-16 w-16 text-primary-foreground animate-pulse" />
                  ) : (
                    <>
                      <Circle className="h-12 w-12 text-foreground/60 mb-2" />
                      <span className="text-2xl font-bold">{progress}%</span>
                    </>
                  )}
                </div>
              </div>

              {/* Content Card */}
              <Collapsible open={isOpen} onOpenChange={() => toggleCategory(category.id)} className="flex-1">
                <Card className="hover:shadow-2xl transition-all duration-500 animate-fade-in border-2">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {category.color && (
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                          )}
                          <CardTitle className="text-2xl">{category.display_name}</CardTitle>
                        </div>
                        <Badge
                          variant={status === 'completed' ? 'default' : 'secondary'}
                          className="text-sm"
                        >
                          {status === 'completed' && '✓ הושלם'}
                          {status === 'in-progress' && '🔄 בתהליך'}
                          {status === 'pending' && '⏳ ממתין'}
                        </Badge>
                      </div>
                      <CardDescription className="text-lg">
                        {completedCount} מתוך {category.tasks.length} משימות הושלמו
                      </CardDescription>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {/* Progress Bar */}
                        <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className="absolute top-0 right-0 h-full bg-gradient-to-l from-primary via-primary/80 to-primary/60 transition-all duration-1000 rounded-full"
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        {/* Tasks List */}
                        <div className="space-y-2 pt-2">
                          {category.tasks.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              אין משימות בקטגוריה זו
                            </p>
                          ) : (
                            category.tasks.map((task) => (
                              <div
                                key={task.id}
                                className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-all group"
                              >
                                 <div className="flex gap-2">
                                   <Checkbox
                                     checked={selectedTasks.includes(task.id)}
                                     onCheckedChange={() => toggleTaskSelection(task.id)}
                                     className="mt-1"
                                   />
                                   <Checkbox
                                     checked={isTaskCompleted(task.id)}
                                     onCheckedChange={(checked) =>
                                       onToggleTask(task.id, checked as boolean)
                                     }
                                     className="mt-1"
                                   />
                                 </div>
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
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
};
