-- Migration: Add Missing Production Columns
-- Date: 2026-03-12
-- Purpose: Add priority_score and ensure photo_urls exists for the new refactored form

BEGIN;

-- 1. Add priority_score for automated sorting/triage
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 0;

-- 2. Ensure photo_urls (array) exists for multi-photo support
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}';

-- 3. Add index on priority_score for faster dashboard loading
CREATE INDEX IF NOT EXISTS idx_reports_priority_score ON public.reports(priority_score DESC);

-- 4. Update existing records if necessary
UPDATE public.reports 
SET priority_score = 0 
WHERE priority_score IS NULL;

COMMIT;
