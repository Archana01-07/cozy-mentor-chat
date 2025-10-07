import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const MentorPrivacyToggle = () => {
  const [nickname, setNickname] = useState("");
  const [currentNickname, setCurrentNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasNickname, setHasNickname] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // @ts-ignore - mentor_preferences table exists but types not regenerated yet
    const { data }: any = await supabase.from("mentor_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setCurrentNickname(data.nickname || "");
      setHasNickname(!!data.nickname);
    }
  };

  const handleSaveNickname = async () => {
    if (!nickname.trim()) {
      toast.error("Please enter a nickname");
      return;
    }

    if (hasNickname) {
      toast.error("Nickname can only be set once and cannot be changed");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // @ts-ignore - mentor_preferences table exists but types not regenerated yet
    const { error }: any = await supabase.from("mentor_preferences")
      .upsert({
        user_id: user.id,
        nickname: nickname.trim(),
      });

    if (error) {
      toast.error("Failed to save nickname");
    } else {
      toast.success("Nickname saved! This cannot be changed.");
      setCurrentNickname(nickname.trim());
      setHasNickname(true);
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-lg">Mentor Display Name</CardTitle>
        <CardDescription>
          Set your nickname (one-time only, your real name will never be revealed)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasNickname ? (
          <div className="space-y-2">
            <Label>Current Nickname</Label>
            <p className="text-lg font-medium text-primary">{currentNickname}</p>
            <p className="text-sm text-muted-foreground">
              This is how students will see you in chats
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="nickname">Choose Your Nickname</Label>
            <Input
              id="nickname"
              placeholder="Enter a friendly nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={30}
            />
            <Button 
              onClick={handleSaveNickname} 
              disabled={loading || !nickname.trim()}
              className="w-full"
            >
              {loading ? "Saving..." : "Set Nickname (Cannot be changed)"}
            </Button>
            <p className="text-xs text-muted-foreground">
              ⚠️ Once set, your nickname cannot be changed
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
