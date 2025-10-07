-- Create an enum for report severity and add a column to reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t WHERE t.typname = 'report_severity'
  ) THEN
    CREATE TYPE public.report_severity AS ENUM ('ringan','sedang','berat');
  END IF;
END$$;

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS severity public.report_severity;

-- Optional index for filtering
CREATE INDEX IF NOT EXISTS idx_reports_severity ON public.reports(severity);
