-- Data Integrity Check Script for State-Track
-- Date: 2026-02-11
-- Purpose: Verify data consistency and identify potential issues
-- Usage: Run in Supabase SQL Editor (not a migration)
-- 
-- This script performs various checks on the database and reports issues
-- that may need attention or cleanup.

-- ============================================================================
-- 1. CHECK FOR ORPHANED RECORDS
-- ============================================================================

-- Check for reports with non-existent users
SELECT COUNT(*) as orphaned_reports
FROM public.reports r
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = r.user_id
)
LIMIT 1000;

-- Check for work orders with non-existent assigned users
SELECT wo.id, wo.title, wo.assigned_to
FROM public.work_orders wo
WHERE wo.assigned_to IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = wo.assigned_to
  )
LIMIT 1000;

-- Check for notifications with non-existent users
SELECT COUNT(*) as orphaned_notifications
FROM public.notifications n
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = n.user_id
)
LIMIT 1000;

-- ============================================================================
-- 2. CHECK FOR INVALID ENUM VALUES
-- ============================================================================

-- Check for reports with invalid status values
SELECT id, status, COUNT(*) as cnt
FROM public.reports
WHERE status NOT IN ('baru', 'diproses', 'selesai')
GROUP BY status;

-- Check for reports with invalid category values
SELECT id, category, COUNT(*) as cnt
FROM public.reports
WHERE category NOT IN ('jalan', 'jembatan', 'irigasi', 'drainase', 'sungai', 'lainnya')
GROUP BY category;

-- Check for reports with invalid severity values
SELECT id, severity, COUNT(*) as cnt
FROM public.reports
WHERE severity IS NOT NULL
  AND severity NOT IN ('ringan', 'sedang', 'berat')
GROUP BY severity;

-- Check for assets with invalid status values
SELECT id, status, COUNT(*) as cnt
FROM public.assets
WHERE status NOT IN ('aktif', 'nonaktif', 'rusak')
GROUP BY status;

-- Check for assets with invalid category values
SELECT id, category, COUNT(*) as cnt
FROM public.assets
WHERE category NOT IN ('jalan', 'jembatan', 'irigasi', 'drainase', 'sungai', 'lainnya')
GROUP BY category;

-- Check for work orders with invalid status
SELECT id, status, COUNT(*) as cnt
FROM public.work_orders
WHERE status NOT IN ('baru', 'dalam_proses', 'selesai', 'ditutup')
GROUP BY status;

-- Check for work orders with invalid priority
SELECT id, priority, COUNT(*) as cnt
FROM public.work_orders
WHERE priority NOT IN ('rendah', 'sedang', 'tinggi', 'kritikal')
GROUP BY priority;

-- ============================================================================
-- 3. CHECK FOR DATA QUALITY ISSUES
-- ============================================================================

-- Reports without title or description
SELECT COUNT(*) as reports_missing_required_fields
FROM public.reports
WHERE title IS NULL OR title = ''
   OR description IS NULL OR description = '';

-- Reports with missing location data
SELECT COUNT(*) as reports_missing_location
FROM public.reports
WHERE latitude IS NULL 
   OR longitude IS NULL 
   OR (location_name IS NULL AND kecamatan IS NULL AND desa IS NULL);

-- Reports with invalid coordinates (outside valid range)
SELECT id, latitude, longitude
FROM public.reports
WHERE latitude < -90 OR latitude > 90
   OR longitude < -180 OR longitude > 180
LIMIT 100;

-- Work orders without assigned asset
SELECT COUNT(*) as work_orders_no_asset
FROM public.work_orders
WHERE asset_id IS NULL;

-- Work orders with past due dates (without completion)
SELECT id, title, due_date, status
FROM public.work_orders
WHERE due_date < CURRENT_DATE
  AND status NOT IN ('selesai', 'ditutup')
LIMIT 100;

-- ============================================================================
-- 4. CHECK FOR DUPLICATE DATA
-- ============================================================================

-- Duplicate report locations (potential duplicates)
SELECT 
  latitude, 
  longitude, 
  category, 
  COUNT(*) as duplicate_count
FROM public.reports
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY latitude, longitude, category
HAVING COUNT(*) > 1
LIMIT 100;

