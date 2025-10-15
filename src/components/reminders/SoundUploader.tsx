import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, Volume2, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface SoundUploaderProps {
  selectedSound: string | null;
  onSoundSelect: (url: string | null) => void;
}

export function SoundUploader({ selectedSound, onSoundSelect }: SoundUploaderProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("audio/")) {
      toast({
        title: "סוג קובץ לא תקין",
        description: "יש להעלות קובץ אודיו בלבד",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "קובץ גדול מדי",
        description: "גודל הקובץ לא יכול לעלות על 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("reminder-sounds")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("reminder-sounds")
        .getPublicUrl(fileName);

      onSoundSelect(publicUrl);

      toast({
        title: "הצליל הועלה בהצלחה",
        description: "הצליל נשמר ויופעל בתזכורות",
      });
    } catch (error: any) {
      toast({
        title: "שגיאה בהעלאת הצליל",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const playSound = () => {
    if (!selectedSound) return;
    const audio = new Audio(selectedSound);
    audio.play();
  };

  const removeSound = () => {
    onSoundSelect(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          className="hidden"
          id="sound-upload"
          disabled={uploading}
        />
        <label htmlFor="sound-upload">
          <Button
            variant="outline"
            disabled={uploading}
            asChild
            className="cursor-pointer"
          >
            <span>
              <Upload className="h-4 w-4 ml-2" />
              {uploading ? "מעלה..." : "העלה צליל"}
            </span>
          </Button>
        </label>

        {selectedSound && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={playSound}
              title="נגן צליל"
            >
              <Volume2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeSound}
              title="הסר צליל"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </>
        )}
      </div>

      {selectedSound && (
        <Card className="p-3 bg-muted/50">
          <p className="text-sm text-muted-foreground">
            צליל נבחר ✓
          </p>
        </Card>
      )}
    </div>
  );
}
