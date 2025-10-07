-- Fix recursive RLS policies by using security definer functions

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Students can view mentors" ON profiles;
DROP POLICY IF EXISTS "Mentors can view students" ON profiles;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = user_id;
$$;

-- Create proper cross-role viewing policies
CREATE POLICY "Students can view mentors"
  ON profiles FOR SELECT
  USING (
    public.get_user_role(auth.uid()) = 'student' 
    AND role = 'mentor'
  );

CREATE POLICY "Mentors can view students"
  ON profiles FOR SELECT
  USING (
    public.get_user_role(auth.uid()) = 'mentor' 
    AND role = 'student'
  );

-- Update chat policies to ensure both can see messages
DROP POLICY IF EXISTS "Students can view own messages" ON chat_messages;
DROP POLICY IF EXISTS "Students can insert messages" ON chat_messages;

CREATE POLICY "Users can view their messages"
  ON chat_messages FOR SELECT
  USING (auth.uid() = student_id OR auth.uid() = mentor_id);

CREATE POLICY "Users can send messages"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = student_id OR auth.uid() = mentor_id);