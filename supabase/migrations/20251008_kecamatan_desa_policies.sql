-- Enable RLS and allow read access for kecamatan and desa
DO $$
BEGIN
  -- kecamatan
  BEGIN
    EXECUTE 'ALTER TABLE public.kecamatan ENABLE ROW LEVEL SECURITY';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kecamatan' AND policyname = 'kecamatan_select'
  ) THEN
    CREATE POLICY kecamatan_select ON public.kecamatan FOR SELECT USING (true);
  END IF;

  -- desa
  BEGIN
    EXECUTE 'ALTER TABLE public.desa ENABLE ROW LEVEL SECURITY';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'desa' AND policyname = 'desa_select'
  ) THEN
    CREATE POLICY desa_select ON public.desa FOR SELECT USING (true);
  END IF;
END$$;
