import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Search, Folder, CheckSquare, Calendar, Settings, BarChart3, Map } from 'lucide-react';

interface CommandPaletteProps {
  projectId?: string;
  onNavigate?: (view: string) => void;
}

export const CommandPalette = ({ projectId, onNavigate }: CommandPaletteProps) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSelect = (action: string) => {
    setOpen(false);
    
    if (action.startsWith('view:') && onNavigate) {
      onNavigate(action.replace('view:', ''));
    } else if (action === 'home') {
      navigate('/');
    } else if (action === 'new-project') {
      navigate('/project/new');
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="חפש פעולות, דפים, משימות..." />
        <CommandList>
          <CommandEmpty>לא נמצאו תוצאות</CommandEmpty>
          
          <CommandGroup heading="ניווט">
            <CommandItem onSelect={() => handleSelect('home')}>
              <Folder className="ml-2 h-4 w-4" />
              <span>כל הפרויקטים</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect('new-project')}>
              <Folder className="ml-2 h-4 w-4" />
              <span>פרויקט חדש</span>
            </CommandItem>
          </CommandGroup>

          {projectId && onNavigate && (
            <CommandGroup heading="תצוגות">
              <CommandItem onSelect={() => handleSelect('view:tasks')}>
                <CheckSquare className="ml-2 h-4 w-4" />
                <span>משימות</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect('view:kanban')}>
                <Map className="ml-2 h-4 w-4" />
                <span>לוח קנבן</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect('view:dashboard')}>
                <BarChart3 className="ml-2 h-4 w-4" />
                <span>דשבורד</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect('view:gantt')}>
                <Calendar className="ml-2 h-4 w-4" />
                <span>תרשים גאנט</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect('view:calendar')}>
                <Calendar className="ml-2 h-4 w-4" />
                <span>לוח שנה</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect('view:analytics')}>
                <BarChart3 className="ml-2 h-4 w-4" />
                <span>אנליטיקס</span>
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
  );
};
