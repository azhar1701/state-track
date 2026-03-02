-- Migration: Supabase Ingress/Egress Performance Boost
-- Date: 2026-03-02
-- Purpose: Optimize database lookups for administrative boundaries and geospatial reporting.

BEGIN;

-- 1. Index frequently filtered columns in 'reports' table
CREATE INDEX IF NOT EXISTS idx_reports_kecamatan ON public.reports(kecamatan);
CREATE INDEX IF NOT EXISTS idx_reports_desa ON public.reports(desa);

-- 2. Optimize join performance for kecamatan/desa references
CREATE INDEX IF NOT EXISTS idx_desa_kecamatan_id ON public.desa(kecamatan_id);

-- 3. Composite index for map loading (high density fetch)
-- Optimized for: .select('id, latitude, longitude, category, status')
CREATE INDEX IF NOT EXISTS idx_reports_map_loading 
  ON public.reports(status, category, created_at DESC) 
  INCLUDE (id, latitude, longitude);

-- 4. Ingress optimization: Fast insert path for report syncing
-- Using unlogged temporary table pattern for bulk offline syncs if needed
-- (Not creating table here, but documenting the pattern for the application tier)

-- 5. RPC for fast bulk fetching of map points (Egress optimization)
CREATE OR REPLACE FUNCTION get_map_markers(p_status text[] DEFAULT NULL, p_category text[] DEFAULT NULL)
RETURNS TABLE (id uuid, lat double precision, lng double precision, cat text, stat text)
LANGUAGE sql
STABLE
AS $$
  SELECT id, latitude, longitude, category::text, status::text 
  FROM public.reports 
  WHERE (p_status IS NULL OR status = ANY(p_status::public.report_status[]))
    AND (p_category IS NULL OR category = ANY(p_category::public.report_category[]));
$$;

COMMIT;
