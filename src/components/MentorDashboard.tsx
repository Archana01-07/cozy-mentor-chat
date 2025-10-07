// components/MentorDashboard.tsx
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MentorPrivacyToggle } from "./MentorPrivacyToggle";
import { StudentList } from "./StudentList";
import { ChatInterface } from "./ChatInterface";

export const MentorDashboard = () => {
  const [hasNickname, setHasNickname] = useState<boolean | null>(null);
  const [currentNickname, setCurrentNickname] = useState("");

  useEffect(() => {
    checkNicknameStatus();
  }, []);

  const checkNicknameStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("mentor_preferences")
      .select("nickname")
      .eq("user_id", user.id)
      .single();

    if (data?.nickname) {
      setHasNickname(true);
      setCurrentNickname(data.nickname);
    } else {
      setHasNickname(false);
    }
  };

  if (hasNickname === null) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {!hasNickname ? (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Welcome, Mentor!</h1>
            <p className="text-muted-foreground">
              Set up your nickname to start helping students
            </p>
          </div>
          <MentorPrivacyToggle />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Welcome, {currentNickname}!</h1>
            <p className="text-muted-foreground">
              You're now visible to students and can start chatting
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <StudentList />
            </div>
            <div className="lg:col-span-2">
              <ChatInterface />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
