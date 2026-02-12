-- Fix profiles RLS policies to allow admin to view all users

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;

-- Create combined policies
CREATE POLICY "Users can view profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

COMMENT ON POLICY "Users can view profiles" ON public.profiles IS 'Users can view own profile, admins can view all';
COMMENT ON POLICY "Users can update own profile" ON public.profiles IS 'Users can update own profile, admins can update all';
