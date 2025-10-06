import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { UserCircle, Settings } from "lucide-react";

export const PrivacyToggle = () => {
  const [displayMode, setDisplayMode] = useState<"anonymous" | "nickname" | "real_name">("anonymous");
  const [nickname, setNickname] = useState("");
  const [tempNickname, setTempNickname] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("student_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setDisplayMode(data.display_mode);
      setNickname(data.nickname || "");
      setTempNickname(data.nickname || "");
    }
  };

  const updatePreferences = async (mode: "anonymous" | "nickname" | "real_name") => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // If switching to nickname mode and no nickname is set, require one
      if (mode === "nickname" && !tempNickname) {
        toast.error("Please set a nickname first");
        return;
      }

      const { error } = await supabase
        .from("student_preferences")
        .update({
          display_mode: mode,
          nickname: mode === "nickname" ? tempNickname : nickname,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setDisplayMode(mode);
      setNickname(tempNickname);
      toast.success("Privacy settings updated");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserCircle className="w-4 h-4" />
          {displayMode === "anonymous" && "Anonymous"}
          {displayMode === "nickname" && nickname}
          {displayMode === "real_name" && "Real Name"}
          <Settings className="w-3 h-3 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Privacy Settings</h4>
            <p className="text-sm text-muted-foreground">
              Choose how mentors see you
            </p>
          </div>

          <RadioGroup value={displayMode} onValueChange={(value: any) => updatePreferences(value)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="anonymous" id="anonymous" disabled={loading} />
              <Label htmlFor="anonymous" className="cursor-pointer">
                Stay Anonymous
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="nickname" id="nickname" disabled={loading} />
              <Label htmlFor="nickname" className="cursor-pointer">
                Use Nickname
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="real_name" id="real_name" disabled={loading} />
              <Label htmlFor="real_name" className="cursor-pointer">
                Show Real Name
              </Label>
            </div>
          </RadioGroup>

          {!nickname && (
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="nickname-input">Set Your Nickname (One Time)</Label>
              <Input
                id="nickname-input"
                placeholder="Enter a nickname"
                value={tempNickname}
                onChange={(e) => setTempNickname(e.target.value)}
                disabled={loading || !!nickname}
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">
                Once set, your nickname cannot be changed
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
