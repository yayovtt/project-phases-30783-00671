import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardHeader>
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <CardTitle>אין פרויקטים עדיין</CardTitle>
          <CardDescription>התחל ביצירת הפרויקט הראשון שלך</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate('/project/new')}>צור פרויקט חדש</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">הפרויקטים שלי ({projects.length})</h2>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card
            key={project.id}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate(`/project/${project.id}`)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {project.client_name}
              </CardTitle>
              {project.address && (
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {project.address}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {(project.gush || project.parcel || project.plot) && (
                <div className="text-sm text-muted-foreground">
                  {project.gush && `גוש: ${project.gush}`}
                  {project.parcel && ` | חלקה: ${project.parcel}`}
                  {project.plot && ` | מגרש: ${project.plot}`}
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                נוצר: {format(new Date(project.created_at), 'dd/MM/yyyy', { locale: he })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
