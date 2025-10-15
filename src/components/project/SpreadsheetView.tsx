import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, RefreshCw, FileSpreadsheet, Share2, Edit2, Save, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PriorityBadge } from './PriorityBadge';

interface SpreadsheetViewProps {
  projectId: string;
}

interface EditingCell {
  taskId: string;
  field: 'name' | 'description' | 'status' | 'priority' | 'notes';
  value: string;
}

export const SpreadsheetView = ({ projectId }: SpreadsheetViewProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('category_id', { ascending: true })
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: projectTasks } = useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('project_id', projectId);
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, field, value }: { taskId: string; field: string; value: any }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ [field]: value })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setEditingCell(null);
      toast({
        title: 'עודכן בהצלחה',
        description: 'השינויים נשמרו',
      });
    },
    onError: () => {
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לעדכן',
        variant: 'destructive',
      });
    },
  });

  const updateProjectTaskMutation = useMutation({
    mutationFn: async ({ taskId, field, value }: { taskId: string; field: string; value: any }) => {
      const projectTask = projectTasks?.find(pt => pt.task_id === taskId);
      if (projectTask) {
        const { error } = await supabase
          .from('project_tasks')
          .update({ [field]: value })
          .eq('id', projectTask.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
      setEditingCell(null);
      toast({
        title: 'עודכן בהצלחה',
        description: 'השינויים נשמרו',
      });
    },
  });

  const toggleCompletedMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      const projectTask = projectTasks?.find(pt => pt.task_id === taskId);
      if (projectTask) {
        const { error } = await supabase
          .from('project_tasks')
          .update({ 
            completed,
            completed_at: completed ? new Date().toISOString() : null,
            status: completed ? 'completed' : 'pending'
          })
          .eq('id', projectTask.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
    },
  });

  const exportToCSV = () => {
    if (!tasks || !categories) return;

    const headers = ['קטגוריה', 'משימה', 'תיאור', 'סטטוס', 'עדיפות', 'חובה', 'הושלם', 'הערות'];
    const rows = tasks.map(task => {
      const category = categories.find(c => c.id === task.category_id);
      const projectTask = projectTasks?.find(pt => pt.task_id === task.id);
      return [
        category?.display_name || '',
        task.name,
        task.description || '',
        projectTask?.status || 'pending',
        task.priority || 'medium',
        task.is_required ? 'כן' : 'לא',
        projectTask?.completed ? 'כן' : 'לא',
        projectTask?.notes || '',
      ];
    });

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `project_tasks_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: 'יצוא הושלם',
      description: 'הקובץ הורד בהצלחה',
    });
  };

  const exportToGoogleSheets = async () => {
    if (!webhookUrl) {
      toast({
        title: 'שגיאה',
        description: 'אנא הזן את ה-Webhook URL של Zapier',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    try {
      const exportData = tasks?.map(task => {
        const category = categories?.find(c => c.id === task.category_id);
        const projectTask = projectTasks?.find(pt => pt.task_id === task.id);
        return {
          category: category?.display_name || '',
          task: task.name,
          description: task.description || '',
          status: projectTask?.status || 'pending',
          priority: task.priority || 'medium',
          required: task.is_required,
          completed: projectTask?.completed || false,
          notes: projectTask?.notes || '',
        };
      });

      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'no-cors',
        body: JSON.stringify({
          tasks: exportData,
          timestamp: new Date().toISOString(),
          projectId,
        }),
      });

      toast({
        title: 'נשלח בהצלחה',
        description: 'הנתונים נשלחו ל-Google Sheets דרך Zapier',
      });
    } catch (error) {
      console.error('Error exporting to Google Sheets:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לייצא ל-Google Sheets',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCellEdit = (taskId: string, field: 'name' | 'description' | 'status' | 'priority' | 'notes', currentValue: string) => {
    setEditingCell({ taskId, field, value: currentValue || '' });
  };

  const handleSaveEdit = () => {
    if (!editingCell) return;

    if (editingCell.field === 'notes' || editingCell.field === 'status') {
      updateProjectTaskMutation.mutate({
        taskId: editingCell.taskId,
        field: editingCell.field,
        value: editingCell.value,
      });
    } else {
      updateTaskMutation.mutate({
        taskId: editingCell.taskId,
        field: editingCell.field,
        value: editingCell.value,
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
  };

  const getCellValue = (task: any, field: string) => {
    const projectTask = projectTasks?.find(pt => pt.task_id === task.id);
    
    if (field === 'status') return projectTask?.status || 'pending';
    if (field === 'notes') return projectTask?.notes || '';
    if (field === 'completed') return projectTask?.completed || false;
    
    return task[field];
  };

  if (!tasks || !categories) {
    return <div className="text-center py-8">טוען...</div>;
  }

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                תצוגת טבלה
              </CardTitle>
              <CardDescription>
                ערוך משימות ישירות בטבלה וייצא ל-Excel או Google Sheets
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 ml-1" />
                ייצא ל-CSV
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4 ml-1" />
                    Google Sheets
                  </Button>
                </DialogTrigger>
                <DialogContent dir="rtl">
                  <DialogHeader>
                    <DialogTitle>חיבור ל-Google Sheets</DialogTitle>
                    <DialogDescription>
                      השתמש ב-Zapier כדי לייצא אוטומטית ל-Google Sheets
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="webhook">Zapier Webhook URL</Label>
                      <Input
                        id="webhook"
                        placeholder="https://hooks.zapier.com/hooks/catch/..."
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        dir="ltr"
                      />
                      <p className="text-xs text-muted-foreground">
                        צור Zap חדש עם Webhook Trigger ו-Google Sheets Action
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sheets-url">Google Sheets URL (אופציונלי)</Label>
                      <Input
                        id="sheets-url"
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        value={googleSheetsUrl}
                        onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                        dir="ltr"
                      />
                    </div>
                    <Button 
                      onClick={exportToGoogleSheets} 
                      disabled={isExporting}
                      className="w-full"
                    >
                      {isExporting ? (
                        <>
                          <RefreshCw className="h-4 w-4 ml-1 animate-spin" />
                          שולח...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 ml-1" />
                          ייצא ל-Google Sheets
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">✓</TableHead>
                  <TableHead>קטגוריה</TableHead>
                  <TableHead className="min-w-[200px]">משימה</TableHead>
                  <TableHead className="min-w-[250px]">תיאור</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead>עדיפות</TableHead>
                  <TableHead>חובה</TableHead>
                  <TableHead className="min-w-[200px]">הערות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => {
                  const category = categories.find(c => c.id === task.category_id);
                      const projectTask = projectTasks?.find(pt => pt.task_id === task.id);
                  const isEditing = editingCell?.taskId === task.id;
                  const taskPriority = (task.priority || 'medium') as 'low' | 'medium' | 'high' | 'urgent';

                  return (
                    <TableRow key={task.id} className="hover:bg-muted/50">
                      <TableCell className="text-center">
                        <Checkbox
                          checked={getCellValue(task, 'completed')}
                          onCheckedChange={(checked) =>
                            toggleCompletedMutation.mutate({
                              taskId: task.id,
                              completed: checked as boolean,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {category?.color && (
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                          )}
                          <span className="text-sm">{category?.display_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isEditing && editingCell.field === 'name' ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editingCell.value}
                              onChange={(e) =>
                                setEditingCell({ ...editingCell, value: e.target.value })
                              }
                              autoFocus
                              className="h-8"
                            />
                            <Button size="icon" variant="ghost" onClick={handleSaveEdit} className="h-8 w-8">
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8">
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="flex items-center gap-2 cursor-pointer group"
                            onClick={() => handleCellEdit(task.id, 'name', task.name)}
                          >
                            <span>{task.name}</span>
                            <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing && editingCell.field === 'description' ? (
                          <div className="flex items-center gap-1">
                            <Textarea
                              value={editingCell.value}
                              onChange={(e) =>
                                setEditingCell({ ...editingCell, value: e.target.value })
                              }
                              autoFocus
                              className="h-16"
                            />
                            <div className="flex flex-col gap-1">
                              <Button size="icon" variant="ghost" onClick={handleSaveEdit} className="h-8 w-8">
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8">
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className="cursor-pointer group text-sm text-muted-foreground"
                            onClick={() => handleCellEdit(task.id, 'description', task.description || '')}
                          >
                            <span>{task.description || 'לחץ להוספת תיאור'}</span>
                            <Edit2 className="h-3 w-3 inline-block mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing && editingCell.field === 'status' ? (
                          <div className="flex items-center gap-1">
                            <Select
                              value={editingCell.value}
                              onValueChange={(value) => {
                                updateProjectTaskMutation.mutate({
                                  taskId: task.id,
                                  field: 'status',
                                  value,
                                });
                              }}
                            >
                              <SelectTrigger className="h-8 w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">ממתין</SelectItem>
                                <SelectItem value="in_progress">בביצוע</SelectItem>
                                <SelectItem value="completed">הושלם</SelectItem>
                                <SelectItem value="blocked">חסום</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button size="icon" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8">
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Badge
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => handleCellEdit(task.id, 'status', getCellValue(task, 'status'))}
                          >
                            {getCellValue(task, 'status') === 'pending' && 'ממתין'}
                            {getCellValue(task, 'status') === 'in_progress' && 'בביצוע'}
                            {getCellValue(task, 'status') === 'completed' && 'הושלם'}
                            {getCellValue(task, 'status') === 'blocked' && 'חסום'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={taskPriority} />
                      </TableCell>
                      <TableCell>
                        {task.is_required && <Badge variant="secondary">חובה</Badge>}
                      </TableCell>
                      <TableCell>
                        {isEditing && editingCell.field === 'notes' ? (
                          <div className="flex items-center gap-1">
                            <Textarea
                              value={editingCell.value}
                              onChange={(e) =>
                                setEditingCell({ ...editingCell, value: e.target.value })
                              }
                              autoFocus
                              className="h-16"
                            />
                            <div className="flex flex-col gap-1">
                              <Button size="icon" variant="ghost" onClick={handleSaveEdit} className="h-8 w-8">
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8">
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className="cursor-pointer group text-sm"
                            onClick={() => handleCellEdit(task.id, 'notes', getCellValue(task, 'notes'))}
                          >
                            <span className="text-muted-foreground">
                              {getCellValue(task, 'notes') || 'לחץ להוספת הערה'}
                            </span>
                            <Edit2 className="h-3 w-3 inline-block mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
