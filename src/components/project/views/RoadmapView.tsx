import { CheckCircle2, Circle, ChevronLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Task {
  id: string;
  name: string;
  description: string | null;
  is_required: boolean;
  order_index: number;
}

interface ProjectTask {
  id: string;
  task_id: string;
  completed: boolean;
  notes: string | null;
  status: string;
}

interface Category {
  id: string;
  name: string;
  display_name: string;
  color: string | null;
  order_index: number;
  tasks: Task[];
  projectTasks: ProjectTask[];
}

interface RoadmapViewProps {
  categories: Category[];
}

export function RoadmapView({ categories }: RoadmapViewProps) {
  const getCategoryProgress = (category: Category) => {
    const completedTasks = category.projectTasks.filter(pt => pt.completed).length;
    const totalTasks = category.tasks.length;
    return { completed: completedTasks, total: totalTasks };
  };

  const isCategoryCompleted = (category: Category) => {
    const { completed, total } = getCategoryProgress(category);
    return completed === total && total > 0;
  };

  return (
    <div className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">מפת דרך הפרויקט</h2>
          <p className="text-lg text-muted-foreground">
            מעקב אחר התקדמות הפרויקט שלב אחר שלב
          </p>
        </div>

        <div className="relative">
          {/* Vertical connecting line */}
          <div className="absolute right-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary/50 to-primary/20 transform translate-x-1/2 hidden md:block" />

          <div className="space-y-24">
            {categories.map((category, index) => {
              const isCompleted = isCategoryCompleted(category);
              const progress = getCategoryProgress(category);
              const isLeft = index % 2 === 0;

              return (
                <div
                  key={category.id}
                  className={`relative flex items-center ${
                    isLeft ? 'md:flex-row' : 'md:flex-row-reverse'
                  } flex-col gap-8`}
                >
                  {/* Milestone circle */}
                  <div className="relative z-10 flex-shrink-0 w-24 h-24 md:w-32 md:h-32">
                    <div
                      className={`w-full h-full rounded-full border-8 flex items-center justify-center transition-all duration-500 ${
                        isCompleted
                          ? 'bg-primary border-primary shadow-lg shadow-primary/50 scale-110'
                          : 'bg-card border-border'
                      }`}
                      style={{
                        borderColor: category.color || undefined,
                      }}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-12 h-12 md:w-16 md:h-16 text-primary-foreground" />
                      ) : (
                        <Circle className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground" />
                      )}
                    </div>
                    
                    {/* Step number badge */}
                    <div className="absolute -top-2 -right-2 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
                      {index + 1}
                    </div>
                  </div>

                  {/* Connector arrow */}
                  <div className="hidden md:flex items-center flex-shrink-0">
                    <ChevronLeft
                      className={`w-8 h-8 text-primary ${
                        isLeft ? 'rotate-0' : 'rotate-180'
                      }`}
                    />
                  </div>

                  {/* Category card */}
                  <Card
                    className={`flex-1 p-8 transition-all duration-500 hover:shadow-xl ${
                      isCompleted ? 'border-primary/50 shadow-lg' : ''
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-2xl font-bold mb-2">
                            {category.display_name}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant={isCompleted ? 'default' : 'outline'}
                              className="text-base px-3 py-1"
                            >
                              {progress.completed} מתוך {progress.total} משימות
                            </Badge>
                            {isCompleted && (
                              <Badge className="bg-primary text-primary-foreground">
                                הושלם ✓
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-l from-primary to-primary/70 transition-all duration-700 rounded-full"
                          style={{
                            width: `${
                              progress.total > 0
                                ? (progress.completed / progress.total) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>

                      {/* Tasks summary */}
                      <div className="grid gap-2 mt-4">
                        {category.tasks.slice(0, 3).map((task) => {
                          const projectTask = category.projectTasks.find(
                            (pt) => pt.task_id === task.id
                          );
                          return (
                            <div
                              key={task.id}
                              className="flex items-center gap-3 text-sm"
                            >
                              {projectTask?.completed ? (
                                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                              ) : (
                                <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                              )}
                              <span
                                className={
                                  projectTask?.completed
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
                          );
                        })}
                        {category.tasks.length > 3 && (
                          <p className="text-sm text-muted-foreground mr-8">
                            + עוד {category.tasks.length - 3} משימות
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary footer */}
        <div className="mt-24 text-center">
          <Card className="p-8 bg-gradient-to-bl from-primary/5 to-transparent border-primary/20">
            <h3 className="text-2xl font-bold mb-4">סיכום התקדמות</h3>
            <div className="flex justify-center gap-8 flex-wrap">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  {categories.filter(isCategoryCompleted).length}
                </div>
                <div className="text-sm text-muted-foreground">
                  קטגוריות הושלמו
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-muted-foreground mb-2">
                  {categories.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  סה"כ קטגוריות
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
