-- Create filter_presets table for saving user filter configurations
-- Includes RLS so users can only manage their own presets

-- Ensure pgcrypto for gen_random_uuid (usually enabled in Supabase projects)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

CREATE TABLE IF NOT EXISTS public.filter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_filter_presets_user_id ON public.filter_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_filter_presets_user_name ON public.filter_presets(user_id, name);

-- Row Level Security
ALTER TABLE public.filter_presets ENABLE ROW LEVEL SECURITY;

-- Policies: each user can CRUD their own presets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'filter_presets' AND policyname = 'Users can select own presets'
  ) THEN
    CREATE POLICY "Users can select own presets"
      ON public.filter_presets FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'filter_presets' AND policyname = 'Users can insert own presets'
  ) THEN
    CREATE POLICY "Users can insert own presets"
      ON public.filter_presets FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'filter_presets' AND policyname = 'Users can update own presets'
  ) THEN
    CREATE POLICY "Users can update own presets"
      ON public.filter_presets FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'filter_presets' AND policyname = 'Users can delete own presets'
  ) THEN
    CREATE POLICY "Users can delete own presets"
      ON public.filter_presets FOR DELETE
      USING (user_id = auth.uid());
  END IF;
END$$;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_filter_presets_updated_at ON public.filter_presets;
CREATE TRIGGER set_filter_presets_updated_at
BEFORE UPDATE ON public.filter_presets
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
