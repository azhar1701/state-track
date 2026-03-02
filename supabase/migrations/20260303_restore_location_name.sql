-- Restore location_name in reports table if it was accidentally renamed to keterangan
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reports' AND column_name='keterangan') THEN
    ALTER TABLE public.reports RENAME COLUMN keterangan TO location_name;
  END IF;
END $$;
