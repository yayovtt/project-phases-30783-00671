import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload, FileJson, FileSpreadsheet, File, CheckCircle2, Calendar as CalendarIcon, FileCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

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

      // Get project tasks with all relations
      const { data: projectTasks } = await supabase
        .from('project_tasks')
        .select('*, tasks(*)')
        .eq('project_id', projectId);

      // Get attachments
      const { data: attachments } = await supabase
        .from('task_attachments')
        .select('*')
        .in('project_task_id', projectTasks?.map(pt => pt.id) || []);

      // Get reminders
      const { data: reminders } = await supabase
        .from('task_reminders')
        .select('*')
        .in('project_task_id', projectTasks?.map(pt => pt.id) || []);

      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        project,
        tasks: projectTasks,
        attachments: attachments?.map(att => ({
          ...att,
          file_url: null, // Don't export actual file URLs for security
        })),
        reminders,
        metadata: {
          total_tasks: projectTasks?.length || 0,
          completed_tasks: projectTasks?.filter(t => t.completed).length || 0,
          total_attachments: attachments?.length || 0,
          total_reminders: reminders?.length || 0,
        }
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-${project?.client_name || projectId}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'יוצא בהצלחה',
        description: `${projectTasks?.length || 0} משימות, ${attachments?.length || 0} קבצים, ${reminders?.length || 0} תזכורות`,
      });
    } catch (error) {
      console.error('Export error:', error);
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
        .select('*, tasks(name, description, priority, category_id, categories(display_name))')
        .eq('project_id', projectId);

      let csv = 'שם משימה,תיאור,קטגוריה,עדיפות,סטטוס,הערות,תאריך התחלה,תאריך השלמה,שעות בפועל,שעות מוערכות\n';
      
      projectTasks?.forEach((pt: any) => {
        const task = pt.tasks;
        const category = task?.categories?.display_name || '';
        csv += `"${task?.name || ''}","${task?.description || ''}","${category}","${task?.priority || ''}","${pt.status}","${pt.notes || ''}","${pt.started_at || ''}","${pt.completed_at || ''}","${pt.actual_hours || 0}","${task?.estimated_hours || 0}"\n`;
      });

      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-tasks-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'יוצא בהצלחה',
        description: `${projectTasks?.length || 0} משימות יוצאו לקובץ CSV`,
      });
    } catch (error) {
      console.error('CSV export error:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לייצא את הנתונים',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportICalendar = async () => {
    setIsExporting(true);
    try {
      const { data: projectTasks } = await supabase
        .from('project_tasks')
        .select('*, tasks(name, description, priority)')
        .eq('project_id', projectId)
        .not('due_date_override', 'is', null);

      let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Project Manager//iCal//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
      ];

      projectTasks?.forEach((pt: any) => {
        const task = pt.tasks;
        const startDate = pt.started_at ? new Date(pt.started_at) : new Date();
        const endDate = new Date(pt.due_date_override);
        
        icsContent.push('BEGIN:VEVENT');
        icsContent.push(`UID:${pt.id}@projectmanager.com`);
        icsContent.push(`DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`);
        icsContent.push(`DTSTART:${format(startDate, "yyyyMMdd'T'HHmmss'Z'")}`);
        icsContent.push(`DTEND:${format(endDate, "yyyyMMdd'T'HHmmss'Z'")}`);
        icsContent.push(`SUMMARY:${task?.name || 'משימה'}`);
        icsContent.push(`DESCRIPTION:${task?.description || ''}`);
        icsContent.push(`PRIORITY:${task?.priority === 'urgent' ? '1' : task?.priority === 'high' ? '3' : '5'}`);
        icsContent.push(`STATUS:${pt.completed ? 'COMPLETED' : 'NEEDS-ACTION'}`);
        icsContent.push('END:VEVENT');
      });

      icsContent.push('END:VCALENDAR');
      
      const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-calendar-${new Date().toISOString().split('T')[0]}.ics`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: 'יוצא בהצלחה',
        description: 'קובץ לוח השנה נוצר',
      });
    } catch (error) {
      console.error('iCalendar export error:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לייצא לוח שנה',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMSProject = async () => {
    setIsExporting(true);
    try {
      const { data: projectTasks } = await supabase
        .from('project_tasks')
        .select('*, tasks(name, description, priority, estimated_hours)')
        .eq('project_id', projectId);

      let xmlContent = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<Project xmlns="http://schemas.microsoft.com/project">',
        '  <Tasks>',
      ];

      projectTasks?.forEach((pt: any, index: number) => {
        const task = pt.tasks;
        xmlContent.push('    <Task>');
        xmlContent.push(`      <UID>${index + 1}</UID>`);
        xmlContent.push(`      <ID>${index + 1}</ID>`);
        xmlContent.push(`      <Name>${task?.name || 'משימה'}</Name>`);
        xmlContent.push(`      <PercentComplete>${pt.progress || 0}</PercentComplete>`);
        xmlContent.push(`      <Priority>${task?.priority === 'urgent' ? '1000' : task?.priority === 'high' ? '800' : '500'}</Priority>`);
        if (pt.started_at) {
          xmlContent.push(`      <Start>${format(new Date(pt.started_at), 'yyyy-MM-dd')}</Start>`);
        }
        if (pt.due_date_override) {
          xmlContent.push(`      <Finish>${format(new Date(pt.due_date_override), 'yyyy-MM-dd')}</Finish>`);
        }
        xmlContent.push(`      <Work>PT${task?.estimated_hours || 0}H</Work>`);
        xmlContent.push(`      <ActualWork>PT${pt.actual_hours || 0}H</ActualWork>`);
        xmlContent.push('    </Task>');
      });

      xmlContent.push('  </Tasks>');
      xmlContent.push('</Project>');
      
      const blob = new Blob([xmlContent.join('\n')], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-${new Date().toISOString().split('T')[0]}.xml`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: 'יוצא בהצלחה',
        description: 'קובץ MS Project נוצר',
      });
    } catch (error) {
      console.error('MS Project export error:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לייצא MS Project',
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
          <Button
            onClick={handleExportICalendar}
            disabled={isExporting}
            className="w-full justify-start"
            variant="outline"
          >
            <CalendarIcon className="ml-2 h-4 w-4" />
            ייצא כ-iCalendar (.ics)
          </Button>
          <Button
            onClick={handleExportMSProject}
            disabled={isExporting}
            className="w-full justify-start"
            variant="outline"
          >
            <FileCode className="ml-2 h-4 w-4" />
            ייצא ל-Microsoft Project (.xml)
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
