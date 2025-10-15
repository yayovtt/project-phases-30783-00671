import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Bell, Trash2, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { SoundUploader } from "./SoundUploader";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

interface Reminder {
  id: string;
  reminder_time: string;
  message: string | null;
  sound_url: string | null;
  is_active: boolean;
}

interface ReminderManagerProps {
  projectTaskId: string;
  taskName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ReminderManager({
  projectTaskId,
  taskName,
  isOpen,
  onClose,
}: ReminderManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [reminderDate, setReminderDate] = useState<Date>();
  const [reminderTime, setReminderTime] = useState("09:00");
  const [message, setMessage] = useState("");
  const [soundUrl, setSoundUrl] = useState<string | null>(null);

  const { data: reminders } = useQuery({
    queryKey: ["task-reminders", projectTaskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_reminders")
        .select("*")
        .eq("project_task_id", projectTaskId)
        .order("reminder_time", { ascending: true });

      if (error) throw error;
      return data as Reminder[];
    },
    enabled: isOpen,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!reminderDate) throw new Error("Please select a date");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const [hours, minutes] = reminderTime.split(":");
      const reminderDateTime = new Date(reminderDate);
      reminderDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const { error } = await supabase.from("task_reminders").insert({
        project_task_id: projectTaskId,
        reminder_time: reminderDateTime.toISOString(),
        message: message || null,
        sound_url: soundUrl,
        created_by: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-reminders", projectTaskId] });
      toast({ title: "התזכורת נוספה בהצלחה" });
      setIsAdding(false);
      setReminderDate(undefined);
      setReminderTime("09:00");
      setMessage("");
      setSoundUrl(null);
    },
    onError: (error: any) => {
      toast({
        title: "שגיאה ביצירת תזכורת",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("task_reminders")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-reminders", projectTaskId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("task_reminders")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-reminders", projectTaskId] });
      toast({ title: "התזכורת נמחקה" });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            תזכורות למשימה
          </DialogTitle>
          <DialogDescription>{taskName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!isAdding ? (
            <Button onClick={() => setIsAdding(true)} className="w-full">
              <Plus className="h-4 w-4 ml-2" />
              הוסף תזכורת חדשה
            </Button>
          ) : (
            <Card className="p-4 space-y-4">
              <h3 className="font-medium">תזכורת חדשה</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>תאריך</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-right font-normal",
                          !reminderDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="ml-2 h-4 w-4" />
                        {reminderDate ? (
                          format(reminderDate, "PPP", { locale: he })
                        ) : (
                          <span>בחר תאריך</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={reminderDate}
                        onSelect={setReminderDate}
                        locale={he}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>שעה</Label>
                  <Input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>הודעה (אופציונלי)</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="טקסט התזכורת..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>צליל תזכורת (אופציונלי)</Label>
                <SoundUploader
                  selectedSound={soundUrl}
                  onSoundSelect={setSoundUrl}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                >
                  שמור תזכורת
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAdding(false);
                    setReminderDate(undefined);
                    setMessage("");
                    setSoundUrl(null);
                  }}
                >
                  ביטול
                </Button>
              </div>
            </Card>
          )}

          <div className="space-y-2">
            <h3 className="font-medium">תזכורות קיימות</h3>
            {!reminders || reminders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                אין תזכורות למשימה זו
              </p>
            ) : (
              reminders.map((reminder) => (
                <Card key={reminder.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {format(
                            new Date(reminder.reminder_time),
                            "PPP 'בשעה' HH:mm",
                            { locale: he }
                          )}
                        </p>
                        {reminder.sound_url && (
                          <Bell className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      {reminder.message && (
                        <p className="text-sm text-muted-foreground">
                          {reminder.message}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={reminder.is_active}
                        onCheckedChange={() =>
                          toggleMutation.mutate({
                            id: reminder.id,
                            isActive: reminder.is_active,
                          })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(reminder.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
