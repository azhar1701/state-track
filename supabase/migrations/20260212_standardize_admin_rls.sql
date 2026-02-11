-- Migration: Standardize Admin RLS Policies
-- Date: 2026-02-11
-- Purpose: Consolidate admin access checks using is_admin() function
-- File: 20260212_standardize_admin_rls.sql
-- 
-- Note: This migration uses the existing is_admin() function created in 
-- 20251010_update_geo_layers_policies.sql and applies it consistently
-- across all admin-controlled tables.

BEGIN;

-- Ensure is_admin() function exists (defined in 20251010_update_geo_layers_policies.sql)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  );
$$;

-- ============================================================================
-- REPORTS TABLE - Standardize admin policies
-- ============================================================================

-- Drop old JWT-based policies (if they exist)
DROP POLICY IF EXISTS "Admins can update any report" ON public.reports;
DROP POLICY IF EXISTS "Admins can read any report for analysis" ON public.reports;

-- Create standardized admin policies for reports
CREATE POLICY "admin_read_all_reports" ON public.reports
  FOR SELECT
  USING (public.is_admin() OR auth.uid() = user_id);

CREATE POLICY "admin_update_any_report" ON public.reports
  FOR UPDATE
  USING (public.is_admin() OR auth.uid() = user_id)
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

CREATE POLICY "admin_insert_reports" ON public.reports
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- ASSETS TABLE - Add admin policies
-- ============================================================================

-- Drop old policies and recreate with admin override
DROP POLICY IF EXISTS "assets_read" ON public.assets;
DROP POLICY IF EXISTS "assets_write" ON public.assets;
DROP POLICY IF EXISTS "assets_update" ON public.assets;

CREATE POLICY "assets_read_all" ON public.assets
  FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "assets_write_authenticated" ON public.assets
  FOR INSERT
  WITH CHECK (public.is_admin() OR auth.role() = 'authenticated');

CREATE POLICY "assets_update_admin" ON public.assets
  FOR UPDATE
  USING (public.is_admin() OR auth.role() = 'authenticated')
  WITH CHECK (public.is_admin() OR auth.role() = 'authenticated');

-- ============================================================================
-- WORK ORDERS TABLE - Add admin override policies
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "wo_read" ON public.work_orders;
DROP POLICY IF EXISTS "wo_insert" ON public.work_orders;
DROP POLICY IF EXISTS "wo_update_self" ON public.work_orders;

-- Recreate with admin override
CREATE POLICY "wo_read_authenticated" ON public.work_orders
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "wo_insert_authenticated" ON public.work_orders
  FOR INSERT
  WITH CHECK (public.is_admin() OR auth.uid() = created_by);

CREATE POLICY "wo_update_admin_or_involved" ON public.work_orders
  FOR UPDATE
  USING (
    public.is_admin() 
    OR auth.uid() = created_by 
    OR auth.uid() = assigned_to
  )
  WITH CHECK (
    public.is_admin() 
    OR auth.uid() = created_by 
    OR auth.uid() = assigned_to
  );

-- ============================================================================
-- GEO_LAYERS TABLE - Ensure consistent admin policies
-- ============================================================================

-- These should already use is_admin() from 20251010 migration
-- Verify they exist and are correct
CREATE POLICY IF NOT EXISTS "geo_layers_read" ON public.geo_layers
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "geo_layers_insert" ON public.geo_layers
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY IF NOT EXISTS "geo_layers_update" ON public.geo_layers
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY IF NOT EXISTS "geo_layers_delete" ON public.geo_layers
  FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- SUPPORT TICKETS TABLE - Already has user_id based policies (good)
-- ============================================================================
-- No changes needed - support tickets should remain user-specific
-- Admins who need access can be implemented with a separate audit policy

-- ============================================================================
-- USER_ROLES TABLE - Service role management (sensitive)
-- ============================================================================

-- Show current state (do not DROP, analyze first)
-- This table should be managed exclusively by service role in backend
-- Frontend should not have direct access
-- Verify its current policies are restrictive

COMMENT ON FUNCTION public.is_admin() IS 
  'Check if current user is admin by querying user_roles table. '
  'Used for consistent RLS policy enforcement across all admin-controlled tables.';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration)
-- ============================================================================

/*
-- Verify is_admin() function
SELECT * FROM pg_proc WHERE proname = 'is_admin';

-- Check all RLS policies on reports table
SELECT schemaname, tablename, policyname, permissive, roles, qual 
FROM pg_policies 
WHERE tablename = 'reports' 
ORDER BY policyname;

-- Check if an admin user can access
-- (requires setting up test user with admin role)
SELECT id, title FROM reports LIMIT 1; -- As admin user
*/
