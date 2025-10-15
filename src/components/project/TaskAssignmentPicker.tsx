import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User } from "lucide-react";

interface TaskAssignmentPickerProps {
  currentAssignedTo?: string;
  onUpdate: (userId: string | null) => void;
}

export function TaskAssignmentPicker({
  currentAssignedTo,
  onUpdate,
}: TaskAssignmentPickerProps) {
  const [selectedUser, setSelectedUser] = useState<string | undefined>(
    currentAssignedTo
  );

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");

      if (error) throw error;
      return data;
    },
  });

  const handleValueChange = (value: string) => {
    const userId = value === "unassigned" ? null : value;
    setSelectedUser(value === "unassigned" ? undefined : value);
    onUpdate(userId);
  };

  const selectedProfile = profiles?.find((p) => p.id === selectedUser);

  return (
    <div className="space-y-3">
      <Label>משויך ל</Label>
      <Select
        value={selectedUser || "unassigned"}
        onValueChange={handleValueChange}
        disabled={isLoading}
      >
        <SelectTrigger className="w-full">
          <SelectValue>
            {selectedProfile ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback>
                    {selectedProfile.full_name?.[0] || selectedProfile.email?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span>{selectedProfile.full_name || selectedProfile.email}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>לא משויך</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>לא משויך</span>
            </div>
          </SelectItem>
          {profiles?.map((profile) => (
            <SelectItem key={profile.id} value={profile.id}>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback>
                    {profile.full_name?.[0] || profile.email?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span>{profile.full_name || profile.email}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
