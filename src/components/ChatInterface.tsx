import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Send, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PrivacyToggle } from "./PrivacyToggle";
import { MentorPrivacyToggle } from "./MentorPrivacyToggle";

interface Message {
  id: string;
  student_id: string;
  mentor_id: string;
  message: string;
  sender_role: "student" | "mentor";
  student_display_name: string;
  mentor_display_name?: string;
  created_at: string;
}

interface ChatInterfaceProps {
  role: "student" | "mentor";
}

export const ChatInterface = ({ role }: ChatInterfaceProps) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [chatPartnerId, setChatPartnerId] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeChat();
  }, []);

  const initializeChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/");
      return;
    }

    setUserId(user.id);

    // Get chat partner (first available mentor/student)
    const partnerRole = role === "student" ? "mentor" : "student";
    const { data: partners } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", partnerRole)
      .limit(1);

    if (partners && partners.length > 0) {
      setChatPartnerId(partners[0].id);
      loadMessages(user.id, partners[0].id);
      subscribeToMessages(user.id, partners[0].id);
    } else {
      toast.error(`No ${partnerRole}s available yet`);
    }

    setLoading(false);
  };

  const loadMessages = async (studentId: string, mentorId: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .or(`student_id.eq.${studentId},student_id.eq.${mentorId}`)
      .or(`mentor_id.eq.${studentId},mentor_id.eq.${mentorId}`)
      .order("created_at", { ascending: true });

    if (data) setMessages(data);
  };

  const subscribeToMessages = (studentId: string, mentorId: string) => {
    const channel = supabase
      .channel("chat-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (
            (newMsg.student_id === studentId && newMsg.mentor_id === mentorId) ||
            (newMsg.student_id === mentorId && newMsg.mentor_id === studentId)
          ) {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getDisplayName = async () => {
    if (role === "mentor") {
      // @ts-ignore - mentor_preferences table exists but types not regenerated yet
      const { data: prefs }: any = await supabase.from("mentor_preferences")
        .select("nickname")
        .eq("user_id", userId)
        .maybeSingle();
      
      return prefs?.nickname || "Mentor";
    }

    const { data: prefs } = await supabase
      .from("student_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!prefs) return "Anonymous";

    if (prefs.display_mode === "real_name") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("real_name")
        .eq("id", userId)
        .maybeSingle();
      return profile?.real_name || "Student";
    }

    if (prefs.display_mode === "nickname" && prefs.nickname) {
      return prefs.nickname;
    }

    // Determine student and mentor IDs correctly
    const studentId = role === "student" ? userId : chatPartnerId;
    const mentorId = role === "student" ? chatPartnerId : userId;
    
    const { data: anonData } = await supabase.rpc("get_or_create_anonymous_number", {
      p_student_id: studentId,
      p_mentor_id: mentorId,
    });

    return `Anonymous ${anonData}`;
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatPartnerId) return;

    const displayName = await getDisplayName();

    const messageData: any = {
      student_id: role === "student" ? userId : chatPartnerId,
      mentor_id: role === "mentor" ? userId : chatPartnerId,
      message: newMessage.trim(),
      sender_role: role,
      student_display_name: role === "student" ? displayName : "Student",
    };

    // Always include mentor_display_name
    messageData.mentor_display_name = role === "mentor" ? displayName : "Mentor";

    const { error } = await supabase.from("chat_messages").insert(messageData);

    if (error) {
      toast.error("Failed to send message");
      return;
    }

    setNewMessage("");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-secondary/20 to-accent/10">
      {/* Header */}
      <div className="bg-card border-b shadow-sm p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-foreground">
              {role === "student" ? "Talk to a Mentor" : "Mentor Dashboard"}
            </h1>
            {role === "student" && <PrivacyToggle />}
            {role === "mentor" && <MentorPrivacyToggle />}
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-180px)] max-w-4xl mx-auto p-6">
          <div className="space-y-4">
            {messages.length === 0 && !loading && (
              <div className="text-center text-muted-foreground py-12">
                <p>No messages yet. Start the conversation!</p>
              </div>
            )}
            
            {messages.map((msg) => {
              const isOwn = msg.sender_role === role;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className={isOwn ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}>
                      {msg.sender_role === "student" 
                        ? msg.student_display_name[0] 
                        : (msg.mentor_display_name?.[0] || "M")}
                    </AvatarFallback>
                  </Avatar>
                  <Card
                    className={`p-4 max-w-md ${
                      isOwn
                        ? "bg-primary text-primary-foreground"
                        : "bg-card"
                    }`}
                  >
                    <p className="text-sm font-medium mb-1">
                      {msg.sender_role === "student" 
                        ? msg.student_display_name 
                        : (msg.mentor_display_name || "Mentor")}
                    </p>
                    <p>{msg.message}</p>
                    <p className={`text-xs mt-2 ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </p>
                  </Card>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input */}
      <div className="border-t bg-card p-4">
        <form onSubmit={sendMessage} className="max-w-4xl mx-auto flex gap-2">
          <Input
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={!newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
