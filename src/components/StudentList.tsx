import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Student {
  id: string;
  full_name: string | null;
  email: string;
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
      console.log("Loading students from profiles...");
      
      // Get students from profiles table
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, role, full_name")
        .eq("role", "student");

      if (error) {
        console.error("Error loading profiles:", error);
        toast.error("Failed to load students");
        return;
      }

      console.log("Profiles found:", profiles);

      if (!profiles || profiles.length === 0) {
        console.log("No students found in profiles");
        setStudents([]);
        return;
      }

      // Get user details for each student
      const studentDetails = await Promise.all(
        profiles.map(async (profile) => {
          const { data: { user }, error } = await supabase.auth.admin.getUserById(profile.id);
          if (error) {
            console.error(`Error getting user ${profile.id}:`, error);
            return null;
          }
          return {
            id: profile.id,
            full_name: profile.full_name,
            email: user?.email || "Unknown email"
          };
        })
      );

      const validStudents = studentDetails.filter(Boolean) as Student[];
      console.log("Valid students:", validStudents);
      setStudents(validStudents);
      
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
      const { data: existingRoom, error: checkError } = await supabase
        .from("chat_rooms")
        .select("id")
        .eq("mentor_id", user.id)
        .eq("student_id", studentId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error("Error checking room:", checkError);
      }

      let roomId;

      if (existingRoom) {
        roomId = existingRoom.id;
        toast.success("Resumed existing chat");
      } else {
        // Create a new chat room
        const { data: room, error: createError } = await supabase
          .from("chat_rooms")
          .insert({
            mentor_id: user.id,
            student_id: studentId,
          })
          .select()
          .single();

        if (createError) {
          console.error("Error creating room:", createError);
          throw createError;
        }

        roomId = room.id;
        toast.success("Chat started with student!");
      }

      setSelectedStudent(studentId);
      
      // Trigger chat interface to load this room
      window.dispatchEvent(new CustomEvent('chatRoomSelected', { detail: roomId }));
      
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
              Students will appear here once they register
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={loadStudents}
            >
              Refresh List
            </Button>
          </div>
        ) : (
          students.map((student) => (
            <div
              key={student.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1">
                <p className="font-medium">
                  {student.full_name || "Anonymous Student"}
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
      </CardContent>
    </Card>
  );
};
