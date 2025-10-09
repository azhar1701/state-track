-- Add incident_date to reports to store the date of occurrence provided by the reporter
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS incident_date date;

-- Optional index to filter by incident date faster
CREATE INDEX IF NOT EXISTS idx_reports_incident_date ON public.reports(incident_date);
