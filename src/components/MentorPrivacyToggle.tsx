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
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuthAndLoadPreferences();
  }, []);

  const checkAuthAndLoadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log("Current user:", user);
      
      if (!user) {
        toast.error("Please log in to set your nickname");
        return;
      }

      setUser(user);
      await loadPreferences(user.id);
    } catch (error) {
      console.error("Auth check failed:", error);
      toast.error("Authentication error");
    }
  };

  const loadPreferences = async (userId: string) => {
    try {
      console.log("Loading preferences for user:", userId);
      
      const { data, error } = await supabase
        .from("mentor_preferences")
        .select("nickname")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error loading preferences:", error);
        return;
      }

      console.log("Loaded preferences:", data);

      if (data?.nickname) {
        setCurrentNickname(data.nickname);
        setHasNickname(true);
        toast.success(`Welcome back, ${data.nickname}!`);
      } else {
        setHasNickname(false);
        toast.info("Please set your nickname to start mentoring");
      }
    } catch (error) {
      console.error("Failed to load preferences:", error);
    }
  };

  const handleSaveNickname = async () => {
    if (!nickname.trim()) {
      toast.error("Please enter a nickname");
      return;
    }

    if (!user) {
      toast.error("You must be logged in to set a nickname");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("mentor_preferences")
        .upsert({
          user_id: user.id,
          nickname: nickname.trim(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      toast.success("Nickname saved successfully! You can now see students and start chatting.");
      setCurrentNickname(nickname.trim());
      setHasNickname(true);
      setNickname("");
      
      // Refresh the page or trigger a state update to show chats
      setTimeout(() => {
        window.location.reload(); // Or use your state management to refresh content
      }, 1000);
      
    } catch (error: any) {
      console.error("Error saving nickname:", error);
      toast.error(error.message || "Failed to save nickname");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-lg">Mentor Display Name</CardTitle>
        <CardDescription>
          {hasNickname 
            ? "Your nickname is set and students can see you"
            : "Set your nickname to start mentoring (one-time only)"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasNickname ? (
          <div className="space-y-2">
            <Label>Current Nickname</Label>
            <p className="text-lg font-medium text-primary">{currentNickname}</p>
            <p className="text-sm text-muted-foreground">
              This is how students will see you in chats. You're now visible to students!
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
              ⚠️ Once set, your nickname cannot be changed. This will make you visible to students.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
