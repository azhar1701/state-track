-- Add NIK/NIP field to profiles
-- For government employee identification

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nik_nip TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_nik_nip ON public.profiles(nik_nip);

-- Update handle_new_user function to include nik_nip
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, nik_nip, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    COALESCE(NEW.raw_user_meta_data->>'nik_nip', NULL),
    NEW.created_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update sync_profile_updates function to include nik_nip
CREATE OR REPLACE FUNCTION sync_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{full_name}',
        to_jsonb(NEW.full_name)
      ),
      '{phone}',
      to_jsonb(NEW.phone)
    ),
    '{nik_nip}',
    to_jsonb(NEW.nik_nip)
  )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger to watch nik_nip changes
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (
    OLD.full_name IS DISTINCT FROM NEW.full_name OR 
    OLD.phone IS DISTINCT FROM NEW.phone OR
    OLD.nik_nip IS DISTINCT FROM NEW.nik_nip
  )
  EXECUTE FUNCTION sync_profile_updates();

COMMENT ON COLUMN public.profiles.nik_nip IS 'NIK (Nomor Induk Kependudukan) or NIP (Nomor Induk Pegawai) for identification';
