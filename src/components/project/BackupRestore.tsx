import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, RotateCcw, Clock, Save, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';

interface BackupRestoreProps {
  projectId: string;
}

interface Backup {
  id: string;
  created_at: string;
  tasks_count: number;
  completed_count: number;
}

export const BackupRestore = ({ projectId }: BackupRestoreProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Simulated backups - in a real app, these would be stored in the database
  const { data: backups } = useQuery({
    queryKey: ['backups', projectId],
    queryFn: async () => {
      // This is a simplified version - you'd want to store backups in a dedicated table
      const { data: projectTasks } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('project_id', projectId);

      const backup: Backup = {
        id: new Date().toISOString(),
        created_at: new Date().toISOString(),
        tasks_count: projectTasks?.length || 0,
        completed_count: projectTasks?.filter(t => t.completed).length || 0,
      };

      return [backup];
    },
  });

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const { data: projectTasks } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('project_id', projectId);

      const backup = {
        project_id: projectId,
        backup_data: projectTasks,
        created_at: new Date().toISOString(),
      };

      // Save to localStorage as a simple backup solution
      const existingBackups = JSON.parse(localStorage.getItem(`backups-${projectId}`) || '[]');
      existingBackups.push(backup);
      
      // Keep only last 10 backups
      if (existingBackups.length > 10) {
        existingBackups.shift();
      }
      
      localStorage.setItem(`backups-${projectId}`, JSON.stringify(existingBackups));

      toast({
        title: 'גיבוי נוצר בהצלחה',
        description: `${projectTasks?.length || 0} משימות נשמרו`,
      });

      queryClient.invalidateQueries({ queryKey: ['backups', projectId] });
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: 'לא ניתן ליצור גיבוי',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestore = async (backupId: string) => {
    if (!confirm('האם אתה בטוח שברצונך לשחזר גיבוי זה? פעולה זו תדרוס את הנתונים הנוכחיים.')) {
      return;
    }

    setIsRestoring(true);
    try {
      const existingBackups = JSON.parse(localStorage.getItem(`backups-${projectId}`) || '[]');
      const backup = existingBackups.find((b: any) => b.created_at === backupId);

      if (backup && backup.backup_data) {
        // Delete current tasks
        await supabase
          .from('project_tasks')
          .delete()
          .eq('project_id', projectId);

        // Restore from backup
        for (const task of backup.backup_data) {
          await supabase.from('project_tasks').insert({
            project_id: projectId,
            task_id: task.task_id,
            completed: task.completed,
            status: task.status,
            notes: task.notes,
            completed_at: task.completed_at,
            completed_by: task.completed_by,
          });
        }

        toast({
          title: 'שוחזר בהצלחה',
          description: `${backup.backup_data.length} משימות שוחזרו`,
        });

        queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      }
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לשחזר את הגיבוי',
        variant: 'destructive',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const getLocalBackups = () => {
    try {
      return JSON.parse(localStorage.getItem(`backups-${projectId}`) || '[]');
    } catch {
      return [];
    }
  };

  const localBackups = getLocalBackups();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            יצירת גיבוי חדש
          </CardTitle>
          <CardDescription>
            שמור את המצב הנוכחי של הפרויקט
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleCreateBackup}
            disabled={isCreatingBackup}
            className="w-full"
          >
            <Database className="ml-2 h-4 w-4" />
            {isCreatingBackup ? 'יוצר גיבוי...' : 'צור גיבוי חדש'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            גיבויים קיימים
          </CardTitle>
          <CardDescription>
            {localBackups.length} גיבויים זמינים
          </CardDescription>
        </CardHeader>
        <CardContent>
          {localBackups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>אין גיבויים זמינים</p>
              <p className="text-sm mt-1">צור גיבוי ראשון כדי להתחיל</p>
            </div>
          ) : (
            <div className="space-y-3">
              {localBackups.reverse().map((backup: any, index: number) => (
                <div
                  key={backup.created_at}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        גיבוי #{localBackups.length - index}
                      </p>
                      {index === 0 && (
                        <Badge variant="secondary">אחרון</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(backup.created_at).toLocaleString('he-IL', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>{backup.backup_data?.length || 0} משימות</span>
                      <span>•</span>
                      <span>
                        {backup.backup_data?.filter((t: any) => t.completed).length || 0} הושלמו
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleRestore(backup.created_at)}
                    disabled={isRestoring}
                    variant="outline"
                    size="sm"
                  >
                    <RotateCcw className="ml-2 h-4 w-4" />
                    שחזר
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-yellow-500/50 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-500">
            <AlertCircle className="h-5 w-5" />
            הערה חשובה
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• הגיבויים נשמרים במחשב המקומי שלך</p>
          <p>• שמור עד 10 גיבויים אחרונים</p>
          <p>• שחזור גיבוי ידרוס את כל הנתונים הנוכחיים</p>
          <p>• מומלץ ליצור גיבוי לפני שינויים משמעותיים</p>
        </CardContent>
      </Card>
    </div>
  );
};
