import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload, FileJson, FileSpreadsheet, File, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ExportImportProps {
  projectId: string;
}

export const ExportImport = ({ projectId }: ExportImportProps) => {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      // Get project data
      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      // Get project tasks
      const { data: projectTasks } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('project_id', projectId);

      const exportData = {
        project,
        tasks: projectTasks,
        exportDate: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-${projectId}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();

      toast({
        title: 'יוצא בהצלחה',
        description: 'הקובץ הורד למחשב',
      });
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לייצא את הנתונים',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const { data: projectTasks } = await supabase
        .from('project_tasks')
        .select('*, tasks(*), categories:tasks(category:categories(*))')
        .eq('project_id', projectId);

      let csv = 'שם משימה,קטגוריה,סטטוס,הערות,תאריך השלמה\n';
      
      projectTasks?.forEach((pt: any) => {
        const task = pt.tasks;
        csv += `"${task?.name || ''}","${task?.category?.display_name || ''}","${pt.status}","${pt.notes || ''}","${pt.completed_at || ''}"\n`;
      });

      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-${projectId}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();

      toast({
        title: 'יוצא בהצלחה',
        description: 'קובץ CSV הורד למחשב',
      });
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לייצא את הנתונים',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.tasks && Array.isArray(data.tasks)) {
        for (const task of data.tasks) {
          await supabase.from('project_tasks').upsert({
            project_id: projectId,
            task_id: task.task_id,
            completed: task.completed,
            status: task.status,
            notes: task.notes,
          });
        }

        toast({
          title: 'יובא בהצלחה',
          description: `${data.tasks.length} משימות יובאו`,
        });
      }
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: 'פורמט קובץ לא תקין',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            יצוא נתונים
          </CardTitle>
          <CardDescription>
            ייצא את נתוני הפרויקט לקובץ חיצוני
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleExportJSON}
            disabled={isExporting}
            className="w-full justify-start"
            variant="outline"
          >
            <FileJson className="ml-2 h-4 w-4" />
            ייצא כ-JSON (כולל כל הנתונים)
          </Button>
          <Button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="w-full justify-start"
            variant="outline"
          >
            <FileSpreadsheet className="ml-2 h-4 w-4" />
            ייצא כ-CSV (לאקסל)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            יבוא נתונים
          </CardTitle>
          <CardDescription>
            ייבא נתוני משימות מקובץ JSON
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
              <input
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                className="hidden"
                id="import-file"
                disabled={isImporting}
              />
              <label htmlFor="import-file" className="cursor-pointer">
                <File className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium">לחץ לבחירת קובץ JSON</p>
                <p className="text-xs text-muted-foreground mt-1">
                  או גרור ושחרר כאן
                </p>
              </label>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p>היבוא ישמור את כל המשימות הקיימות</p>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p>משימות כפולות יעודכנו אוטומטית</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
