import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FolderPlus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const FOLDER_COLORS = [
  '#6B7280', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'
];

export const CreateFolderDialog = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0]);

  const createFolder = useMutation({
    mutationFn: async () => {
      const { data: existingFolders } = await supabase
        .from('project_folders')
        .select('order_index')
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrderIndex = existingFolders?.[0]?.order_index ? existingFolders[0].order_index + 1 : 0;

      const { error } = await supabase.from('project_folders').insert({
        name: folderName,
        color: selectedColor,
        created_by: user?.id,
        order_index: nextOrderIndex,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setFolderName('');
      setSelectedColor(FOLDER_COLORS[0]);
      setOpen(false);
      toast({ title: 'התיקייה נוצרה בהצלחה' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'שגיאה ביצירת תיקייה', 
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  const handleSubmit = () => {
    if (!folderName.trim()) {
      toast({ 
        title: 'שגיאה', 
        description: 'יש להזין שם תיקייה',
        variant: 'destructive'
      });
      return;
    }
    createFolder.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="hover-lift">
          <FolderPlus className="ml-2 h-4 w-4" />
          תיקייה חדשה
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>תיקייה חדשה</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">שם התיקייה</label>
            <Input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="הכנס שם תיקייה"
              className="mt-2"
              disabled={createFolder.isPending}
            />
          </div>
          <div>
            <label className="text-sm font-medium">צבע</label>
            <div className="flex gap-2 mt-2">
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  disabled={createFolder.isPending}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    selectedColor === color ? 'scale-125 ring-2 ring-primary' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <Button 
            onClick={handleSubmit} 
            className="w-full"
            disabled={createFolder.isPending}
          >
            {createFolder.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            צור תיקייה
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
