import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { FolderPlus, Trash2, Edit } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Folder {
  id: string;
  name: string;
  color: string | null;
  order_index: number;
  created_by: string;
}

export const FolderManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#6B7280');

  const { data: folders } = useQuery({
    queryKey: ['project-folders'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('project_folders')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as Folder[];
    },
  });

  const createFolder = useMutation({
    mutationFn: async (folderData: { name: string; color: string }) => {
      const { data, error } = await (supabase as any)
        .from('project_folders')
        .insert([{
          name: folderData.name,
          color: folderData.color,
          created_by: user?.id,
          order_index: (folders?.length || 0) + 1,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-folders'] });
      setIsCreateOpen(false);
      setNewFolderName('');
      setNewFolderColor('#6B7280');
      toast({
        title: 'תיקייה נוצרה בהצלחה',
        description: 'התיקייה החדשה נוספה למערכת',
      });
    },
    onError: () => {
      toast({
        title: 'שגיאה',
        description: 'לא הצלחנו ליצור את התיקייה',
        variant: 'destructive',
      });
    },
  });

  const deleteFolder = useMutation({
    mutationFn: async (folderId: string) => {
      // First, remove folder_id from all projects in this folder
      await (supabase as any)
        .from('projects')
        .update({ folder_id: null })
        .eq('folder_id', folderId);

      const { error } = await (supabase as any)
        .from('project_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-folders'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: 'תיקייה נמחקה',
        description: 'התיקייה והפרויקטים שבה הועברו לכלל הפרויקטים',
      });
    },
  });

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast({
        title: 'שגיאה',
        description: 'נא להזין שם לתיקייה',
        variant: 'destructive',
      });
      return;
    }
    createFolder.mutate({ name: newFolderName, color: newFolderColor });
  };

  return (
    <div className="flex flex-row-reverse items-center gap-2" dir="rtl">
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <FolderPlus className="mr-2 h-4 w-4" />
            תיקייה חדשה
          </Button>
        </DialogTrigger>
        <DialogContent dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>יצירת תיקייה חדשה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">שם התיקייה</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="הזן שם לתיקייה..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="folder-color">צבע התיקייה</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="folder-color"
                  type="color"
                  value={newFolderColor}
                  onChange={(e) => setNewFolderColor(e.target.value)}
                  className="w-20 h-10"
                />
                <span className="text-sm text-muted-foreground">{newFolderColor}</span>
              </div>
            </div>
            <Button
              onClick={handleCreateFolder}
              disabled={createFolder.isPending}
              className="w-full"
            >
              {createFolder.isPending ? 'יוצר...' : 'צור תיקייה'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {folders && folders.length > 0 && (
        <div className="flex flex-row-reverse items-center gap-2 flex-wrap">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="flex flex-row-reverse items-center gap-2 px-3 py-1.5 rounded-md border"
              style={{ borderColor: folder.color || '#6B7280' }}
            >
              <div className="flex flex-row-reverse gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => {
                    setNewFolderName(folder.name);
                    setNewFolderColor(folder.color || '#6B7280');
                    setIsCreateOpen(true);
                  }}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => deleteFolder.mutate(folder.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <span className="text-sm font-medium">{folder.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
