-- Add photo_urls JSONB to reports and backfill from photo_url
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS photo_urls JSONB DEFAULT '[]'::jsonb;

-- Backfill: if photo_url exists and photo_urls is empty or null, set it as single-element array
UPDATE public.reports
SET photo_urls = to_jsonb(ARRAY[photo_url])
WHERE photo_url IS NOT NULL AND (photo_urls IS NULL OR jsonb_array_length(photo_urls) = 0);

-- Optional GIN index for containment queries (e.g., photos @> '["https://..."]')
CREATE INDEX IF NOT EXISTS idx_reports_photo_urls_gin ON public.reports USING GIN (photo_urls jsonb_path_ops);
