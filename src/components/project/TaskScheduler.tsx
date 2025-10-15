import { useState } from "react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface TaskSchedulerProps {
  taskId: string;
  currentDueDate?: string;
  currentStartedAt?: string;
  currentEstimatedHours?: number;
  currentActualHours?: number;
  currentPriority?: "low" | "medium" | "high" | "urgent";
  onUpdate: (data: {
    due_date_override?: string;
    started_at?: string;
    actual_hours?: number;
  }) => void;
}

export function TaskScheduler({
  currentDueDate,
  currentStartedAt,
  currentEstimatedHours,
  currentActualHours,
  currentPriority,
  onUpdate,
}: TaskSchedulerProps) {
  const [dueDate, setDueDate] = useState<Date | undefined>(
    currentDueDate ? new Date(currentDueDate) : undefined
  );
  const [startDate, setStartDate] = useState<Date | undefined>(
    currentStartedAt ? new Date(currentStartedAt) : undefined
  );
  const [actualHours, setActualHours] = useState<number>(currentActualHours || 0);

  const handleSave = () => {
    onUpdate({
      due_date_override: dueDate?.toISOString(),
      started_at: startDate?.toISOString(),
      actual_hours: actualHours,
    });
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <h3 className="font-semibold flex items-center gap-2">
        <Clock className="h-4 w-4" />
        תזמון משימה
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start Date */}
        <div className="space-y-2">
          <Label>תאריך התחלה</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-right font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="ml-2 h-4 w-4" />
                {startDate ? (
                  format(startDate, "PPP", { locale: he })
                ) : (
                  <span>בחר תאריך</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                locale={he}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Due Date */}
        <div className="space-y-2">
          <Label>תאריך יעד</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-right font-normal",
                  !dueDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="ml-2 h-4 w-4" />
                {dueDate ? (
                  format(dueDate, "PPP", { locale: he })
                ) : (
                  <span>בחר תאריך</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={setDueDate}
                locale={he}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Estimated Hours */}
        <div className="space-y-2">
          <Label>שעות משוערות</Label>
          <Input
            type="number"
            value={currentEstimatedHours || ""}
            disabled
            className="bg-muted"
          />
        </div>

        {/* Actual Hours */}
        <div className="space-y-2">
          <Label>שעות בפועל</Label>
          <Input
            type="number"
            min="0"
            value={actualHours}
            onChange={(e) => setActualHours(parseInt(e.target.value) || 0)}
            placeholder="0"
          />
        </div>
      </div>

      {/* Priority Display */}
      {currentPriority && (
        <div className="space-y-2">
          <Label>עדיפות</Label>
          <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
            {currentPriority === "urgent" && "דחוף"}
            {currentPriority === "high" && "גבוהה"}
            {currentPriority === "medium" && "בינונית"}
            {currentPriority === "low" && "נמוכה"}
          </div>
        </div>
      )}

      <Button onClick={handleSave} className="w-full">
        שמור שינויים
      </Button>
    </div>
  );
}
