import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Calendar, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { EmptyState } from '@/components/ui/empty-state';
import { CardSkeleton } from '@/components/ui/loading-skeleton';

interface Project {
  id: string;
  client_name: string;
  address: string | null;
  gush: string | null;
  parcel: string | null;
  plot: string | null;
  priority: number | null;
  created_at: string;
}

export const ProjectsList = () => {
  const navigate = useNavigate();

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gradient-text">הפרויקטים שלי</h2>
          <p className="text-sm text-muted-foreground mt-1">{projects.length} פרויקטים פעילים</p>
        </div>
        <Button onClick={() => navigate('/project/new')} variant="gradient" className="shadow-lg">
          <Plus className="ml-2 h-4 w-4" />
          פרויקט חדש
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project, index) => (
          <Card
            key={project.id}
            className="hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer group hover-lift overflow-hidden"
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
        ))}
      </div>
    </div>
  );
};
