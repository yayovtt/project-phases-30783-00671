import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  FileImage,
  FileArchive,
  File as FileIcon,
  Download,
  Trash2,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FilePreview } from "./FilePreview";

interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  uploaded_by: string;
}

interface AttachmentsListProps {
  projectTaskId: string;
}

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith("image/")) return FileImage;
  if (fileType.includes("pdf")) return FileText;
  if (fileType.includes("zip") || fileType.includes("compressed")) return FileArchive;
  if (fileType.includes("word") || fileType.includes("document")) return FileText;
  if (fileType.includes("excel") || fileType.includes("spreadsheet")) return FileText;
  return FileIcon;
};

export function AttachmentsList({ projectTaskId }: AttachmentsListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null);

  const { data: attachments, isLoading } = useQuery({
    queryKey: ["task-attachments", projectTaskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_attachments")
        .select("*")
        .eq("project_task_id", projectTaskId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      return data as Attachment[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const attachment = attachments?.find((a) => a.id === attachmentId);
      if (!attachment) throw new Error("Attachment not found");

      // Extract file path from URL
      const urlParts = attachment.file_url.split("/");
      const filePath = urlParts.slice(-2).join("/");

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("task-files")
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("task_attachments")
        .delete()
        .eq("id", attachmentId);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-attachments", projectTaskId] });
      toast({ title: "הקובץ נמחק בהצלחה" });
      setDeletingId(null);
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה במחיקת הקובץ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDownload = async (attachment: Attachment) => {
    try {
      const response = await fetch(attachment.file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      toast({
        title: "שגיאה בהורדת הקובץ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </Card>
        ))}
      </div>
    );
  }

  if (!attachments || attachments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>אין קבצים מצורפים</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {attachments.map((attachment) => {
          const Icon = getFileIcon(attachment.file_type);
          const canPreview = attachment.file_type.startsWith("image/") || 
                            attachment.file_type.includes("pdf");

          return (
            <Card key={attachment.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{attachment.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(attachment.file_size / 1024).toFixed(1)} KB •{" "}
                      {format(new Date(attachment.uploaded_at), "d/M/yy HH:mm", {
                        locale: he,
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex gap-1 shrink-0">
                  {canPreview && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewFile(attachment)}
                      title="תצוגה מקדימה"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(attachment)}
                    title="הורדה"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingId(attachment.id)}
                    title="מחיקה"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>האם למחוק את הקובץ?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את הקובץ לצמיתות ולא ניתן לבטל אותה.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {previewFile && (
        <FilePreview
          fileUrl={previewFile.file_url}
          fileName={previewFile.file_name}
          fileType={previewFile.file_type}
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </>
  );
}
