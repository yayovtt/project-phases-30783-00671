import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ReminderNotificationProps {
  message: string;
  soundUrl?: string | null;
  onDismiss: () => void;
}

export function ReminderNotification({
  message,
  soundUrl,
  onDismiss,
}: ReminderNotificationProps) {
  const [audio] = useState(() => {
    if (soundUrl) {
      return new Audio(soundUrl);
    }
    return null;
  });

  useEffect(() => {
    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Show browser notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("תזכורת", {
        body: message,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
      });
    }

    // Play sound
    if (audio) {
      audio.play().catch((error) => {
        console.error("Error playing reminder sound:", error);
      });
    }

    // Auto dismiss after 10 seconds
    const timer = setTimeout(() => {
      onDismiss();
    }, 10000);

    return () => {
      clearTimeout(timer);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [audio, message, onDismiss]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, x: "-50%" }}
        animate={{ opacity: 1, y: 0, x: "-50%" }}
        exit={{ opacity: 0, y: -50, x: "-50%" }}
        className="fixed top-4 left-1/2 z-50 w-full max-w-md"
      >
        <Card className="p-4 shadow-2xl border-2 border-primary/50 bg-gradient-to-br from-primary/10 to-background backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Bell className="h-6 w-6 text-primary animate-pulse" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg mb-1">תזכורת</h3>
              <p className="text-foreground/90">{message}</p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress bar */}
          <motion.div
            className="mt-3 h-1 bg-primary/30 rounded-full overflow-hidden"
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 10, ease: "linear" }}
          >
            <div className="h-full bg-primary" />
          </motion.div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
