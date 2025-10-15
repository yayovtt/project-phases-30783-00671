import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Download, Upload, AlertCircle, Clock, Trash2, Search, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
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

interface BackupRestoreProps {
  projectId: string;
}

interface Backup {
  id: string;
  backup_name: string;
  created_at: string;
  backup_size: number;
  backup_type: 'manual' | 'auto' | 'scheduled';
  notes?: string;
  tasks_count: number;
  completed_count: number;
}

export const BackupRestore = ({ projectId }: BackupRestoreProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [backupNotes, setBackupNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null);

  const { data: backups = [], isLoading } = useQuery({
    queryKey: ['project-backups', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_backups')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(backup => {
        const backupData = backup.backup_data as any;
        return {
          id: backup.id,
          backup_name: backup.backup_name,
          created_at: backup.created_at,
          backup_size: backup.backup_size,
          backup_type: backup.backup_type as 'manual' | 'auto' | 'scheduled',
          notes: backup.notes,
          tasks_count: backupData?.tasks?.length || 0,
          completed_count: backupData?.tasks?.filter((t: any) => t.completed).length || 0,
        };
      });
    },
  });

  const handleCreateBackup = async () => {
    if (!user) return;
    
    setIsCreatingBackup(true);
    try {
      // Fetch all project data
      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      const { data: projectTasks } = await supabase
        .from('project_tasks')
        .select('*, tasks(*)')
        .eq('project_id', projectId);

      const { data: attachments } = await supabase
        .from('task_attachments')
        .select('*')
        .in('project_task_id', projectTasks?.map(pt => pt.id) || []);

      const { data: reminders } = await supabase
        .from('task_reminders')
        .select('*')
        .in('project_task_id', projectTasks?.map(pt => pt.id) || []);

      const backupData = {
        project,
        tasks: projectTasks,
        attachments,
        reminders,
        created_at: new Date().toISOString(),
      };

      const backupJson = JSON.stringify(backupData);
      const backupSize = new Blob([backupJson]).size;

      const name = backupName.trim() || `גיבוי ${new Date().toLocaleDateString('he-IL')} ${new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;

      const { error } = await supabase
        .from('project_backups')
        .insert({
          project_id: projectId,
          backup_name: name,
          backup_data: backupData,
          files_metadata: { attachments_count: attachments?.length || 0 },
          created_by: user.id,
          backup_size: backupSize,
          backup_type: 'manual',
          notes: backupNotes.trim() || null,
        });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['project-backups'] });

      setBackupName('');
      setBackupNotes('');

      toast({
        title: 'גיבוי נוצר בהצלחה',
        description: `${projectTasks?.length || 0} משימות, ${attachments?.length || 0} קבצים, ${reminders?.length || 0} תזכורות נשמרו`,
      });
    } catch (error) {
      console.error('Backup error:', error);
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
    if (!user) return;

    setIsRestoring(true);
    try {
      const { data: backup } = await supabase
        .from('project_backups')
        .select('*')
        .eq('id', backupId)
        .single();

      if (!backup) throw new Error('גיבוי לא נמצא');

      const backupData = backup.backup_data as any;

      // Delete current data
      const { data: currentTasks } = await supabase
        .from('project_tasks')
        .select('id')
        .eq('project_id', projectId);

      if (currentTasks && currentTasks.length > 0) {
        await supabase
          .from('project_tasks')
          .delete()
          .in('id', currentTasks.map(t => t.id));
      }

      // Restore tasks
      if (backupData.tasks && backupData.tasks.length > 0) {
        const { error: tasksError } = await supabase
          .from('project_tasks')
          .insert(backupData.tasks.map((task: any) => ({
            id: task.id,
            project_id: projectId,
            task_id: task.task_id,
            completed: task.completed,
            status: task.status,
            notes: task.notes,
            started_at: task.started_at,
            completed_at: task.completed_at,
            due_date_override: task.due_date_override,
            actual_hours: task.actual_hours,
          })));

        if (tasksError) throw tasksError;
      }

      // Restore reminders
      if (backupData.reminders && backupData.reminders.length > 0) {
        await supabase
          .from('task_reminders')
          .insert(backupData.reminders);
      }

      await queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      await queryClient.invalidateQueries({ queryKey: ['task-reminders'] });

      toast({
        title: 'שוחזר בהצלחה',
        description: `${backupData.tasks?.length || 0} משימות ו-${backupData.reminders?.length || 0} תזכורות שוחזרו`,
      });
    } catch (error) {
      console.error('Restore error:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לשחזר גיבוי',
        variant: 'destructive',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (backupId: string) => {
      const { error } = await supabase
        .from('project_backups')
        .delete()
        .eq('id', backupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-backups'] });
      toast({
        title: 'גיבוי נמחק',
        description: 'הגיבוי נמחק בהצלחה',
      });
      setDeleteDialogOpen(false);
      setSelectedBackupId(null);
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן למחוק את הגיבוי',
        variant: 'destructive',
      });
    },
  });

  const filteredBackups = backups.filter(backup =>
    backup.backup_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    backup.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (isLoading) {
    return <div>טוען...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            יצירת גיבוי חדש
          </CardTitle>
          <CardDescription>
            שמור את כל נתוני הפרויקט במסד הנתונים לשחזור עתידי
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">שם הגיבוי (אופציונלי)</label>
            <Input
              placeholder="לדוגמה: לפני שינויים גדולים"
              value={backupName}
              onChange={(e) => setBackupName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">הערות (אופציונלי)</label>
            <Textarea
              placeholder="הערות על הגיבוי..."
              value={backupNotes}
              onChange={(e) => setBackupNotes(e.target.value)}
              rows={3}
            />
          </div>
          <Button
            onClick={handleCreateBackup}
            disabled={isCreatingBackup}
            className="w-full"
          >
            <Download className="ml-2 h-4 w-4" />
            {isCreatingBackup ? 'יוצר גיבוי...' : 'צור גיבוי חדש'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            גיבויים קיימים
          </CardTitle>
          <CardDescription>
            שחזר את הפרויקט לנקודת זמן קודמת
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backups.length > 0 && (
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="חיפוש גיבויים..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
          )}

          {filteredBackups.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {backups.length === 0 ? 'אין גיבויים זמינים' : 'לא נמצאו גיבויים מתאימים'}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredBackups.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">
                      {backup.backup_type === 'auto' && <Clock className="h-4 w-4 text-muted-foreground" />}
                      {backup.backup_type === 'manual' && <Download className="h-4 w-4 text-muted-foreground" />}
                      {backup.backup_type === 'scheduled' && <Tag className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{backup.backup_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(backup.created_at).toLocaleDateString('he-IL')} • {new Date(backup.created_at).toLocaleTimeString('he-IL')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {backup.tasks_count} משימות • {backup.completed_count} הושלמו • {formatFileSize(backup.backup_size)}
                      </p>
                      {backup.notes && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          {backup.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleRestore(backup.id)}
                      disabled={isRestoring}
                      variant="outline"
                      size="sm"
                    >
                      <Upload className="ml-2 h-4 w-4" />
                      שחזר
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedBackupId(backup.id);
                        setDeleteDialogOpen(true);
                      }}
                      variant="ghost"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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
          <p>• הגיבויים נשמרים במסד הנתונים</p>
          <p>• גיבוי אוטומטי נוצר לפני כל שחזור</p>
          <p>• שחזור גיבוי ידרוס את כל המשימות והתזכורות הנוכחיות</p>
          <p>• מומלץ ליצור גיבוי לפני שינויים משמעותיים</p>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם למחוק גיבוי זה?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו אינה הפיכה. הגיבוי יימחק לצמיתות.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedBackupId && deleteMutation.mutate(selectedBackupId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
