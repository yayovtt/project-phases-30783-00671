import { useState } from 'react';
import { LayoutGrid, CheckSquare, Calendar, BarChart3, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'דשבורד', icon: LayoutGrid },
  { id: 'tasks', label: 'משימות', icon: CheckSquare },
  { id: 'calendar', label: 'לוח שנה', icon: Calendar },
  { id: 'analytics', label: 'סטטיסטיקה', icon: BarChart3 },
];

export const MobileBottomNav = ({ activeTab, onTabChange }: MobileBottomNavProps) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile Bottom Navigation - visible only on mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-lg md:hidden">
        <nav className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all duration-200",
                  isActive 
                    ? "text-primary scale-110" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "animate-bounce-in")} />
                <span className="text-xs font-medium">{item.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full" />
                )}
              </button>
            );
          })}

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center gap-1 flex-1 h-full text-muted-foreground hover:text-foreground transition-colors">
                <Menu className="h-5 w-5" />
                <span className="text-xs font-medium">עוד</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto">
              <SheetHeader>
                <SheetTitle>תפריט נוסף</SheetTitle>
              </SheetHeader>
              <div className="grid gap-2 py-4">
                <Button 
                  variant="ghost" 
                  className="justify-start"
                  onClick={() => {
                    onTabChange('gantt');
                    setMenuOpen(false);
                  }}
                >
                  תרשים גאנט
                </Button>
                <Button 
                  variant="ghost" 
                  className="justify-start"
                  onClick={() => {
                    onTabChange('roadmap');
                    setMenuOpen(false);
                  }}
                >
                  מפת דרכים
                </Button>
                <Button 
                  variant="ghost" 
                  className="justify-start"
                  onClick={() => {
                    onTabChange('timeline');
                    setMenuOpen(false);
                  }}
                >
                  ציר זמן
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </nav>
      </div>

      {/* Spacer for mobile to prevent content from being hidden behind bottom nav */}
      <div className="h-16 md:hidden" />
    </>
  );
};
