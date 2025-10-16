import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Calendar, Plus, FolderOpen } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { EmptyState } from '@/components/ui/empty-state';
import { CardSkeleton } from '@/components/ui/loading-skeleton';
import { CreateFolderDialog } from './folders/CreateFolderDialog';
import { ManageFoldersDialog } from './folders/ManageFoldersDialog';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  client_name: string;
  address: string | null;
  gush: string | null;
  parcel: string | null;
  plot: string | null;
  priority: number | null;
  created_at: string;
  folder_id: string | null;
}

interface Folder {
  id: string;
  name: string;
  color: string;
  order_index: number;
}

export const ProjectsList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Project[];
    },
  });

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

  const moveToFolder = useMutation({
    mutationFn: async ({ projectId, folderId }: { projectId: string; folderId: string | null }) => {
      const { error } = await supabase
        .from('projects')
        .update({ folder_id: folderId })
        .eq('id', projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'הפרויקט הועבר בהצלחה' });
    },
  });

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData('projectId', projectId);
  };

  const handleDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData('projectId');
    if (projectId) {
      moveToFolder.mutate({ projectId, folderId });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const projectsWithoutFolder = projects?.filter(p => !p.folder_id) || [];
  const projectsByFolder = folders?.reduce((acc, folder) => {
    acc[folder.id] = projects?.filter(p => p.folder_id === folder.id) || [];
    return acc;
  }, {} as Record<string, Project[]>) || {};

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <CardSkeleton count={6} />
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="אין פרויקטים עדיין"
        description="התחל ביצירת הפרויקט הראשון שלך וצא לדרך"
        action={{
          label: 'צור פרויקט חדש',
          onClick: () => navigate('/project/new'),
        }}
      />
    );
  }

  const renderProject = (project: Project, index: number) => (
    <Card
      key={project.id}
      draggable
      onDragStart={(e) => handleDragStart(e, project.id)}
      className="hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-move group hover-lift overflow-hidden"
      onClick={() => navigate(`/project/${project.id}`)}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-5 transition-opacity" />
      <CardHeader className="relative z-10">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <span className="group-hover:gradient-text transition-all">{project.client_name}</span>
        </CardTitle>
        {project.address && (
          <CardDescription className="flex items-center gap-1 mt-2">
            <MapPin className="h-3 w-3" />
            {project.address}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3 relative z-10">
        {(project.gush || project.parcel || project.plot) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            {project.gush && (
              <span className="px-2 py-1 bg-muted rounded-md">גוש: {project.gush}</span>
            )}
            {project.parcel && (
              <span className="px-2 py-1 bg-muted rounded-md">חלקה: {project.parcel}</span>
            )}
            {project.plot && (
              <span className="px-2 py-1 bg-muted rounded-md">מגרש: {project.plot}</span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
          <Calendar className="h-3 w-3" />
          <span>נוצר: {format(new Date(project.created_at), 'dd/MM/yyyy', { locale: he })}</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gradient-text">הפרויקטים שלי</h2>
          <p className="text-sm text-muted-foreground mt-1">{projects.length} פרויקטים פעילים</p>
        </div>
        <div className="flex gap-2">
          <CreateFolderDialog />
          <ManageFoldersDialog />
          <Button onClick={() => navigate('/project/new')} variant="gradient" className="shadow-lg">
            <Plus className="ml-2 h-4 w-4" />
            פרויקט חדש
          </Button>
        </div>
      </div>

      {/* Folders */}
      {folders && folders.length > 0 && (
        <div className="space-y-4">
          {folders.map((folder) => (
            <div
              key={folder.id}
              onDrop={(e) => handleDrop(e, folder.id)}
              onDragOver={handleDragOver}
              className="border-2 border-dashed rounded-lg p-4 transition-colors hover:border-primary/50 hover:bg-primary/5"
            >
              <div className="flex items-center gap-2 mb-4">
                <FolderOpen className="h-5 w-5" style={{ color: folder.color }} />
                <h3 className="text-lg font-semibold">{folder.name}</h3>
                <span className="text-sm text-muted-foreground">
                  ({projectsByFolder[folder.id]?.length || 0})
                </span>
              </div>
              {projectsByFolder[folder.id]?.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {projectsByFolder[folder.id].map((project, index) => renderProject(project, index))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  גרור פרויקטים לכאן
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Projects without folder */}
      {projectsWithoutFolder.length > 0 && (
        <div
          onDrop={(e) => handleDrop(e, null)}
          onDragOver={handleDragOver}
          className="border-2 border-dashed rounded-lg p-4 transition-colors hover:border-primary/50"
        >
          <h3 className="text-lg font-semibold mb-4">פרויקטים ללא תיקייה</h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projectsWithoutFolder.map((project, index) => renderProject(project, index))}
          </div>
        </div>
      )}
    </div>
  );
};
