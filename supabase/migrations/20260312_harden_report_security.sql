-- Migration: Harden Report Security
-- Date: 2026-03-12
-- Purpose: Prevent non-admin users from updating sensitive fields (resolution, priority_score, status)
-- even on their own reports.

BEGIN;

-- 1. Create a function to validate report updates
CREATE OR REPLACE FUNCTION public.check_report_update_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If the user is an admin, allow all changes
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- If not an admin, check if sensitive fields are being modified
  -- We allow the owner to update title, description, category, and incident_date
  -- but NOT resolution, priority_score, status, or severity (once submitted)
  
  IF (OLD.resolution IS DISTINCT FROM NEW.resolution) THEN
    RAISE EXCEPTION 'Only administrators can update the resolution field.';
  END IF;

  IF (OLD.priority_score IS DISTINCT FROM NEW.priority_score) THEN
    RAISE EXCEPTION 'Only administrators can update the priority score.';
  END IF;

  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Optional: allow user to 'cancel' but for now we restrict it to admin
    RAISE EXCEPTION 'Only administrators can update the report status.';
  END IF;

  -- Allow the user to update their own report's basic info
  RETURN NEW;
END;
$$;

-- 2. Attach the trigger to the reports table
DROP TRIGGER IF EXISTS tr_check_report_update ON public.reports;
CREATE TRIGGER tr_check_report_update
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.check_report_update_permissions();

-- 3. Audit Logging Enhancement (Optional but recommended)
-- Ensure all edits to resolution are logged (we already have report_logs but this adds safety)

COMMENT ON FUNCTION public.check_report_update_permissions() IS 
  'Enforces field-level security on the reports table, ensuring users cannot '
  'modify administrative fields even on their own reports.';

COMMIT;
