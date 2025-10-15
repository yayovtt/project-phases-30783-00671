import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FilePreviewProps {
  fileUrl: string;
  fileName: string;
  fileType: string;
  isOpen: boolean;
  onClose: () => void;
}

export function FilePreview({
  fileUrl,
  fileName,
  fileType,
  isOpen,
  onClose,
}: FilePreviewProps) {
  const isImage = fileType.startsWith("image/");
  const isPdf = fileType.includes("pdf");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]" dir="rtl">
        <DialogHeader>
          <DialogTitle>{fileName}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[70vh]">
          {isImage && (
            <img
              src={fileUrl}
              alt={fileName}
              className="w-full h-auto rounded-lg"
            />
          )}

          {isPdf && (
            <iframe
              src={fileUrl}
              className="w-full h-[70vh] rounded-lg"
              title={fileName}
            />
          )}

          {!isImage && !isPdf && (
            <div className="text-center py-12 text-muted-foreground">
              <p>תצוגה מקדימה אינה זמינה לסוג קובץ זה</p>
              <p className="text-sm mt-2">השתמש בכפתור ההורדה לצפייה בקובץ</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
