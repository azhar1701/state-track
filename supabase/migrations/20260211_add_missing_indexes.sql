-- Migration: Add Missing Indexes for Performance
-- Date: 2026-02-11
-- Purpose: Improve query performance for common filtering and sorting operations
-- File: 20260211_add_missing_indexes.sql

BEGIN;

-- Add indexes for common report queries
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at_desc ON public.reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_category ON public.reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_severity ON public.reports(severity);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_reports_user_status_created 
  ON public.reports(user_id, status, created_at DESC);

-- Add indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_report_logs_created_at_desc 
  ON public.report_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_logs_action 
  ON public.report_logs(action);

-- Add indexes for asset queries
CREATE INDEX IF NOT EXISTS idx_assets_updated_at 
  ON public.assets(updated_at DESC);

-- Add indexes for work order priority queries
CREATE INDEX IF NOT EXISTS idx_wo_status_priority 
  ON public.work_orders(status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_wo_due_date 
  ON public.work_orders(due_date);

-- Add index for notification performance on common queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
  ON public.notifications(user_id, read_at, created_at DESC);

-- Add indexes for geospatial queries if using PostGIS
-- Uncomment if PostGIS is enabled:
-- CREATE INDEX IF NOT EXISTS idx_reports_location 
--   ON public.reports USING GIST(ll_to_earth(latitude, longitude));
-- CREATE INDEX IF NOT EXISTS idx_assets_location 
--   ON public.assets USING GIST(ll_to_earth(latitude, longitude));

COMMIT;

-- Analyze query plans after adding indexes
-- ANALYZE;
