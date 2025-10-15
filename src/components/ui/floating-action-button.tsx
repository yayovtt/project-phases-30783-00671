import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FABAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface FloatingActionButtonProps {
  actions?: FABAction[];
  onClick?: () => void;
  className?: string;
}

export const FloatingActionButton = ({
  actions,
  onClick,
  className,
}: FloatingActionButtonProps) => {
  if (actions && actions.length > 0) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="gradient"
            className={cn(
              'fixed bottom-20 left-6 h-14 w-14 rounded-full shadow-xl hover:shadow-glow z-40 animate-bounce-in md:bottom-6',
              className
            )}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-56 mb-2">
          {actions.map((action, index) => (
            <DropdownMenuItem
              key={index}
              onClick={action.onClick}
              className="gap-2 cursor-pointer"
            >
              {action.icon}
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      size="icon"
      variant="gradient"
      onClick={onClick}
      className={cn(
        'fixed bottom-20 left-6 h-14 w-14 rounded-full shadow-xl hover:shadow-glow z-40 animate-bounce-in md:bottom-6',
        className
      )}
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
};
