import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Clock, AlertCircle, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
}

const statusConfig = {
  pending: {
    label: 'ממתין',
    icon: Circle,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
  in_progress: {
    label: 'בביצוע',
    icon: Clock,
    color: 'text-info',
    bgColor: 'bg-info/10',
  },
  review: {
    label: 'בבדיקה',
    icon: AlertCircle,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
  completed: {
    label: 'הושלם',
    icon: CheckCircle2,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
};

const priorityColors = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-info text-white',
  high: 'bg-warning text-white',
  urgent: 'bg-destructive text-white',
};

export const KanbanBoard = ({ tasks, onStatusChange, onTaskClick }: KanbanBoardProps) => {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-6">
      {Object.entries(statusConfig).map(([status, config]) => {
        const statusTasks = getTasksByStatus(status);
        const StatusIcon = config.icon;

        return (
          <div
            key={status}
            className="flex flex-col gap-3"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(status)}
          >
            <Card className="border-2 animate-fade-in">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <StatusIcon className={cn("h-4 w-4", config.color)} />
                    <span>{config.label}</span>
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
                    draggedTask?.id === task.id && "opacity-50",
                    config.bgColor
                  )}
                  onClick={() => onTaskClick(task)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-medium text-sm line-clamp-2">{task.name}</h4>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {Object.entries(statusConfig).map(([newStatus, newConfig]) => (
                            newStatus !== status && (
                              <DropdownMenuItem
                                key={newStatus}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onStatusChange(task.id, newStatus);
                                }}
                              >
                                העבר ל{newConfig.label}
                              </DropdownMenuItem>
                            )
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
  );
};
