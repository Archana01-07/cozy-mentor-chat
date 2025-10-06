-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('student', 'mentor');

-- Create enum for student display modes
CREATE TYPE display_mode AS ENUM ('anonymous', 'nickname', 'real_name');

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  real_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create student preferences table
CREATE TABLE student_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  display_mode display_mode NOT NULL DEFAULT 'anonymous',
  nickname TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS on student_preferences
ALTER TABLE student_preferences ENABLE ROW LEVEL SECURITY;

-- Student preferences policies
CREATE POLICY "Students can view own preferences"
  ON student_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Students can update own preferences"
  ON student_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Students can insert own preferences"
  ON student_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create anonymous mappings table (tracks which anonymous number each student gets per mentor)
CREATE TABLE anonymous_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  anonymous_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, mentor_id)
);

-- Enable RLS on anonymous_mappings
ALTER TABLE anonymous_mappings ENABLE ROW LEVEL SECURITY;

-- Anonymous mappings policies
CREATE POLICY "Mentors can view anonymous mappings"
  ON anonymous_mappings FOR SELECT
  USING (auth.uid() = mentor_id);

CREATE POLICY "System can insert anonymous mappings"
  ON anonymous_mappings FOR INSERT
  WITH CHECK (true);

-- Create chat messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  sender_role user_role NOT NULL,
  student_display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat messages policies
CREATE POLICY "Students can view own messages"
  ON chat_messages FOR SELECT
  USING (auth.uid() = student_id OR auth.uid() = mentor_id);

CREATE POLICY "Students can insert messages"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = student_id OR auth.uid() = mentor_id);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Create function to auto-increment anonymous numbers
CREATE OR REPLACE FUNCTION get_or_create_anonymous_number(
  p_student_id UUID,
  p_mentor_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_anonymous_number INTEGER;
  v_max_number INTEGER;
BEGIN
  -- Check if mapping already exists
  SELECT anonymous_number INTO v_anonymous_number
  FROM anonymous_mappings
  WHERE student_id = p_student_id AND mentor_id = p_mentor_id;
  
  IF v_anonymous_number IS NOT NULL THEN
    RETURN v_anonymous_number;
  END IF;
  
  -- Get the max anonymous number for this mentor
  SELECT COALESCE(MAX(anonymous_number), 0) INTO v_max_number
  FROM anonymous_mappings
  WHERE mentor_id = p_mentor_id;
  
  -- Create new mapping with next number
  INSERT INTO anonymous_mappings (student_id, mentor_id, anonymous_number)
  VALUES (p_student_id, p_mentor_id, v_max_number + 1)
  RETURNING anonymous_number INTO v_anonymous_number;
  
  RETURN v_anonymous_number;
END;
$$;

-- Create trigger to update student_preferences updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_student_preferences_updated_at
  BEFORE UPDATE ON student_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();