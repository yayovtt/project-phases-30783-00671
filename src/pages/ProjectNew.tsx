import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight } from 'lucide-react';
import { TaskTemplateSelector } from '@/components/project/TaskTemplateSelector';

const ProjectNew = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    client_name: '',
    address: '',
    gush: '',
    parcel: '',
    plot: '',
    priority: '',
  });

  const [taskTemplate, setTaskTemplate] = useState({
    templateType: 'permit',
    customTemplateName: '',
    importedTasks: [] as any[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert([
          {
            client_name: formData.client_name,
            address: formData.address || null,
            gush: formData.gush || null,
            parcel: formData.parcel || null,
            plot: formData.plot || null,
            priority: formData.priority ? parseInt(formData.priority) : null,
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (projectError) throw projectError;

      // Initialize project with selected template
      if (taskTemplate.templateType !== 'custom' || taskTemplate.importedTasks.length > 0) {
        // Get template tasks or use imported tasks
        let tasksToCreate = [];
        
        if (taskTemplate.importedTasks.length > 0) {
          // Use imported tasks
          tasksToCreate = taskTemplate.importedTasks.map((task, index) => ({
            name: task.name || task.title || `משימה ${index + 1}`,
            description: task.description || task.desc || null,
            category_id: null, // Will be assigned to default category
            order_index: index,
          }));
        }

        // Create project_tasks entries
        if (tasksToCreate.length > 0) {
          const { data: tasks } = await supabase
            .from('tasks')
            .select('id')
            .limit(tasksToCreate.length);

          if (tasks) {
            const projectTasks = tasks.map(task => ({
              project_id: project.id,
              task_id: task.id,
              completed: false,
            }));

            await supabase.from('project_tasks').insert(projectTasks);
          }
        }
      }

      toast({
        title: 'הפרויקט נוצר בהצלחה',
        description: `פרויקט ${formData.client_name} נוסף למערכת`,
      });
      navigate(`/project/${project.id}`);
    } catch (error: any) {
      toast({
        title: 'שגיאה ביצירת פרויקט',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowRight className="ml-2 h-4 w-4" />
            חזור
          </Button>
          <div>
            <h1 className="text-xl font-bold">פרויקט חדש</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>פרטי הפרויקט</CardTitle>
            <CardDescription>הזן את הפרטים הבסיסיים של הפרויקט החדש</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client_name">שם הלקוח *</Label>
                <Input
                  id="client_name"
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleChange}
                  required
                  placeholder="הזן שם לקוח"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">כתובת</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="כתובת הפרויקט"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gush">גוש</Label>
                  <Input
                    id="gush"
                    name="gush"
                    value={formData.gush}
                    onChange={handleChange}
                    placeholder="מספר גוש"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parcel">חלקה</Label>
                  <Input
                    id="parcel"
                    name="parcel"
                    value={formData.parcel}
                    onChange={handleChange}
                    placeholder="מספר חלקה"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plot">מגרש</Label>
                  <Input
                    id="plot"
                    name="plot"
                    value={formData.plot}
                    onChange={handleChange}
                    placeholder="מספר מגרש"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">עדיפות</Label>
                <Input
                  id="priority"
                  name="priority"
                  type="number"
                  value={formData.priority}
                  onChange={handleChange}
                  placeholder="מספר עדיפות (1-10)"
                  min="1"
                  max="10"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'יוצר פרויקט...' : 'צור פרויקט'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/')}>
                  ביטול
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6">
          <TaskTemplateSelector
            value={taskTemplate}
            onChange={setTaskTemplate}
          />
        </div>
      </main>
    </div>
  );
};

export default ProjectNew;
