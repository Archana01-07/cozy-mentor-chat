-- 1) Create user_roles to avoid recursive RLS on profiles
DO $$ BEGIN
  CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    UNIQUE(user_id, role)
  );
EXCEPTION WHEN duplicate_table THEN
  NULL;
END $$;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2) Security definer function to check roles safely (no recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

-- 3) Seed roles from existing profiles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.profiles
ON CONFLICT DO NOTHING;

-- 4) Fix RLS on profiles to use has_role()
DROP POLICY IF EXISTS "Mentors can view students" ON public.profiles;
DROP POLICY IF EXISTS "Students can view mentors" ON public.profiles;

CREATE POLICY "Mentors can view students"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'mentor') AND role = 'student');

CREATE POLICY "Students can view mentors"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'student') AND role = 'mentor');

-- 5) Create mentor_preferences for nickname (one-time set)
DO $$ BEGIN
  CREATE TABLE public.mentor_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    nickname TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
EXCEPTION WHEN duplicate_table THEN
  NULL;
END $$;

ALTER TABLE public.mentor_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can insert own preferences"
ON public.mentor_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Mentors can update own preferences"
ON public.mentor_preferences
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Mentors can view own preferences"
ON public.mentor_preferences
FOR SELECT
USING (auth.uid() = user_id);

-- Timestamp trigger
DO $$ BEGIN
  CREATE TRIGGER update_mentor_prefs_updated_at
  BEFORE UPDATE ON public.mentor_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- 6) Add mentor_display_name to chat_messages
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS mentor_display_name TEXT NOT NULL DEFAULT 'Mentor';

-- Ensure existing rows have a value
UPDATE public.chat_messages
SET mentor_display_name = COALESCE(mentor_display_name, 'Mentor')
WHERE mentor_display_name IS NULL;