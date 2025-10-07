// components/StudentList.tsx
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Student {
  id: string;
  email: string;
  user_metadata: {
    name?: string;
  };
}

export const StudentList = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      console.log("Loading students...");
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      // Get all users from auth (this requires proper permissions)
      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError) {
        console.error("Error loading users:", usersError);
        
        // Alternative: Get from profiles table
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "student");
        
        if (profilesError) {
          console.error("Error loading profiles:", profilesError);
          toast.error("Failed to load students");
          return;
        }
        
        if (profiles && profiles.length > 0) {
          // For each profile, get user details
          const studentDetails = await Promise.all(
            profiles.map(async (profile) => {
              const { data: userData } = await supabase.auth.admin.getUserById(profile.id);
              return userData?.user;
            })
          );
          
          setStudents(studentDetails.filter(Boolean) as Student[]);
        }
        return;
      }

      // Filter out current user and get student users
      const studentUsers = users.filter(user => 
        user.id !== user.id && // Exclude current user
        (user.user_metadata?.role === 'student' || !user.user_metadata?.role) // Include students or users without role
      );

      console.log("Found students:", studentUsers);
      setStudents(studentUsers);
      
    } catch (error) {
      console.error("Failed to load students:", error);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const startChat = async (studentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      console.log("Starting chat with student:", studentId);

      // Check if chat room already exists
      const { data: existingRoom } = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("mentor_id", user.id)
        .eq("student_id", studentId)
        .single();

      if (existingRoom) {
        setSelectedStudent(studentId);
        toast.success("Chat room already exists");
        // You can trigger the chat interface to load this room
        window.dispatchEvent(new CustomEvent('chatRoomSelected', { detail: existingRoom.id }));
        return;
      }

      // Create a new chat room
      const { data: room, error } = await supabase
        .from("chat_rooms")
        .insert({
          mentor_id: user.id,
          student_id: studentId,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating room:", error);
        throw error;
      }

      setSelectedStudent(studentId);
      toast.success("Chat started with student!");
      
      // Trigger chat interface to load this room
      window.dispatchEvent(new CustomEvent('chatRoomSelected', { detail: room.id }));
      
    } catch (error: any) {
      console.error("Error starting chat:", error);
      toast.error(error.message || "Failed to start chat");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
          <CardDescription>Loading students...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Students</CardTitle>
        <CardDescription>
          {students.length} student(s) waiting for help
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {students.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No students found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Make sure students are registered and have the 'student' role
            </p>
          </div>
        ) : (
          students.map((student) => (
            <div
              key={student.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1">
                <p className="font-medium">
                  {student.user_metadata?.name || "Anonymous Student"}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {student.email}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => startChat(student.id)}
                variant={selectedStudent === student.id ? "default" : "outline"}
              >
                {selectedStudent === student.id ? "Chatting" : "Chat"}
              </Button>
            </div>
          ))
        )}
        
        {/* Debug button to manually add test student */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={async () => {
            // Create a test student (for development only)
            const { data, error } = await supabase.auth.admin.createUser({
              email: `test.student.${Date.now()}@example.com`,
              password: "testpassword123",
              email_confirm: true,
              user_metadata: { role: 'student', name: 'Test Student' }
            });
            
            if (error) {
              console.error("Error creating test student:", error);
            } else {
              toast.success("Test student created");
              loadStudents();
            }
          }}
        >
          Add Test Student (Dev)
        </Button>
      </CardContent>
    </Card>
  );
};
