// components/StudentList.tsx
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      // First, get all users with student role
      const { data: { users }, error } = await supabase.auth.admin.listUsers();
      
      if (error) {
        console.error("Error loading students:", error);
        return;
      }

      // Filter students (you might want to add a role field to your users)
      const studentUsers = users.filter(user => 
        user.user_metadata?.role === 'student' || 
        !user.user_metadata?.role // or all non-mentor users
      );

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
      if (!user) return;

      // Create a chat room
      const { data: room, error } = await supabase
        .from("chat_rooms")
        .insert({
          mentor_id: user.id,
          student_id: studentId,
        })
        .select()
        .single();

      if (error) throw error;

      setSelectedStudent(studentId);
      toast.success("Chat started with student");
      
      // You might want to trigger a chat interface here
    } catch (error) {
      console.error("Error starting chat:", error);
      toast.error("Failed to start chat");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
          <CardDescription>Loading students...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Students</CardTitle>
        <CardDescription>
          {students.length} students waiting for help
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {students.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No students available right now
          </p>
        ) : (
          students.map((student) => (
            <div
              key={student.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div>
                <p className="font-medium">
                  {student.user_metadata?.name || "Student"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {student.email}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => startChat(student.id)}
                variant={selectedStudent === student.id ? "default" : "outline"}
              >
                {selectedStudent === student.id ? "Chatting" : "Start Chat"}
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
