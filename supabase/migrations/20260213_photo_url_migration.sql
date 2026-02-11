-- Migration: Photo URL Schema Consolidation
-- Date: 2026-02-11
-- Purpose: Migrate single photo_url to photo_urls array (optional cleanup)
-- File: 20260213_photo_url_migration.sql
-- 
-- This migration consolidates single photo URLs to the photo_urls array.
-- RUN THIS MIGRATION ONLY IF:
-- 1. You want to deprecate the legacy photo_url column
-- 2. All parts of the codebase are using photo_urls[] array
-- 3. You have backed up your database
-- 
-- STEPS:
-- 1. First deploy this as a migration
-- 2. Run: UPDATE reports SET photo_urls = ... (see below)
-- 3. Verify all reports have photos migrated
-- 4. Run: ALTER TABLE ... DROP COLUMN (see below)
-- 5. Update TypeScript types

BEGIN;

-- Step 1: Create the photo_urls column if not exists (it should)
-- ALTER TABLE public.reports
-- ADD COLUMN IF NOT EXISTS photo_urls text[] DEFAULT '{}';

-- Step 2: Migrate data from photo_url to photo_urls (if photo_url exists and photo_urls is empty)
UPDATE public.reports
SET photo_urls = ARRAY[photo_url]
WHERE photo_url IS NOT NULL
  AND (photo_urls IS NULL OR photo_urls = '{}' OR array_length(photo_urls, 1) IS NULL);

-- Step 3: Add a trigger to maintain backward compatibility (optional, for gradual migration)
-- Create or replace function to sync photo_url and photo_urls
CREATE OR REPLACE FUNCTION public.sync_photo_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- When photo_urls is updated, sync first element to photo_url
  IF NEW.photo_urls IS NOT NULL AND array_length(NEW.photo_urls, 1) > 0 THEN
    NEW.photo_url := NEW.photo_urls[1];
  END IF;
  
  -- When photo_url is updated, add to photo_urls if not already present
  IF NEW.photo_url IS NOT NULL AND NEW.photo_url != OLD.photo_url THEN
    IF NEW.photo_urls IS NULL OR array_length(NEW.photo_urls, 1) IS NULL THEN
      NEW.photo_urls := ARRAY[NEW.photo_url];
    ELSIF NOT NEW.photo_url = ANY(NEW.photo_urls) THEN
      -- Add to array if not already present
      NEW.photo_urls := ARRAY_PREPEND(NEW.photo_url, NEW.photo_urls);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS sync_photo_fields_trigger ON public.reports;
CREATE TRIGGER sync_photo_fields_trigger
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.sync_photo_fields();

COMMIT;

-- ============================================================================
-- DEPRECATION PHASE - Run after verifying data migration (Step 4 below)
-- ============================================================================

-- Once you've verified all photo URLs are in photo_urls array:
-- 1. Remove the sync trigger
-- 2. Drop the photo_url column
-- 3. Update TypeScript types

/*
BEGIN;

-- Remove the sync trigger
DROP TRIGGER IF EXISTS sync_photo_fields_trigger ON public.reports;
DROP FUNCTION IF EXISTS public.sync_photo_fields();

-- Drop the legacy photo_url column (IRREVERSIBLE - backup first!)
ALTER TABLE public.reports
DROP COLUMN IF EXISTS photo_url CASCADE;

-- Add a comment documenting the deprecation
COMMENT ON COLUMN public.reports.photo_urls IS 
  'Array of photo URLs for the report. Unified single source of truth for all photos. '
  'Legacy single photo_url column was deprecated and removed 2026-02-11.';

COMMIT;
*/

-- ============================================================================
-- VERIFICATION & MONITORING
-- ============================================================================

/*
-- Check migration status
SELECT 
  COUNT(*) as total_reports,
  COUNT(CASE WHEN photo_url IS NOT NULL THEN 1 END) as with_legacy_photo_url,
  COUNT(CASE WHEN photo_urls IS NOT NULL AND array_length(photo_urls, 1) > 0 THEN 1 END) as with_photo_urls_array,
  COUNT(CASE WHEN photo_url IS NOT NULL AND (photo_urls IS NULL OR array_length(photo_urls, 1) IS NULL) THEN 1 END) as needs_migration
FROM public.reports;

-- Show reports that still need migration
SELECT id, title, photo_url, photo_urls
FROM public.reports
WHERE photo_url IS NOT NULL 
  AND (photo_urls IS NULL OR array_length(photo_urls, 1) IS NULL)
LIMIT 100;

-- Show reports with both fields populated (should be synced)
SELECT id, title, photo_url, photo_urls[1] as first_in_array
FROM public.reports
WHERE photo_url IS NOT NULL 
  AND photo_urls IS NOT NULL 
  AND array_length(photo_urls, 1) > 0
LIMIT 20;
*/

-- ============================================================================
-- IMPLEMENTATION NOTES
-- ============================================================================

/*
RATIONALE:
- photo_urls[] is more flexible (supports unlimited photos)
- photo_url (legacy) was designed for single photo
- Migration consolidates to single source of truth
- Backward compatibility maintained during transition with sync trigger

MIGRATION STRATEGY:
1. Phase 1 (Immediate): Create photo_urls if missing, migrate existing URLs
2. Phase 2 (1-2 weeks): Sync trigger maintains backward compatibility
3. Phase 3 (Code changes): Update frontend to use only photo_urls[]
4. Phase 4 (Cleanup): Remove photo_url column and sync trigger

FRONTEND UPDATES NEEDED:
- Replace: report.photo_url
- With: report.photo_urls?.[0] (first photo) or report.photo_urls (all photos)
- Update upload handlers to append to photo_urls array
- Update TypeScript types in src/integrations/supabase/types.ts

TESTING:
- Verify old reports with photo_url display correctly
- Verify new reports use photo_urls array
- Test bulk operations with mixed data
- Verify RLS policies still work
- Check storage bucket references
*/
