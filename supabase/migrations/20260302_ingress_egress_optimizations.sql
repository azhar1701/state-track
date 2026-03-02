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

COMMIT;
