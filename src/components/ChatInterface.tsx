// components/ChatInterface.tsx
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_anonymous: boolean;
}

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get current user ID and load active chat room
    const initializeChat = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        await loadActiveChatRoom(user.id);
      }
    };

    initializeChat();
  }, []);

  useEffect(() => {
    if (currentRoom) {
      const unsubscribe = subscribeToMessages();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [currentRoom]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadActiveChatRoom = async (userId: string) => {
    try {
      const { data: room, error } = await supabase
        .from("chat_rooms")
        .select("id, student_id, created_at")
        .eq("mentor_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.log("No active chat room found:", error.message);
        return;
      }

      setCurrentRoom(room.id);
      await loadMessages(room.id);
    } catch (error) {
      console.error("Error loading chat room:", error);
    }
  };

  const loadMessages = async (roomId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
      return;
    }

    setMessages(data || []);
  };

  const subscribeToMessages = () => {
    if (!currentRoom) return;

    const subscription = supabase
      .channel(`room:${currentRoom}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${currentRoom}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !currentRoom || !currentUserId) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from("messages")
        .insert({
          room_id: currentRoom,
          sender_id: currentUserId,
          content: newMessage.trim(),
          is_anonymous: false,
        });

      if (error) throw error;

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  // Function to determine if message is from current user
  const isMyMessage = (senderId: string) => {
    return senderId === currentUserId;
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle>Chat with Student</CardTitle>
        <CardDescription>
          {currentRoom 
            ? "You're now chatting with a student" 
            : "Start a chat with a student from the list"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {!currentRoom ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground text-center">
              Select a student to start chatting
              <br />
              <span className="text-sm">No active chat session</span>
            </p>
          </div>
        ) : (
          <>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 p-2">
              {messages.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No messages yet. Start the conversation!
                </p>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      isMyMessage(message.sender_id) ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        isMyMessage(message.sender_id)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        isMyMessage(message.sender_id)
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      }`}>
                        {new Date(message.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={sendMessage} className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                disabled={loading}
              />
              <Button type="submit" disabled={loading || !newMessage.trim()}>
                Send
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
};
