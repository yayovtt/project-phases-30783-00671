import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Pencil, Trash2, FolderOpen, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const FOLDER_COLORS = [
  '#6B7280', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'
];

interface Folder {
  id: string;
  name: string;
  color: string;
  order_index: number;
}

export const ManageFoldersDialog = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(FOLDER_COLORS[0]);

  const { data: folders } = useQuery({
    queryKey: ['folders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_folders')
        .select('*')
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data as Folder[];
    },
  });

  const updateFolder = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      const { error } = await supabase
        .from('project_folders')
        .update({ name, color })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setEditingFolder(null);
      toast({ title: 'התיקייה עודכנה בהצלחה' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'שגיאה בעדכון תיקייה', 
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  const deleteFolder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('project_folders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'התיקייה נמחקה בהצלחה' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'שגיאה במחיקת תיקייה', 
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  const handleEdit = (folder: Folder) => {
    setEditingFolder(folder);
    setEditName(folder.name);
    setEditColor(folder.color);
  };

  const handleSave = () => {
    if (!editingFolder || !editName.trim()) return;
    updateFolder.mutate({ id: editingFolder.id, name: editName, color: editColor });
  };

  const handleCancel = () => {
    setEditingFolder(null);
    setEditName('');
    setEditColor(FOLDER_COLORS[0]);
  };

  if (!folders || folders.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="hover-lift">
          <Settings className="ml-2 h-4 w-4" />
          נהל תיקיות
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>ניהול תיקיות</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 max-h-[60vh] overflow-y-auto">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="flex items-center justify-between p-3 bg-card rounded-lg border hover:shadow-md transition-all"
            >
              {editingFolder?.id === folder.id ? (
                <div className="flex-1 flex items-center gap-3">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1"
                    placeholder="שם התיקייה"
                    disabled={updateFolder.isPending}
                  />
                  <div className="flex gap-1">
                    {FOLDER_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setEditColor(color)}
                        disabled={updateFolder.isPending}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          editColor === color ? 'scale-125 ring-2 ring-primary' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <Button 
                    size="sm" 
                    onClick={handleSave}
                    disabled={updateFolder.isPending}
                  >
                    {updateFolder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    שמור
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancel}>
                    ביטול
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-5 w-5" style={{ color: folder.color }} />
                    <span className="font-medium">{folder.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(folder)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteFolder.mutate(folder.id)}
                      disabled={deleteFolder.isPending}
                    >
                      {deleteFolder.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
