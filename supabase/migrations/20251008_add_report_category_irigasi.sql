-- Ensure 'irigasi' exists in report_category enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'report_category' AND e.enumlabel = 'irigasi'
  ) THEN
    ALTER TYPE public.report_category ADD VALUE IF NOT EXISTS 'irigasi';
  END IF;
END$$;
