import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface TaskProgressSliderProps {
  currentProgress: number;
  onUpdate: (progress: number) => void;
}

export function TaskProgressSlider({
  currentProgress,
  onUpdate,
}: TaskProgressSliderProps) {
  const [progress, setProgress] = useState(currentProgress);

  const getProgressColor = (value: number) => {
    if (value < 34) return "text-destructive";
    if (value < 67) return "text-yellow-500";
    return "text-green-500";
  };

  const handleChange = (value: number[]) => {
    setProgress(value[0]);
    onUpdate(value[0]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>אחוז התקדמות</Label>
        <span className={cn("text-2xl font-bold", getProgressColor(progress))}>
          {progress}%
        </span>
      </div>
      <Slider
        value={[progress]}
        onValueChange={handleChange}
        max={100}
        step={5}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
