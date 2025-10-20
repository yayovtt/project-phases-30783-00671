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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent shadow-glow"></div>
          <p className="text-sm text-muted-foreground animate-pulse">טוען...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle" dir="rtl">
      <header className="border-b bg-card/80 backdrop-blur-md shadow-md sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="animate-fade-in">
            <h1 className="text-3xl font-bold gradient-text">מערכת ניהול פרויקטים</h1>
            <p className="text-sm text-muted-foreground mt-1">ניהול שלבי עבודה אדריכליים מתקדם</p>
          </div>
          <div className="flex flex-row-reverse items-center gap-3 animate-fade-in">
            <Button onClick={handleSignOut} variant="outline" size="lg" className="hover-lift">
              <LogOut className="mr-2 h-5 w-5" />
              התנתק
            </Button>
            <Button onClick={() => navigate('/project/new')} variant="gradient" size="lg" className="shadow-lg">
              <Plus className="mr-2 h-5 w-5" />
              פרויקט חדש
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 animate-fade-in">
        <ProjectsList />
      </main>
    </div>
  );
};

export default Dashboard;
