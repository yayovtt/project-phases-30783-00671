import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ActiveReminder {
  id: string;
  message: string | null;
  sound_url: string | null;
  project_task_id: string;
}

export function useReminders() {
  const [activeReminders, setActiveReminders] = useState<ActiveReminder[]>([]);

  // Fetch active reminders that should trigger now
  const { data: reminders } = useQuery({
    queryKey: ["active-reminders"],
    queryFn: async () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      const { data, error } = await supabase
        .from("task_reminders")
        .select("id, message, sound_url, project_task_id, reminder_time")
        .eq("is_active", true)
        .gte("reminder_time", fiveMinutesAgo.toISOString())
        .lte("reminder_time", now.toISOString());

      if (error) throw error;
      return data;
    },
    refetchInterval: 60000, // Check every minute
  });

  useEffect(() => {
    if (!reminders || reminders.length === 0) return;

    // Filter out reminders that have already been shown
    const newReminders = reminders.filter(
      (r) => !activeReminders.find((ar) => ar.id === r.id)
    );

    if (newReminders.length > 0) {
      setActiveReminders((prev) => [...prev, ...newReminders]);

      // Mark reminders as inactive after showing them
      newReminders.forEach(async (reminder) => {
        await supabase
          .from("task_reminders")
          .update({ is_active: false })
          .eq("id", reminder.id);
      });
    }
  }, [reminders]);

  const dismissReminder = (id: string) => {
    setActiveReminders((prev) => prev.filter((r) => r.id !== id));
  };

  return {
    activeReminders,
    dismissReminder,
  };
}
