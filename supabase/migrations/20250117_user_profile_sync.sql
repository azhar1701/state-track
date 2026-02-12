-- User Profile Sync Migration
-- Ensures profile is created automatically when user signs up

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    NEW.created_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Function to sync profile updates
CREATE OR REPLACE FUNCTION sync_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- Update auth.users metadata when profile changes
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{full_name}',
      to_jsonb(NEW.full_name)
    ),
    '{phone}',
    to_jsonb(NEW.phone)
  )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on profiles update
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.full_name IS DISTINCT FROM NEW.full_name OR OLD.phone IS DISTINCT FROM NEW.phone)
  EXECUTE FUNCTION sync_profile_updates();

-- Add email column to profiles for easier querying (optional, denormalized)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Function to sync email from auth.users
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users email change
DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION sync_user_email();

-- Backfill existing users' emails
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Update RLS policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin can view all profiles
CREATE POLICY "Admin can view all profiles" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Admin can update all profiles
CREATE POLICY "Admin can update all profiles" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

COMMENT ON FUNCTION handle_new_user IS 'Automatically creates profile when user signs up';
COMMENT ON FUNCTION sync_profile_updates IS 'Syncs profile changes back to auth.users metadata';
COMMENT ON FUNCTION sync_user_email IS 'Syncs email from auth.users to profiles table';
