import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowUp, ArrowDown, Minus } from "lucide-react";

interface PriorityBadgeProps {
  priority: "low" | "medium" | "high" | "urgent";
  className?: string;
}

const priorityConfig = {
  urgent: {
    label: "דחוף",
    variant: "destructive" as const,
    icon: AlertCircle,
    className: "bg-destructive text-destructive-foreground border-destructive",
  },
  high: {
    label: "גבוהה",
    variant: "default" as const,
    icon: ArrowUp,
    className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
  medium: {
    label: "בינונית",
    variant: "secondary" as const,
    icon: Minus,
    className: "bg-secondary text-secondary-foreground border-secondary",
  },
  low: {
    label: "נמוכה",
    variant: "outline" as const,
    icon: ArrowDown,
    className: "bg-muted/50 text-muted-foreground border-border",
  },
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`${config.className} gap-1 ${className || ""}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
