import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, FileText, FileSpreadsheet, FileType, File } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface FileImporterProps {
  projectId: string;
  onImportComplete?: () => void;
}

export const FileImporter = ({ projectId, onImportComplete }: FileImporterProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const processTextFile = async (file: File): Promise<string[]> => {
    const text = await file.text();
    return text.split('\n').filter(line => line.trim());
  };

  const processCSVFile = async (file: File): Promise<string[]> => {
    return new Promise((resolve) => {
      Papa.parse(file, {
        complete: (results) => {
          const tasks = results.data
            .filter((row: any) => row && row[0])
            .map((row: any) => row[0]);
          resolve(tasks);
        },
      });
    });
  };

  const processExcelFile = async (file: File): Promise<string[]> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
    return data.filter((row: any) => row && row[0]).map((row: any) => row[0]);
  };

  const processPDFFile = async (file: File): Promise<string[]> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('process-document', {
        body: formData,
      });

      if (error) throw error;
      return data.tasks || [];
    } catch (error) {
      console.error('Error processing PDF:', error);
      toast({
        title: 'שגיאה בעיבוד PDF',
        description: 'לא הצלחנו לעבד את קובץ ה-PDF',
        variant: 'destructive',
      });
      return [];
    }
  };

  const createTasksFromData = async (taskNames: string[]) => {
    try {
      // Get default category
      const { data: categories } = await supabase
        .from('categories')
        .select('id')
        .limit(1);

      if (!categories || categories.length === 0) {
        throw new Error('No categories found');
      }

      const categoryId = categories[0].id;

      // Create tasks
      for (const taskName of taskNames) {
        if (!taskName.trim()) continue;

        // Create task in tasks table
        const { data: task, error: taskError } = await supabase
          .from('tasks')
          .insert({
            name: taskName.trim(),
            category_id: categoryId,
          })
          .select()
          .single();

        if (taskError) throw taskError;

        // Link to project
        const { error: projectTaskError } = await supabase
          .from('project_tasks')
          .insert({
            project_id: projectId,
            task_id: task.id,
          });

        if (projectTaskError) throw projectTaskError;
      }

      toast({
        title: 'המשימות נוצרו בהצלחה',
        description: `${taskNames.length} משימות נוספו לפרויקט`,
      });

      onImportComplete?.();
      setOpen(false);
    } catch (error) {
      console.error('Error creating tasks:', error);
      toast({
        title: 'שגיאה ביצירת משימות',
        description: 'לא הצלחנו ליצור את המשימות',
        variant: 'destructive',
      });
    }
  };

  const processFiles = async (files: File[]) => {
    setIsProcessing(true);
    const allTasks: string[] = [];

    for (const file of files) {
      let tasks: string[] = [];

      if (file.type === 'text/plain') {
        tasks = await processTextFile(file);
      } else if (file.type === 'text/csv') {
        tasks = await processCSVFile(file);
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel'
      ) {
        tasks = await processExcelFile(file);
      } else if (file.type === 'application/pdf') {
        tasks = await processPDFFile(file);
      }

      allTasks.push(...tasks);
    }

    if (allTasks.length > 0) {
      await createTasksFromData(allTasks);
    }

    setIsProcessing(false);
    setUploadedFiles([]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles) => {
      setUploadedFiles(acceptedFiles);
      await processFiles(acceptedFiles);
    },
    accept: {
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/pdf': ['.pdf'],
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="hover-lift">
          <Upload className="ml-2 h-4 w-4" />
          ייבוא קבצים
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>ייבוא משימות מקובץ</DialogTitle>
        </DialogHeader>
        
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
            isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-lg">שחרר לייבוא הקבצים...</p>
          ) : (
            <div className="space-y-4">
              <p className="text-lg">גרור קבצים לכאן או לחץ לבחירה</p>
              <div className="flex justify-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>TXT</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileType className="h-4 w-4" />
                  <span>CSV</span>
                </div>
                <div className="flex items-center gap-1">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Excel</span>
                </div>
                <div className="flex items-center gap-1">
                  <File className="h-4 w-4" />
                  <span>PDF</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                קבצי PDF יעובדו באמצעות OCR בעברית
              </p>
            </div>
          )}
        </div>

        {isProcessing && (
          <div className="flex items-center justify-center gap-3 p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
            <span>מעבד קבצים...</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
