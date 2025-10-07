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

interface ChatRoom {
  id: string;
  student_id: string;
}

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string>("Student");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializeChat = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        await loadActiveChatRooms(user.id);
      }
    };

    initializeChat();

    // Listen for chat room selection from StudentList
    const handleChatRoomSelected = async (event: CustomEvent) => {
      const roomId = event.detail;
      await loadRoomById(roomId);
    };

    window.addEventListener('chatRoomSelected', handleChatRoomSelected as EventListener);
    
    return () => {
      window.removeEventListener('chatRoomSelected', handleChatRoomSelected as EventListener);
    };
  }, []);

  useEffect(() => {
    if (currentRoom?.id) {
      const unsubscribe = subscribeToMessages();
      loadMessages(currentRoom.id);
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [currentRoom?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadActiveChatRooms = async (userId: string) => {
    try {
      const { data: rooms, error } = await supabase
        .from("chat_rooms")
        .select("id, student_id")
        .eq("mentor_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.log("No chat rooms found:", error.message);
        return;
      }

      if (rooms && rooms.length > 0) {
        setCurrentRoom(rooms[0]);
        await loadStudentName(rooms[0].student_id);
        await loadMessages(rooms[0].id);
      }
    } catch (error) {
      console.error("Error loading chat rooms:", error);
    }
  };

  const loadRoomById = async (roomId: string) => {
    const { data: room, error } = await supabase
      .from("chat_rooms")
      .select("id, student_id")
      .eq("id", roomId)
      .single();

    if (error) {
      console.error("Error loading room:", error);
      return;
    }

    setCurrentRoom(room);
    await loadStudentName(room.student_id);
    await loadMessages(room.id);
  };

  const loadStudentName = async (studentId: string) => {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", studentId)
      .single();

    if (!error && profile?.full_name) {
      setStudentName(profile.full_name);
    } else {
      setStudentName("Student");
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

    console.log("Loaded messages:", data);
    setMessages(data || []);
  };

  const subscribeToMessages = () => {
    if (!currentRoom?.id) return;

    const subscription = supabase
      .channel(`room:${currentRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${currentRoom.id}`
        },
        (payload) => {
          console.log("New message received:", payload.new);
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
    
    if (!newMessage.trim() || !currentRoom?.id || !currentUserId) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from("messages")
        .insert({
          room_id: currentRoom.id,
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

  const isMyMessage = (senderId: string) => {
    return senderId === currentUserId;
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle>
          {currentRoom ? `Chat with ${studentName}` : "Chat"}
        </CardTitle>
        <CardDescription>
          {currentRoom 
            ? `You're now chatting with ${studentName}` 
            : "Select a student to start chatting"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {!currentRoom ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground text-center">
              No active chat session
              <br />
              <span className="text-sm">Select a student from the list to start chatting</span>
            </p>
          </div>
        ) : (
          <>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 p-2 border rounded-lg">
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
