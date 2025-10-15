-- Allow admins to view all profiles for user management
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin helper: list all users with profile & role
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ,
  role public.app_role
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied' USING HINT = 'Admin role required';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email,
    COALESCE(p.full_name, ''),
    p.phone,
    u.created_at,
    COALESCE(r.role, 'user'::public.app_role) AS role
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN LATERAL (
    SELECT ur.role
    FROM public.user_roles ur
    WHERE ur.user_id = u.id
    ORDER BY ur.role = 'admin' DESC
    LIMIT 1
  ) r ON TRUE
  ORDER BY u.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users TO authenticated;
