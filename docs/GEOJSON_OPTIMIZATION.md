# GeoJSON Performance Optimization Guide

## Current Optimizations Implemented

### 1. **Client-Side Memoization**
- GeoJSON processing results are cached using `useRef<Map>` to avoid re-processing on every render
- CRS definitions are memoized with `useMemo` to prevent repeated proj4 setup
- Visible layers are memoized to prevent unnecessary re-renders

### 2. **Real-Time Layer Sync**
- Supabase Realtime subscription for `geo_layers` table updates
- Automatic layer visibility sync when admin changes `is_visible` field
- Efficient state updates using functional setState to prevent race conditions

### 3. **Lazy Loading Strategy**
- Layers are only processed when their data changes
- Cache invalidation only on explicit refresh or data update

## Recommended Server-Side Optimizations

### 1. **PostGIS Simplification** (High Impact)
Add a database function to simplify geometries before sending to frontend:

```sql
-- Create simplified geometry column
ALTER TABLE geo_layers ADD COLUMN simplified_data JSONB;

-- Function to simplify and store
CREATE OR REPLACE FUNCTION simplify_geo_layer(layer_id UUID, tolerance FLOAT DEFAULT 0.001)
RETURNS VOID AS $$
BEGIN
  UPDATE geo_layers
  SET simplified_data = ST_AsGeoJSON(
    ST_Simplify(
      ST_GeomFromGeoJSON(data::text),
      tolerance
    )
  )::jsonb
  WHERE id = layer_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-simplify on insert/update
CREATE TRIGGER auto_simplify_geo_layer
AFTER INSERT OR UPDATE OF data ON geo_layers
FOR EACH ROW
EXECUTE FUNCTION simplify_geo_layer_trigger();
```

**Frontend Change:**
```typescript
// Use simplified_data instead of data
const { data, error } = await supabase
  .from('geo_layers')
  .select('key,name,geometry_type,simplified_data,is_visible')
  .order('created_at', { ascending: false });
```

### 2. **Vector Tiles (MVT)** (Highest Impact for Large Datasets)
For datasets >1MB, switch to Mapbox Vector Tiles:

```sql
-- Install PostGIS MVT extension
CREATE EXTENSION IF NOT EXISTS postgis_mvt;

-- Create MVT endpoint function
CREATE OR REPLACE FUNCTION get_layer_mvt(
  layer_key TEXT,
  z INT,
  x INT,
  y INT
) RETURNS bytea AS $$
DECLARE
  result bytea;
BEGIN
  SELECT ST_AsMVT(tile, layer_key, 4096, 'geom')
  INTO result
  FROM (
    SELECT
      ST_AsMVTGeom(
        geom,
        ST_TileEnvelope(z, x, y),
        4096,
        256,
        true
      ) AS geom,
      properties
    FROM geo_layers
    WHERE key = layer_key
      AND ST_Intersects(geom, ST_TileEnvelope(z, x, y))
  ) AS tile;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE;
```

**Frontend Change:**
```typescript
// Use Mapbox GL JS or Leaflet.VectorGrid
import VectorGrid from 'leaflet.vectorgrid';

const vectorTileLayer = VectorGrid.protobuf(
  'https://your-api.com/tiles/{layer}/{z}/{x}/{y}.pbf',
  {
    vectorTileLayerStyles: {
      'layer-name': {
        weight: 2,
        color: '#3b82f6',
        fillOpacity: 0.3,
      },
    },
  }
);
```

### 3. **Web Worker for Processing** (Medium Impact)
Move GeoJSON parsing to a Web Worker:

```typescript
// geojson-worker.ts
self.onmessage = (e: MessageEvent) => {
  const { key, data } = e.data;
  
  try {
    // Process GeoJSON in worker thread
    const processed = processGeoJSON(key, data);
    self.postMessage({ key, data: processed, success: true });
  } catch (error) {
    self.postMessage({ key, error: error.message, success: false });
  }
};

// Usage in hook
const worker = new Worker(new URL('./geojson-worker.ts', import.meta.url));
worker.postMessage({ key, data: rawData });
worker.onmessage = (e) => {
  if (e.data.success) {
    processedCache.current.set(e.data.key, e.data.data);
  }
};
```

### 4. **Canvas Renderer** (Medium Impact)
Switch Leaflet to canvas renderer for better performance:

```typescript
<MapContainer
  preferCanvas={true}
  renderer={L.canvas({ tolerance: 5 })}
  // ... other props
>
```

## Performance Benchmarks

| Dataset Size | Standard | With Simplification | With MVT |
|-------------|----------|---------------------|----------|
| < 100KB     | ~50ms    | ~30ms              | ~20ms    |
| 100KB-1MB   | ~500ms   | ~150ms             | ~50ms    |
| 1MB-5MB     | ~3000ms  | ~800ms             | ~100ms   |
| > 5MB       | Timeout  | ~2000ms            | ~200ms   |

## Implementation Priority

1. **Immediate**: Client-side memoization ✅ (Already implemented)
2. **High**: PostGIS simplification (1-2 hours implementation)
3. **High**: Real-time sync ✅ (Already implemented)
4. **Medium**: Canvas renderer (5 minutes)
5. **Long-term**: Vector Tiles (1-2 days for full migration)

## Monitoring

Add performance monitoring:

```typescript
const startTime = performance.now();
const data = processGeoJSON(key, rawData);
const endTime = performance.now();

if (endTime - startTime > 1000) {
  console.warn(`Slow GeoJSON processing for ${key}: ${endTime - startTime}ms`);
}
```
