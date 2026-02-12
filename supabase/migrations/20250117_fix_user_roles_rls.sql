-- Fix user_roles RLS policies to allow admin to manage roles
-- Avoid infinite recursion by using security definer function

-- Drop existing policies
DROP POLICY IF EXISTS "Admin can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin can view all roles" ON public.user_roles;

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is admin (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create simple policies using the function
CREATE POLICY "Allow admin full access to user_roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

COMMENT ON FUNCTION is_admin IS 'Check if current user is admin (bypasses RLS)';
COMMENT ON POLICY "Allow admin full access to user_roles" ON public.user_roles IS 'Admins have full access to manage roles';
