-- Add a resolution/hasil laporan column for admin outcomes
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS resolution TEXT; 

-- Optional index if filtering by presence of resolution becomes common
-- CREATE INDEX IF NOT EXISTS idx_reports_resolution_present ON public.reports ((resolution IS NOT NULL));
