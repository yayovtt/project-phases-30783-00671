import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, File, X } from "lucide-react";
import { Card } from "@/components/ui/card";

interface FileUploaderProps {
  projectTaskId: string;
  onUploadComplete: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/zip",
  "application/x-zip-compressed",
];

export function FileUploader({ projectTaskId, onUploadComplete }: FileUploaderProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "קובץ גדול מדי",
          description: `${file.name} גדול מ-10MB`,
          variant: "destructive",
        });
        return false;
      }
      if (!ALLOWED_TYPES.includes(file.type) && file.type !== "") {
        toast({
          title: "סוג קובץ לא נתמך",
          description: `${file.name} הוא סוג קובץ לא נתמך`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/gif": [".gif"],
      "application/zip": [".zip"],
    },
    maxSize: MAX_FILE_SIZE,
  });

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const totalFiles = selectedFiles.length;
      let uploadedCount = 0;

      for (const file of selectedFiles) {
        // Upload to storage
        const fileExt = file.name.split(".").pop();
        const fileName = `${projectTaskId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("task-files")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("task-files")
          .getPublicUrl(fileName);

        // Save to database
        const { error: dbError } = await supabase
          .from("task_attachments")
          .insert({
            project_task_id: projectTaskId,
            file_url: publicUrl,
            file_name: file.name,
            file_type: file.type || "application/octet-stream",
            file_size: file.size,
            uploaded_by: user.id,
          });

        if (dbError) throw dbError;

        uploadedCount++;
        setUploadProgress((uploadedCount / totalFiles) * 100);
      }

      toast({
        title: "הקבצים הועלו בהצלחה",
        description: `${uploadedCount} קבצים הועלו`,
      });

      setSelectedFiles([]);
      onUploadComplete();
    } catch (error: any) {
      toast({
        title: "שגיאה בהעלאת קבצים",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-lg">שחרר את הקבצים כאן...</p>
        ) : (
          <div>
            <p className="text-lg mb-2">גרור קבצים לכאן או לחץ לבחירה</p>
            <p className="text-sm text-muted-foreground">
              PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, ZIP (עד 10MB)
            </p>
          </div>
        )}
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">קבצים נבחרים ({selectedFiles.length})</h4>
          {selectedFiles.map((file, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <File className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}

          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-sm text-center text-muted-foreground">
                מעלה קבצים... {Math.round(uploadProgress)}%
              </p>
            </div>
          )}

          <Button
            onClick={uploadFiles}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? "מעלה..." : `העלה ${selectedFiles.length} קבצים`}
          </Button>
        </div>
      )}
    </div>
  );
}
