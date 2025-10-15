import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Plus } from 'lucide-react';
import { ProjectsList } from '@/components/dashboard/ProjectsList';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: 'התנתקת בהצלחה',
      description: 'להתראות!',
    });
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">מערכת ניהול פרויקטים</h1>
            <p className="text-sm text-muted-foreground">ניהול שלבי עבודה אדריכליים</p>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/project/new')} size="sm">
              <Plus className="ml-2 h-4 w-4" />
              פרויקט חדש
            </Button>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="ml-2 h-4 w-4" />
              התנתק
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <ProjectsList />
      </main>
    </div>
  );
};

export default Dashboard;
