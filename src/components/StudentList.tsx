// In StudentList component, update the startChat function:
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

    if (error) {
      // If room already exists, just use the existing one
      if (error.code === '23505') { // Unique violation
        const { data: existingRoom } = await supabase
          .from("chat_rooms")
          .select("id")
          .eq("mentor_id", user.id)
          .eq("student_id", studentId)
          .single();
        
        if (existingRoom) {
          setSelectedStudent(studentId);
          // You might want to pass this to ChatInterface via props or context
          toast.success("Resumed existing chat");
          return;
        }
      }
      throw error;
    }

    setSelectedStudent(studentId);
    toast.success("Chat started with student");
    
    // Refresh the page to trigger ChatInterface to load the new room
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    
  } catch (error) {
    console.error("Error starting chat:", error);
    toast.error("Failed to start chat");
  }
};
