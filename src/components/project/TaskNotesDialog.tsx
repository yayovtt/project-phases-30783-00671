import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquare, Paperclip } from 'lucide-react';
import { FileUploader } from './FileUploader';
import { AttachmentsList } from './AttachmentsList';

interface TaskNotesDialogProps {
  projectTaskId: string;
  currentNotes: string | null;
  taskName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskNotesDialog({
  projectTaskId,
  currentNotes,
  taskName,
  isOpen,
  onClose,
}: TaskNotesDialogProps) {
  const [notes, setNotes] = useState(currentNotes || '');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateNotesMutation = useMutation({
    mutationFn: async (newNotes: string) => {
      const { error } = await supabase
        .from('project_tasks')
        .update({ notes: newNotes })
        .eq('id', projectTaskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks'] });
      toast({
        title: 'הערות נשמרו',
        description: 'ההערות עודכנו בהצלחה',
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בשמירת ההערות',
        variant: 'destructive',
      });
      console.error('Error updating notes:', error);
    },
  });

  const handleSave = () => {
    updateNotesMutation.mutate(notes);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh]" dir="rtl">
        <DialogHeader>
          <DialogTitle>הערות וקבצים</DialogTitle>
          <DialogDescription>
            {taskName}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="notes" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="notes" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              הערות
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-2">
              <Paperclip className="h-4 w-4" />
              קבצים מצורפים
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="space-y-4">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הוסף הערות למשימה..."
              className="min-h-[200px]"
              dir="rtl"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                ביטול
              </Button>
              <Button onClick={handleSave} disabled={updateNotesMutation.isPending}>
                {updateNotesMutation.isPending && (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                )}
                שמור הערות
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="files" className="space-y-4">
            <div className="space-y-6 max-h-[50vh] overflow-y-auto">
              <div>
                <h3 className="font-medium mb-3">העלאת קבצים</h3>
                <FileUploader
                  projectTaskId={projectTaskId}
                  onUploadComplete={() => {
                    queryClient.invalidateQueries({ queryKey: ['task-attachments', projectTaskId] });
                  }}
                />
              </div>

              <div>
                <h3 className="font-medium mb-3">קבצים קיימים</h3>
                <AttachmentsList projectTaskId={projectTaskId} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
