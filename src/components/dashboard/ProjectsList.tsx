import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Calendar, Plus, FolderOpen, Folder, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { EmptyState } from '@/components/ui/empty-state';
import { CardSkeleton } from '@/components/ui/loading-skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FolderManagement } from './FolderManagement';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

interface ProjectFolder {
  id: string;
  name: string;
  color: string | null;
  order_index: number;
}

export const ProjectsList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('all');

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Project[];
    },
  });

  const { data: folders } = useQuery({
    queryKey: ['project-folders'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('project_folders')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as ProjectFolder[];
    },
  });

  const moveToFolder = useMutation({
    mutationFn: async ({ projectId, folderId }: { projectId: string; folderId: string | null }) => {
      const { error } = await (supabase as any)
        .from('projects')
        .update({ folder_id: folderId })
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: 'הפרויקט הועבר בהצלחה',
      });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await (supabase as any)
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: 'הפרויקט נמחק בהצלחה',
      });
    },
  });

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

  const renderProjectCard = (project: Project, index: number) => (
    <Card
      key={project.id}
      className="hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group hover-lift overflow-hidden relative"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div 
        className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-5 transition-opacity cursor-pointer"
        onClick={() => navigate(`/project/${project.id}`)}
      />
      <CardHeader className="relative z-10">
        <div className="flex items-center justify-between">
          <CardTitle 
            className="flex items-center gap-2 text-lg cursor-pointer"
            onClick={() => navigate(`/project/${project.id}`)}
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <span className="group-hover:gradient-text transition-all">{project.client_name}</span>
          </CardTitle>
          <div className="flex gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>העבר לתיקייה</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => moveToFolder.mutate({ projectId: project.id, folderId: null })}>
                  ללא תיקייה
                </DropdownMenuItem>
                {folders?.map((folder) => (
                  <DropdownMenuItem
                    key={folder.id}
                    onClick={() => moveToFolder.mutate({ projectId: project.id, folderId: folder.id })}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: folder.color || '#6B7280' }}
                      />
                      {folder.name}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('האם אתה בטוח שברצונך למחוק את הפרויקט?')) {
                  deleteProject.mutate(project.id);
                }
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
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

  const projectsWithoutFolder = projects?.filter(p => !p.folder_id) || [];

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div className="flex flex-row-reverse items-center justify-between">
        <div className="text-right">
          <h2 className="text-2xl font-bold gradient-text">הפרויקטים שלי</h2>
          <p className="text-sm text-muted-foreground mt-1">{projects?.length || 0} פרויקטים פעילים</p>
        </div>
        <div className="flex flex-row-reverse items-center gap-2">
          <Button onClick={() => navigate('/project/new')} variant="gradient" className="shadow-lg">
            <Plus className="mr-2 h-4 w-4" />
            פרויקט חדש
          </Button>
          <FolderManagement />
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-auto gap-2" style={{ gridTemplateColumns: `repeat(${(folders?.length || 0) + 1}, minmax(0, 1fr))` }}>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            כל הפרויקטים
          </TabsTrigger>
          {folders?.map((folder) => (
            <TabsTrigger key={folder.id} value={folder.id} className="flex items-center gap-2">
              <Folder className="h-4 w-4" style={{ color: folder.color || '#6B7280' }} />
              {folder.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects?.map((project, index) => renderProjectCard(project, index))}
          </div>
        </TabsContent>

        {folders?.map((folder) => {
          const folderProjects = projects?.filter(p => p.folder_id === folder.id) || [];
          return (
            <TabsContent key={folder.id} value={folder.id} className="mt-6">
              {folderProjects.length === 0 ? (
                <EmptyState
                  icon={FolderOpen}
                  title="אין פרויקטים בתיקייה זו"
                  description="העבר פרויקטים לתיקייה זו או צור פרויקט חדש"
                />
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {folderProjects.map((project, index) => renderProjectCard(project, index))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};
