import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FolderPlus, FolderOpen, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Folder {
  id: string;
  name: string;
  color: string;
  order_index: number;
  created_at: string;
}

const FOLDER_COLORS = [
  '#6B7280', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'
];

export const FolderManager = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0]);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);

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

  const createFolder = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('project_folders').insert({
        name,
        color: selectedColor,
        created_by: user?.id,
        order_index: (folders?.length || 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setNewFolderName('');
      setSelectedColor(FOLDER_COLORS[0]);
      setOpen(false);
      toast({ title: 'התיקייה נוצרה בהצלחה' });
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
      setOpen(false);
      toast({ title: 'התיקייה עודכנה בהצלחה' });
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
  });

  const handleSubmit = () => {
    if (!newFolderName.trim()) return;
    
    if (editingFolder) {
      updateFolder.mutate({ id: editingFolder.id, name: newFolderName, color: selectedColor });
    } else {
      createFolder.mutate(newFolderName);
    }
  };

  const handleEdit = (folder: Folder) => {
    setEditingFolder(folder);
    setNewFolderName(folder.name);
    setSelectedColor(folder.color);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingFolder(null);
    setNewFolderName('');
    setSelectedColor(FOLDER_COLORS[0]);
  };

  return (
    <div className="space-y-4">
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogTrigger asChild>
          <Button variant="outline" className="hover-lift">
            <FolderPlus className="ml-2 h-4 w-4" />
            תיקייה חדשה
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFolder ? 'עריכת תיקייה' : 'תיקייה חדשה'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">שם התיקייה</label>
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="הכנס שם תיקייה"
                className="mt-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium">צבע</label>
              <div className="flex gap-2 mt-2">
                {FOLDER_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      selectedColor === color ? 'scale-125 ring-2 ring-primary' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <Button onClick={handleSubmit} className="w-full">
              {editingFolder ? 'עדכן' : 'צור'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {folders && folders.length > 0 && (
        <div className="grid gap-2">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="flex items-center justify-between p-3 bg-card rounded-lg border hover:shadow-md transition-all"
            >
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
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
