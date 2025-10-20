import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Target, TrendingUp, TrendingDown, Minus, Plus, Edit, Trash2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { he } from 'date-fns/locale';

interface Category {
  id: string;
  name: string;
  display_name: string;
  target_days?: number;
  started_at?: string;
}

interface ProjectTask {
  id: string;
  task_id: string;
  completed: boolean;
  completed_at?: string;
  started_at?: string;
}

interface Task {
  id: string;
  category_id: string;
  name: string;
}

interface ProjectTimelineProps {
  project: {
    id: string;
    client_name: string;
    started_at?: string;
    target_completion_days?: number;
    actual_completion_date?: string;
  };
  categories: Category[];
  allTasks: Task[];
  projectTasks: ProjectTask[];
}

export function ProjectTimeline({ project, categories, allTasks, projectTasks }: ProjectTimelineProps) {
  const projectStartDate = project.started_at ? new Date(project.started_at) : new Date();
  const today = new Date();
  const actualDays = differenceInDays(today, projectStartDate);
  const targetDays = project.target_completion_days || 0;
  const projectProgress = targetDays > 0 ? Math.min((actualDays / targetDays) * 100, 100) : 0;

  const getCategoryStats = (category: Category) => {
    const categoryTaskIds = allTasks.filter(t => t.category_id === category.id).map(t => t.id);
    const categoryProjectTasks = projectTasks.filter(pt => categoryTaskIds.includes(pt.task_id));
    const completedTasks = categoryProjectTasks.filter(t => t.completed);
    
    const categoryStartDate = category.started_at 
      ? new Date(category.started_at)
      : categoryProjectTasks.find(t => t.started_at)
      ? new Date(categoryProjectTasks.find(t => t.started_at)!.started_at!)
      : null;

    const lastCompletedDate = completedTasks.length > 0
      ? new Date(Math.max(...completedTasks.filter(t => t.completed_at).map(t => new Date(t.completed_at!).getTime())))
      : null;

    const actualDays = categoryStartDate 
      ? differenceInDays(lastCompletedDate || today, categoryStartDate)
      : 0;
    
    const targetDays = category.target_days || 0;
    const progress = categoryProjectTasks.length > 0 ? (completedTasks.length / categoryProjectTasks.length) * 100 : 0;
    
    let status: 'ahead' | 'on-track' | 'behind' = 'on-track';
    if (targetDays > 0 && actualDays > 0) {
      const efficiency = (actualDays / targetDays) * 100;
      if (efficiency < 90) status = 'ahead';
      else if (efficiency > 110) status = 'behind';
    }

    return {
      categoryStartDate,
      actualDays,
      targetDays,
      progress,
      status,
      completedCount: completedTasks.length,
      totalCount: categoryProjectTasks.length
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ahead': return 'text-success';
      case 'behind': return 'text-destructive';
      default: return 'text-primary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ahead': return <TrendingUp className="h-4 w-4" />;
      case 'behind': return <TrendingDown className="h-4 w-4" />;
      default: return <Minus className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ahead': return 'מקדימים יעד';
      case 'behind': return 'מאחרים ביעד';
      default: return 'בזמן';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex gap-2 items-center">
        <Button variant="ghost" size="sm" className="h-8 px-2" title="הוסף" disabled>
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 px-2" title="עריכה" disabled>
          <Edit className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 px-2" title="מחיקה" disabled>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      
      {/* Overall Project Timeline */}
      <Card className="shadow-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            מעקב זמנים - פרויקט כללי
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                תאריך התחלה
              </div>
              <div className="font-semibold">
                {format(projectStartDate, 'dd/MM/yyyy', { locale: he })}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                ימים שעברו
              </div>
              <div className="font-semibold text-2xl gradient-text">
                {actualDays} ימים
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="h-4 w-4" />
                יעד
              </div>
              <div className="font-semibold">
                {targetDays > 0 ? `${targetDays} ימים` : 'לא הוגדר יעד'}
              </div>
            </div>
          </div>

          {targetDays > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>התקדמות ביחס ליעד</span>
                <span className="font-semibold">{actualDays} מתוך {targetDays} ימים</span>
              </div>
              <Progress value={projectProgress} className="h-3" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Categories Timeline */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            מעקב זמנים לפי שלבים
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {categories.map(category => {
            const stats = getCategoryStats(category);
            
            return (
              <div key={category.id} className="p-4 rounded-lg bg-accent/20 space-y-3 hover-lift">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2">
                    {category.display_name}
                    <Badge variant="outline" className="text-xs">
                      {stats.completedCount}/{stats.totalCount} משימות
                    </Badge>
                  </h4>
                  <Badge 
                    variant="secondary" 
                    className={`flex items-center gap-1 ${getStatusColor(stats.status)}`}
                  >
                    {getStatusIcon(stats.status)}
                    {getStatusLabel(stats.status)}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">תאריך התחלה</div>
                    <div className="font-medium">
                      {stats.categoryStartDate 
                        ? format(stats.categoryStartDate, 'dd/MM/yyyy', { locale: he })
                        : 'טרם החל'}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-muted-foreground">זמן בפועל</div>
                    <div className="font-medium text-primary">
                      {stats.actualDays > 0 ? `${stats.actualDays} ימים` : 'טרם החל'}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-muted-foreground">יעד זמן</div>
                    <div className="font-medium">
                      {stats.targetDays > 0 ? `${stats.targetDays} ימים` : 'לא הוגדר'}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>התקדמות משימות</span>
                    <span>{Math.round(stats.progress)}%</span>
                  </div>
                  <Progress value={stats.progress} className="h-2" />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}