-- Migration: Admin Boundary Optimization (RPC)
-- Date: 2026-03-12
-- Purpose: Add RPC for simplified administrative boundaries using PostGIS ST_Simplify

BEGIN;

CREATE OR REPLACE FUNCTION public.get_simplified_admin_boundaries(simplify_factor float DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    result jsonb;
BEGIN
    -- Note: Ensure you have a 'geo_layers' entry with key 'admin_boundaries' 
    -- OR a dedicated 'boundaries' table.
    -- This implementation assumes geo_layers schema.
    
    WITH raw_data AS (
        SELECT data->'featureCollection'->'features' as feats
        FROM public.geo_layers
        WHERE key = 'admin_boundaries'
        LIMIT 1
    ),
    flattened AS (
        SELECT jsonb_array_elements(feats) as feat
        FROM raw_data
    )
    SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', jsonb_agg(
            jsonb_build_object(
                'type', 'Feature',
                'properties', feat->'properties',
                'geometry', ST_AsGeoJSON(ST_Simplify(ST_GeomFromGeoJSON(feat->'geometry'), simplify_factor))::jsonb
            )
        )
    ) INTO result
    FROM flattened;

    RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_simplified_admin_boundaries(float) IS 
  'Returns administrative boundaries as GeoJSON, simplified by the given factor using PostGIS ST_Simplify.';

COMMIT;
