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
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

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
      <DialogContent className="sm:max-w-[525px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>הערות למשימה</DialogTitle>
          <DialogDescription>
            {taskName}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="הוסף הערות למשימה..."
            className="min-h-[150px]"
            dir="rtl"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            ביטול
          </Button>
          <Button onClick={handleSave} disabled={updateNotesMutation.isPending}>
            {updateNotesMutation.isPending && (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            )}
            שמור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
