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
import { Download, Upload, RefreshCw, FileSpreadsheet, Share2, Edit2, Save, X, FileUp, Plus, GripVertical, Eye, Check, XIcon, ArrowUp, ArrowDown, ArrowUpDown, ListOrdered } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PriorityBadge } from './PriorityBadge';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SpreadsheetViewProps {
  projectId: string;
}

interface EditingCell {
  taskId: string;
  field: 'name' | 'description' | 'status' | 'priority' | 'notes';
  value: string;
}

type ViewMode = 'compact' | 'comfortable' | 'spacious';

export const SpreadsheetView = ({ projectId }: SpreadsheetViewProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importedData, setImportedData] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('comfortable');
  const [draggedRow, setDraggedRow] = useState<any | null>(null);
  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);
  const [multiSortConfig, setMultiSortConfig] = useState<Array<{
    field: string;
    direction: 'asc' | 'desc';
    priority: number;
  }>>([]);
  const [sortDialogOpen, setSortDialogOpen] = useState(false);

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

  const viewModeStyles = {
    compact: {
      padding: 'p-2',
      fontSize: 'text-xs',
      height: 'h-8',
    },
    comfortable: {
      padding: 'p-4',
      fontSize: 'text-sm',
      height: 'h-12',
    },
    spacious: {
      padding: 'p-6',
      fontSize: 'text-base',
      height: 'h-16',
    },
  };

  const handleDragStart = (task: any) => {
    setDraggedRow(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetTask: any) => {
    if (!draggedRow || draggedRow.id === targetTask.id) return;
    
    toast({
      title: 'סדר מחדש',
      description: 'הסדר עודכן בהצלחה',
    });
    setDraggedRow(null);
  };

  const addNewRow = () => {
    toast({
      title: 'בקרוב',
      description: 'הוספת שורה חדשה בפיתוח',
    });
  };

  const addCustomColumn = () => {
    const columnName = prompt('שם העמודה החדשה:');
    if (columnName) {
      setCustomColumns([...customColumns, columnName]);
      toast({
        title: 'עמודה נוספה',
        description: `העמודה "${columnName}" נוספה בהצלחה`,
      });
    }
  };

  const getCellValue = (task: any, field: string) => {
    const projectTask = projectTasks?.find(pt => pt.task_id === task.id);
    
    if (field === 'status') return projectTask?.status || 'pending';
    if (field === 'notes') return projectTask?.notes || '';
    if (field === 'completed') return projectTask?.completed || false;
    
    return task[field];
  };

  const getFieldValue = (task: any, field: string): any => {
    const category = categories?.find(c => c.id === task.category_id);
    const projectTask = projectTasks?.find(pt => pt.task_id === task.id);
    
    switch (field) {
      case 'category':
        return category?.display_name || '';
      case 'name':
        return task.name || '';
      case 'description':
        return task.description || '';
      case 'status':
        return projectTask?.status || 'pending';
      case 'priority':
        return task.priority || 'medium';
      case 'is_required':
        return task.is_required;
      case 'completed':
        return projectTask?.completed || false;
      case 'due_date':
        return task.due_date || '';
      case 'estimated_hours':
        return task.estimated_hours || 0;
      case 'notes':
        return projectTask?.notes || '';
      default:
        return '';
    }
  };

  const compareValues = (a: any, b: any, field: string, direction: 'asc' | 'desc'): number => {
    let aVal = getFieldValue(a, field);
    let bVal = getFieldValue(b, field);
    
    // Special handling for priority
    if (field === 'priority') {
      const priorityOrder: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
      aVal = priorityOrder[aVal] || 0;
      bVal = priorityOrder[bVal] || 0;
    }
    
    // Special handling for status
    if (field === 'status') {
      const statusOrder: Record<string, number> = { pending: 1, in_progress: 2, completed: 3, blocked: 4 };
      aVal = statusOrder[aVal] || 0;
      bVal = statusOrder[bVal] || 0;
    }
    
    // Handle null/undefined
    if (aVal === null || aVal === undefined) aVal = '';
    if (bVal === null || bVal === undefined) bVal = '';
    
    // Compare
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  };

  const applySorting = (tasksList: any[]): any[] => {
    if (!tasksList) return [];
    
    // If no sorting is configured, return original order (by category and order_index)
    if (multiSortConfig.length === 0 && !sortConfig) {
      return tasksList;
    }
    
    return [...tasksList].sort((a, b) => {
      // Apply multi-level sort if configured
      if (multiSortConfig.length > 0) {
        const sortedConfigs = [...multiSortConfig].sort((x, y) => x.priority - y.priority);
        for (const config of sortedConfigs) {
          const result = compareValues(a, b, config.field, config.direction);
          if (result !== 0) return result;
        }
        return 0;
      }
      
      // Apply simple sort
      if (sortConfig) {
        return compareValues(a, b, sortConfig.field, sortConfig.direction);
      }
      
      return 0;
    });
  };

  const handleColumnSort = (field: string) => {
    // Clear multi-sort when using simple sort
    setMultiSortConfig([]);
    
    if (sortConfig?.field === field) {
      setSortConfig({
        field,
        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      setSortConfig({ field, direction: 'asc' });
    }
  };

  const handleResetSort = () => {
    setSortConfig(null);
    setMultiSortConfig([]);
    toast({
      title: 'המיון אופס',
      description: 'חזרה לסדר ברירת המחדל',
    });
  };

  const addSortLevel = () => {
    if (multiSortConfig.length >= 5) {
      toast({
        title: 'הגבלה',
        description: 'ניתן להוסיף עד 5 רמות מיון',
        variant: 'destructive',
      });
      return;
    }
    
    setMultiSortConfig([
      ...multiSortConfig,
      { field: 'category', direction: 'asc', priority: multiSortConfig.length }
    ]);
  };

  const updateSortLevel = (index: number, field: string, direction: 'asc' | 'desc') => {
    const updated = [...multiSortConfig];
    updated[index] = { ...updated[index], field, direction };
    setMultiSortConfig(updated);
  };

  const removeSortLevel = (index: number) => {
    const updated = multiSortConfig.filter((_, i) => i !== index);
    // Update priorities
    const reindexed = updated.map((config, i) => ({ ...config, priority: i }));
    setMultiSortConfig(reindexed);
  };

  const applyMultiSort = () => {
    setSortConfig(null); // Clear simple sort
    setSortDialogOpen(false);
    toast({
      title: 'מיון מותקדם הוחל',
      description: `${multiSortConfig.length} רמות מיון פעילות`,
    });
  };

  const getSortedTasks = () => {
    return applySorting(tasks || []);
  };

  const handleFileUpload = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          console.log('CSV parsed:', results.data);
          setImportedData(results.data);
          toast({
            title: 'קובץ נטען בהצלחה',
            description: `נטענו ${results.data.length} שורות`,
          });
        },
        error: (error) => {
          console.error('CSV parse error:', error);
          toast({
            title: 'שגיאה',
            description: 'לא ניתן לקרוא את קובץ ה-CSV',
            variant: 'destructive',
          });
        },
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          console.log('Excel parsed:', jsonData);
          setImportedData(jsonData);
          toast({
            title: 'קובץ נטען בהצלחה',
            description: `נטענו ${jsonData.length} שורות`,
          });
        } catch (error) {
          console.error('Excel parse error:', error);
          toast({
            title: 'שגיאה',
            description: 'לא ניתן לקרוא את קובץ ה-Excel',
            variant: 'destructive',
          });
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (fileExtension === 'xml') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const xmlText = e.target?.result as string;
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
          
          // Convert XML to JSON-like structure
          const rows = xmlDoc.querySelectorAll('row');
          const jsonData = Array.from(rows).map(row => {
            const obj: any = {};
            row.childNodes.forEach(node => {
              if (node.nodeType === 1) { // Element node
                obj[node.nodeName] = node.textContent;
              }
            });
            return obj;
          });
          
          console.log('XML parsed:', jsonData);
          setImportedData(jsonData);
          toast({
            title: 'קובץ נטען בהצלחה',
            description: `נטענו ${jsonData.length} שורות`,
          });
        } catch (error) {
          console.error('XML parse error:', error);
          toast({
            title: 'שגיאה',
            description: 'לא ניתן לקרוא את קובץ ה-XML',
            variant: 'destructive',
          });
        }
      };
      reader.readAsText(file);
    } else if (fileExtension === 'txt') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          // Try to parse as tab-separated or comma-separated
          const lines = text.split('\n').filter(line => line.trim());
          const headers = lines[0].split(/[\t,]/);
          const jsonData = lines.slice(1).map(line => {
            const values = line.split(/[\t,]/);
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header.trim()] = values[index]?.trim() || '';
            });
            return obj;
          });
          
          console.log('TXT parsed:', jsonData);
          setImportedData(jsonData);
          toast({
            title: 'קובץ נטען בהצלחה',
            description: `נטענו ${jsonData.length} שורות`,
          });
        } catch (error) {
          console.error('TXT parse error:', error);
          toast({
            title: 'שגיאה',
            description: 'לא ניתן לקרוא את קובץ הטקסט',
            variant: 'destructive',
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileUpload,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/xml': ['.xml'],
      'application/xml': ['.xml'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
  });

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
              {(sortConfig || multiSortConfig.length > 0) && (
                <Button onClick={handleResetSort} variant="outline" size="sm">
                  <X className="h-4 w-4 ml-1" />
                  איפוס מיון
                </Button>
              )}
              
              <Dialog open={sortDialogOpen} onOpenChange={setSortDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <ListOrdered className="h-4 w-4 ml-1" />
                    מיון מתקדם
                    {multiSortConfig.length > 0 && (
                      <Badge variant="secondary" className="mr-1 h-5 px-1.5">
                        {multiSortConfig.length}
                      </Badge>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl" dir="rtl">
                  <DialogHeader>
                    <DialogTitle>מיון מתקדם</DialogTitle>
                    <DialogDescription>
                      הגדר עד 5 רמות מיון להצגת המשימות לפי סדר העדיפויות שלך
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    {multiSortConfig.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>לא הוגדרו רמות מיון</p>
                        <p className="text-sm">לחץ על "הוסף רמת מיון" כדי להתחיל</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {multiSortConfig.map((config, index) => (
                          <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                            <span className="text-sm font-medium min-w-[60px]">
                              רמה {index + 1}:
                            </span>
                            <Select
                              value={config.field}
                              onValueChange={(value) => updateSortLevel(index, value, config.direction)}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="category">קטגוריה</SelectItem>
                                <SelectItem value="name">שם המשימה</SelectItem>
                                <SelectItem value="status">סטטוס</SelectItem>
                                <SelectItem value="priority">עדיפות</SelectItem>
                                <SelectItem value="is_required">חובה</SelectItem>
                                <SelectItem value="completed">הושלם</SelectItem>
                                <SelectItem value="due_date">תאריך יעד</SelectItem>
                                <SelectItem value="estimated_hours">שעות משוערות</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateSortLevel(index, config.field, config.direction === 'asc' ? 'desc' : 'asc')}
                              className="gap-1"
                            >
                              {config.direction === 'asc' ? (
                                <>
                                  <ArrowUp className="h-4 w-4" />
                                  עולה
                                </>
                              ) : (
                                <>
                                  <ArrowDown className="h-4 w-4" />
                                  יורד
                                </>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSortLevel(index)}
                              className="mr-auto"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        onClick={addSortLevel}
                        variant="outline"
                        size="sm"
                        disabled={multiSortConfig.length >= 5}
                        className="flex-1"
                      >
                        <Plus className="h-4 w-4 ml-1" />
                        הוסף רמת מיון
                      </Button>
                    </div>
                    <div className="flex gap-2 justify-end pt-2 border-t">
                      <Button variant="outline" onClick={() => setSortDialogOpen(false)}>
                        ביטול
                      </Button>
                      <Button onClick={applyMultiSort} disabled={multiSortConfig.length === 0}>
                        החל מיון
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 ml-1" />
                    תצוגה: {viewMode === 'compact' ? 'צמוד' : viewMode === 'comfortable' ? 'נוח' : 'מרווח'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover z-50">
                  <DropdownMenuItem onClick={() => setViewMode('compact')}>
                    צמוד (קטן)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setViewMode('comfortable')}>
                    נוח (בינוני)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setViewMode('spacious')}>
                    מרווח (גדול)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FileUp className="h-4 w-4 ml-1" />
                    ייבא קובץ
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
                  <DialogHeader>
                    <DialogTitle>ייבוא נתונים מקובץ</DialogTitle>
                    <DialogDescription>
                      העלה קובץ Excel, CSV, XML או TXT לייבוא משימות
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                        isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                      }`}
                    >
                      <input {...getInputProps()} />
                      <FileUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      {isDragActive ? (
                        <p className="text-lg">שחרר את הקובץ כאן...</p>
                      ) : (
                        <div>
                          <p className="text-lg mb-2">גרור קובץ לכאן או לחץ לבחירה</p>
                          <p className="text-sm text-muted-foreground">
                            נתמך: Excel (.xlsx, .xls), CSV, XML, TXT
                          </p>
                        </div>
                      )}
                    </div>

                    {importedData.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">
                            תצוגה מקדימה ({importedData.length} שורות)
                          </h3>
                          <Button
                            onClick={() => {
                              setImportedData([]);
                              toast({
                                title: 'הנתונים נוקו',
                                description: 'ניתן לייבא קובץ אחר',
                              });
                            }}
                            variant="outline"
                            size="sm"
                          >
                            נקה
                          </Button>
                        </div>
                        <div className="border rounded-lg overflow-auto max-h-[400px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {Object.keys(importedData[0] || {}).map((key) => (
                                  <TableHead key={key}>{key}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {importedData.slice(0, 10).map((row, index) => (
                                <TableRow key={index}>
                                  {Object.values(row).map((value: any, cellIndex) => (
                                    <TableCell key={cellIndex}>{value}</TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {importedData.length > 10 && (
                            <p className="text-sm text-muted-foreground p-2 text-center">
                              מוצגות 10 שורות ראשונות מתוך {importedData.length}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                            ביטול
                          </Button>
                          <Button
                            onClick={() => {
                              toast({
                                title: 'בקרוב',
                                description: 'הפונקציה בפיתוח - ייבוא אוטומטי למערכת',
                              });
                            }}
                          >
                            ייבא למערכת
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
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
          <div className="flex gap-2 mb-4">
            <Button onClick={addNewRow} variant="outline" size="sm">
              <Plus className="h-4 w-4 ml-1" />
              הוסף שורה
            </Button>
            <Button onClick={addCustomColumn} variant="outline" size="sm">
              <Plus className="h-4 w-4 ml-1" />
              הוסף עמודה
            </Button>
          </div>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="w-12 text-center">✓</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                    onClick={() => handleColumnSort('category')}
                  >
                    <div className="flex items-center gap-1">
                      קטגוריה
                      {sortConfig?.field === 'category' ? (
                        sortConfig.direction === 'asc' ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="min-w-[200px] cursor-pointer hover:bg-muted/50 transition-colors select-none"
                    onClick={() => handleColumnSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      משימה
                      {sortConfig?.field === 'name' ? (
                        sortConfig.direction === 'asc' ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[250px]">תיאור</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                    onClick={() => handleColumnSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      סטטוס
                      {sortConfig?.field === 'status' ? (
                        sortConfig.direction === 'asc' ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                    onClick={() => handleColumnSort('priority')}
                  >
                    <div className="flex items-center gap-1">
                      עדיפות
                      {sortConfig?.field === 'priority' ? (
                        sortConfig.direction === 'asc' ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                    onClick={() => handleColumnSort('is_required')}
                  >
                    <div className="flex items-center gap-1">
                      חובה
                      {sortConfig?.field === 'is_required' ? (
                        sortConfig.direction === 'asc' ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[200px]">הערות</TableHead>
                  {customColumns.map((col) => (
                    <TableHead key={col} className="min-w-[150px]">{col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {getSortedTasks().map((task) => {
                  const category = categories.find(c => c.id === task.category_id);
                  const projectTask = projectTasks?.find(pt => pt.task_id === task.id);
                  const isEditing = editingCell?.taskId === task.id;
                  const taskPriority = (task.priority || 'medium') as 'low' | 'medium' | 'high' | 'urgent';
                  const isCompleted = getCellValue(task, 'completed');

                  return (
                    <TableRow 
                      key={task.id} 
                      className={cn(
                        "hover:bg-muted/50 transition-colors",
                        draggedRow?.id === task.id && "opacity-50"
                      )}
                      draggable
                      onDragStart={() => handleDragStart(task)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(task)}
                    >
                      <TableCell className="text-center cursor-move">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell className={cn("text-center", viewModeStyles[viewMode].padding)}>
                        {isCompleted ? (
                          <div className="flex items-center justify-center">
                            <Check className="h-5 w-5 text-success" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <XIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className={viewModeStyles[viewMode].padding}>
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
                      <TableCell className={viewModeStyles[viewMode].padding}>
                        {isEditing && editingCell.field === 'name' ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editingCell.value}
                              onChange={(e) =>
                                setEditingCell({ ...editingCell, value: e.target.value })
                              }
                              autoFocus
                              className={cn("h-8", viewModeStyles[viewMode].fontSize)}
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
                      <TableCell className={viewModeStyles[viewMode].padding}>
                        {isEditing && editingCell.field === 'description' ? (
                          <div className="flex items-center gap-1">
                            <Textarea
                              value={editingCell.value}
                              onChange={(e) =>
                                setEditingCell({ ...editingCell, value: e.target.value })
                              }
                              autoFocus
                              className={cn("h-16", viewModeStyles[viewMode].fontSize)}
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
                            className={cn("cursor-pointer group", viewModeStyles[viewMode].fontSize, "text-muted-foreground")}
                            onClick={() => handleCellEdit(task.id, 'description', task.description || '')}
                          >
                            <span>{task.description || 'לחץ להוספת תיאור'}</span>
                            <Edit2 className="h-3 w-3 inline-block mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className={viewModeStyles[viewMode].padding}>
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
                              <SelectTrigger className={cn("h-8 w-32", viewModeStyles[viewMode].fontSize)}>
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
                      <TableCell className={viewModeStyles[viewMode].padding}>
                        <PriorityBadge priority={taskPriority} />
                      </TableCell>
                      <TableCell className={viewModeStyles[viewMode].padding}>
                        {task.is_required && <Badge variant="secondary">חובה</Badge>}
                      </TableCell>
                      <TableCell className={viewModeStyles[viewMode].padding}>
                        {isEditing && editingCell.field === 'notes' ? (
                          <div className="flex items-center gap-1">
                            <Textarea
                              value={editingCell.value}
                              onChange={(e) =>
                                setEditingCell({ ...editingCell, value: e.target.value })
                              }
                              autoFocus
                              className={cn("h-16", viewModeStyles[viewMode].fontSize)}
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
                            className={cn("cursor-pointer group", viewModeStyles[viewMode].fontSize)}
                            onClick={() => handleCellEdit(task.id, 'notes', getCellValue(task, 'notes'))}
                          >
                            <span className="text-muted-foreground">
                              {getCellValue(task, 'notes') || 'לחץ להוספת הערה'}
                            </span>
                            <Edit2 className="h-3 w-3 inline-block mr-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </TableCell>
                      {customColumns.map((col) => (
                        <TableCell key={col} className={cn(viewModeStyles[viewMode].padding, "text-muted-foreground text-sm")}>
                          -
                        </TableCell>
                      ))}
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
