import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Building2, MapPin } from 'lucide-react';
import { WorkflowCategories } from '@/components/project/WorkflowCategories';
import { NotificationCenter } from '@/components/project/NotificationCenter';
import { ThemeSelector } from '@/components/project/ThemeSelector';
import { FileImporter } from '@/components/dashboard/FileImporter';

interface Project {
  id: string;
  client_name: string;
  address: string | null;
  gush: string | null;
  parcel: string | null;
  plot: string | null;
  priority: number | null;
}

const ProjectView = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data as Project;
    },
    enabled: !!user && !!projectId,
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent shadow-glow"></div>
          <p className="text-sm text-muted-foreground animate-pulse">טוען פרויקט...</p>
        </div>
      </div>
    );
  }

  if (!user || !project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle" dir="rtl">
      <header className="border-b bg-card/80 backdrop-blur-md shadow-md sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="hover-lift">
              <ArrowRight className="ml-2 h-4 w-4" />
              חזור לפרויקטים
            </Button>
            <div className="flex-1 animate-fade-in">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold gradient-text">{project.client_name}</h1>
              </div>
              {project.address && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {project.address}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <FileImporter projectId={project.id} />
              <ThemeSelector />
              <NotificationCenter />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 animate-fade-in">
        <div className="space-y-6">
          {(project.gush || project.parcel || project.plot) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">פרטי נכס</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {project.gush && (
                    <div>
                      <span className="text-muted-foreground">גוש: </span>
                      <span className="font-medium">{project.gush}</span>
                    </div>
                  )}
                  {project.parcel && (
                    <div>
                      <span className="text-muted-foreground">חלקה: </span>
                      <span className="font-medium">{project.parcel}</span>
                    </div>
                  )}
                  {project.plot && (
                    <div>
                      <span className="text-muted-foreground">מגרש: </span>
                      <span className="font-medium">{project.plot}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <WorkflowCategories projectId={project.id} />
        </div>
      </main>
    </div>
  );
};

export default ProjectView;
