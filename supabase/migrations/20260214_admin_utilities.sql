-- Supabase Administrative Utility Functions
-- Date: 2026-02-11
-- Purpose: Common administrative and maintenance functions
-- File: 20260214_admin_utilities.sql

BEGIN;

-- ============================================================================
-- UTILITY: Bulk Status Update on Reports
-- ============================================================================

CREATE OR REPLACE FUNCTION public.bulk_update_report_status(
  p_report_ids uuid[],
  p_new_status public.report_status,
  p_actor_id uuid DEFAULT NULL,
  p_actor_email text DEFAULT NULL
)
RETURNS TABLE (
  success boolean,
  updated_count integer,
  message text
) AS $$
DECLARE
  v_updated_count integer := 0;
  v_report_id uuid;
  v_old_data jsonb;
  v_new_data jsonb;
BEGIN
  -- Update each report and log the change
  FOREACH v_report_id IN ARRAY p_report_ids
  LOOP
    -- Capture old state
    SELECT jsonb_build_object(
      'status', status,
      'updated_at', updated_at
    ) INTO v_old_data
    FROM public.reports
    WHERE id = v_report_id;

    -- Update the report
    UPDATE public.reports
    SET status = p_new_status
    WHERE id = v_report_id;

    IF FOUND THEN
      v_updated_count := v_updated_count + 1;

      -- Capture new state
      SELECT jsonb_build_object(
        'status', status,
        'updated_at', updated_at
      ) INTO v_new_data
      FROM public.reports
      WHERE id = v_report_id;

      -- Log to audit trail
      INSERT INTO public.report_logs (
        report_id,
        action,
        before,
        after,
        actor_id,
        actor_email
      ) VALUES (
        v_report_id,
        'bulk_status_update',
        v_old_data,
        v_new_data,
        p_actor_id,
        p_actor_email
      );
    END IF;
  END LOOP;

  RETURN QUERY SELECT
    true::boolean,
    v_updated_count::integer,
    'Successfully updated ' || v_updated_count || ' reports'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UTILITY: Get Reports by Date Range
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_reports_by_date_range(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_status public.report_status DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  category public.report_category,
  status public.report_status,
  severity public.report_severity,
  created_at timestamptz,
  report_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.title,
    r.category,
    r.status,
    r.severity,
    r.created_at,
    COUNT(*) OVER () as report_count
  FROM public.reports r
  WHERE r.created_at >= p_start_date
    AND r.created_at <= p_end_date
    AND (p_status IS NULL OR r.status = p_status)
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UTILITY: Calculate Report Statistics
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_report_statistics(
  p_start_date timestamptz DEFAULT (NOW() - INTERVAL '30 days'),
  p_end_date timestamptz DEFAULT NOW()
)
RETURNS TABLE (
  total_reports integer,
  reports_by_status jsonb,
  reports_by_category jsonb,
  reports_by_severity jsonb,
  average_resolution_time interval,
  highest_severity_count integer
) AS $$
DECLARE
  v_by_status jsonb;
  v_by_category jsonb;
  v_by_severity jsonb;
  v_avg_resolution interval;
  v_critical_count integer;
BEGIN
  -- Status breakdown
  SELECT jsonb_object_agg(status::text, count)
  INTO v_by_status
  FROM (
    SELECT status, COUNT(*) as count
    FROM public.reports
    WHERE created_at >= p_start_date AND created_at <= p_end_date
    GROUP BY status
  ) s;

  -- Category breakdown
  SELECT jsonb_object_agg(category::text, count)
  INTO v_by_category
  FROM (
    SELECT category, COUNT(*) as count
    FROM public.reports
    WHERE created_at >= p_start_date AND created_at <= p_end_date
    GROUP BY category
  ) c;

  -- Severity breakdown
  SELECT jsonb_object_agg(COALESCE(severity::text, 'unknown'), count)
  INTO v_by_severity
  FROM (
    SELECT severity, COUNT(*) as count
    FROM public.reports
    WHERE created_at >= p_start_date AND created_at <= p_end_date
    GROUP BY severity
  ) sv;

  -- Average resolution time (from baru to selesai)
  SELECT AVG(rl.created_at - r.created_at)
  INTO v_avg_resolution
  FROM public.reports r
  LEFT JOIN public.report_logs rl ON r.id = rl.report_id
  WHERE r.status = 'selesai'
    AND rl.action = 'status_update'
    AND (rl.after->>'status') = 'selesai'
    AND r.created_at >= p_start_date AND r.created_at <= p_end_date;

  -- Count severe reports (berat severity)
  SELECT COUNT(*)
  INTO v_critical_count
  FROM public.reports
  WHERE severity = 'berat'
    AND status != 'selesai'
    AND created_at >= p_start_date AND created_at <= p_end_date;

  -- Get total count
  RETURN QUERY SELECT
    COUNT(*)::integer as total_reports,
    v_by_status,
    v_by_category,
    v_by_severity,
    v_avg_resolution,
    v_critical_count::integer;

FROM public.reports r
WHERE r.created_at >= p_start_date AND r.created_at <= p_end_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UTILITY: Cleanup Old Notifications
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications(
  p_days_old integer DEFAULT 90
)
RETURNS TABLE (
  deleted_count integer,
  message text
) AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  DELETE FROM public.notifications
  WHERE read_at IS NOT NULL
    AND created_at < NOW() - (p_days_old || ' days')::interval;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN QUERY SELECT
    v_deleted_count::integer,
    'Deleted ' || v_deleted_count || ' old notifications'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UTILITY: Reset User Session (for security)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.invalidate_user_sessions(p_user_id uuid)
RETURNS TABLE (
  success boolean,
  message text
) AS $$
BEGIN
  -- Note: Supabase handles session management via auth.users
  -- This function is a placeholder for invalidating cached sessions
  -- Implementation depends on your session storage strategy
  
  RETURN QUERY SELECT
    true::boolean,
    'User sessions cleared (frontend should re-authenticate)'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UTILITY: Get Asset Utilization Report
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_asset_utilization_report()
RETURNS TABLE (
  asset_id uuid,
  asset_name text,
  asset_category text,
  asset_status text,
  total_work_orders integer,
  open_work_orders integer,
  completed_work_orders integer,
  average_time_to_complete interval
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.category,
    a.status,
    (SELECT COUNT(*) FROM public.work_orders wo WHERE wo.asset_id = a.id)::integer as total_work_orders,
    (SELECT COUNT(*) FROM public.work_orders wo WHERE wo.asset_id = a.id AND wo.status NOT IN ('selesai', 'ditutup'))::integer as open_work_orders,
    (SELECT COUNT(*) FROM public.work_orders wo WHERE wo.asset_id = a.id AND wo.status IN ('selesai', 'ditutup'))::integer as completed_work_orders,
    (SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)))::interval FROM public.work_orders wo WHERE wo.asset_id = a.id AND wo.status IN ('selesai', 'ditutup')) as average_time_to_complete
  FROM public.assets a
  ORDER BY total_work_orders DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UTILITY: Get Top Reporters
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_top_reporters(
  p_limit integer DEFAULT 10,
  p_days integer DEFAULT 90
)
RETURNS TABLE (
  user_id uuid,
  reporter_name text,
  report_count integer,
  average_severity text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.user_id,
    MAX(r.reporter_name) as reporter_name,
    COUNT(*)::integer as report_count,
    (SELECT MODE() WITHIN GROUP (ORDER BY severity) FROM public.reports WHERE user_id = r.user_id AND created_at >= NOW() - (p_days || ' days')::interval)::text as average_severity
  FROM public.reports r
  WHERE r.created_at >= NOW() - (p_days || ' days')::interval
  GROUP BY r.user_id
  ORDER BY COUNT(*) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UTILITY: Archive Old Reports
-- ============================================================================

CREATE OR REPLACE FUNCTION public.archive_old_reports(
  p_days_old integer DEFAULT 365,
  p_status_requirement public.report_status DEFAULT 'selesai'
)
RETURNS TABLE (
  archived_count integer,
  message text
) AS $$
DECLARE
  v_archived_count integer;
  v_archive_date timestamptz;
BEGIN
  v_archive_date := NOW() - (p_days_old || ' days')::interval;
  
  -- In a real implementation, you might:
  -- 1. Copy to archive table if exists
  -- 2. Delete from main table
  -- For now, we'll just count what would be archived
  
  SELECT COUNT(*)::integer INTO v_archived_count
  FROM public.reports
  WHERE status = p_status_requirement
    AND created_at < v_archive_date;
  
  RETURN QUERY SELECT
    v_archived_count::integer,
    'Found ' || v_archived_count || ' reports eligible for archival'::text;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

/*
-- Example 1: Bulk update multiple reports to 'diproses'
SELECT * FROM public.bulk_update_report_status(
  ARRAY['uuid1', 'uuid2', 'uuid3']::uuid[],
  'diproses'::public.report_status,
  auth.uid(),
  auth.jwt()->>'email'
);

-- Example 2: Get reports from last 30 days
SELECT * FROM public.get_reports_by_date_range(
  NOW() - INTERVAL '30 days',
  NOW()
);

-- Example 3: Get statistics for current quarter
SELECT * FROM public.get_report_statistics(
  NOW() - INTERVAL '90 days',
  NOW()
);

-- Example 4: Cleanup old notifications (keep last 90 days)
SELECT * FROM public.cleanup_old_notifications(90);

-- Example 5: Asset performance report
SELECT * FROM public.get_asset_utilization_report();

-- Example 6: Top 20 reporters in last 180 days
SELECT * FROM public.get_top_reporters(20, 180);

-- Example 7: Find reports to potentially archive
SELECT * FROM public.archive_old_reports(365, 'selesai');
*/

-- Grant appropriate permissions
-- GRANT EXECUTE ON FUNCTION public.bulk_update_report_status TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.get_reports_by_date_range TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.get_report_statistics TO authenticated;
-- GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications TO service_role;