-- Duplicate assets
SELECT code, COUNT(*) as cnt
FROM public.assets
GROUP BY code
HAVING COUNT(*) > 1;

-- Duplicate desa in same kecamatan
SELECT kecamatan_id, name, COUNT(*) as cnt
FROM public.desa
GROUP BY kecamatan_id, name
HAVING COUNT(*) > 1;

-- ============================================================================
-- 5. CHECK TEMPORAL DATA CONSISTENCY
-- ============================================================================

-- Reports with updated_at before created_at
SELECT id, created_at, updated_at
FROM public.reports
WHERE updated_at < created_at
LIMIT 100;

-- Work orders with updated_at before created_at
SELECT id, created_at, updated_at
FROM public.work_orders
WHERE updated_at < created_at
LIMIT 100;

-- Reports with future created_at dates
SELECT id, created_at, title
FROM public.reports
WHERE created_at > CURRENT_TIMESTAMP + INTERVAL '1 day'
LIMIT 100;

-- ============================================================================
-- 6. CHECK RLS POLICY EFFECTIVENESS
-- ============================================================================

-- Count policies per table
SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count,
  ARRAY_AGG(policyname) as policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Check for tables with RLS disabled
SELECT 
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity IS FALSE
ORDER BY tablename;

-- ============================================================================
-- 7. CHECK FOR MISSING INDEXES
-- ============================================================================

-- List all indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Identify tables without primary indexes
SELECT 
  t.schemaname,
  t.tablename
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM pg_indexes i
    WHERE i.schemaname = t.schemaname
      AND i.tablename = t.tablename
  )
ORDER BY tablename;

-- ============================================================================
-- 8. AUDIT LOG ANALYSIS
-- ============================================================================

-- Check report_logs for orphaned entries
SELECT COUNT(*) as orphaned_logs
FROM public.report_logs rl
WHERE NOT EXISTS (
  SELECT 1 FROM public.reports r WHERE r.id = rl.report_id
);

-- Top changed reports
SELECT 
  report_id,
  COUNT(*) as change_count,
  MAX(created_at) as last_change
FROM public.report_logs
GROUP BY report_id
ORDER BY change_count DESC
LIMIT 20;

-- Most frequent actions
SELECT 
  action,
  COUNT(*) as count
FROM public.report_logs
GROUP BY action
ORDER BY count DESC;

-- ============================================================================
-- 9. NOTIFICATION SYSTEM HEALTH
-- ============================================================================

-- Unread notifications per user
SELECT 
  user_id,
  COUNT(*) as unread_count
FROM public.notifications
WHERE read_at IS NULL
GROUP BY user_id
ORDER BY unread_count DESC
LIMIT 50;

-- Notification delivery stats
SELECT 
  type,
  COUNT(*) as total,
  COUNT(CASE WHEN read_at IS NOT NULL THEN 1 END) as read_count,
  ROUND(100.0 * COUNT(CASE WHEN read_at IS NOT NULL THEN 1 END) / COUNT(*), 2) as read_percentage
FROM public.notifications
GROUP BY type;

-- ============================================================================
-- 10. DATABASE STATISTICS
-- ============================================================================

-- Table row counts
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- Storage usage per table
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- RESULTS INTERPRETATION
-- ============================================================================

/*
WHAT TO LOOK FOR:

1. ORPHANED RECORDS: If count > 0, investigate cascade delete issues or 
   manual deletes. These records should typically be cleaned up.

2. INVALID ENUMS: These indicate data corruption or frontend bugs. 
   Trace the source and fix all instances.

3. MISSING REQUIRED FIELDS: Reports without title/description should be 
   reviewed and either completed or archived.

4. COORDINATE VALIDATION: Invalid coordinates (out of range) should be 
   corrected or deleted.

5. PAST DUE WORK ORDERS: Ensure these are being tracked and completed.

6. DUPLICATE DATA: Potential merge/consolidation candidates.

7. RLS POLICIES: Tables should have RLS enabled and policies defined. 
   Any disabled RLS is a security risk.

8. MISSING INDEXES: Can impact query performance - see 20260211 migration.

9. NOTIFICATIONS: High unread counts might indicate users aren't engaging 
   with the notification system.

10. DATABASE SIZE: Growing unexpectedly? Check for orphaned data or 
    excessive logging.
*/
