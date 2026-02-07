# INTEGRASI LAYER DETAIL DRAWER KE MAPVIEW

## 1. Import Dependencies (Tambahkan di bagian atas MapView.tsx)

```tsx
import { LayerDetailDrawer } from '@/components/map/LayerDetailDrawer';
import { useLayerHighlight } from '@/hooks/useLayerHighlight';
import type { Feature } from 'geojson';
```

## 2. State Management (Tambahkan di dalam komponen MapView)

```tsx
// State untuk layer yang dipilih
const [selectedLayer, setSelectedLayer] = useState<{
  id: string;
  feature: Feature<Geometry>;
  layer: L.Layer;
} | null>(null);

// Hook untuk highlighting
const { registerLayer, unregisterLayer } = useLayerHighlight({
  selectedFeatureId: selectedLayer?.id || null,
  highlightStyle: {
    color: '#00ffff',
    weight: 4,
    opacity: 1,
    fillColor: '#00ffff',
    fillOpacity: 0.3,
  },
  originalStyle: {
    color: '#6b7280',
    weight: 1,
    opacity: 0.8,
    fillOpacity: 0,
  },
});
```

## 3. Handler untuk Zoom to Feature

```tsx
const handleZoomToLayer = useCallback(() => {
  if (!selectedLayer || !mapInstance) return;

  const layer = selectedLayer.layer;
  if ('getBounds' in layer && typeof layer.getBounds === 'function') {
    const bounds = (layer as L.Polyline | L.Polygon).getBounds();
    mapInstance.fitBounds(bounds.pad(0.1));
  }
}, [selectedLayer, mapInstance]);
```

## 4. Update onEachFeature untuk Admin Boundaries

Ganti bagian `onEachFeature` di admin boundaries dengan:

```tsx
onEachFeature={(feature, layer) => {
  const p = feature.properties as Record<string, unknown> | undefined;
  const featureId = 
    (p?.objectid as string) ||
    (p?.fid as string) ||
    `admin-${Math.random().toString(36).substr(2, 9)}`;

  // Register layer untuk highlighting
  const originalStyle = {
    color: '#6b7280',
    weight: 1,
    opacity: 0.8,
    fillOpacity: 0,
  };
  registerLayer(featureId, layer, originalStyle);

  // Tooltip
  const name =
    (p?.DESA_1 as string) ||
    (p?.DESA as string) ||
    (p?.KECAMATAN as string) ||
    (p?.Kecamatan as string) ||
    (p?.name as string) ||
    (p?.NAMOBJ as string) ||
    undefined;
  
  if (name) {
    layer.bindTooltip(String(name), { 
      sticky: true, 
      direction: 'center', 
      className: 'bg-black/60 text-white px-1 py-0.5 rounded border text-[11px]' 
    });
  }

  // Click handler - GANTI bindPopup dengan setSelectedLayer
  layer.on('click', () => {
    setSelectedLayer({ id: featureId, feature, layer });
  });

  // Hover effect
  layer.on('mouseover', () => {
    if ('setStyle' in layer && typeof layer.setStyle === 'function') {
      (layer as L.Path).setStyle({ weight: 2, color: '#111827' });
    }
  });

  layer.on('mouseout', () => {
    if (selectedLayer?.id !== featureId) {
      if ('setStyle' in layer && typeof layer.setStyle === 'function') {
        (layer as L.Path).setStyle(originalStyle);
      }
    }
  });

  // Cleanup
  layer.on('remove', () => {
    unregisterLayer(featureId);
  });
}}
```

## 5. Update onEachFeature untuk Dynamic Layers

Ganti bagian `onEachFeature` di dynamic layers dengan:

```tsx
onEachFeature={(feature, layer) => {
  const p = feature.properties as Record<string, unknown> | undefined;
  const featureId = 
    (p?.id as string) ||
    (p?.objectid as string) ||
    (p?.fid as string) ||
    `${key}-${Math.random().toString(36).substr(2, 9)}`;

  // Register layer
  const originalStyle = {
    color: '#6b7280',
    weight: 1,
    opacity: 0.8,
    fillOpacity: 0,
  };
  registerLayer(featureId, layer, originalStyle);

  const title = (p?.name as string) || (p?.title as string) || (p?.NAMOBJ as string) || key;
  
  if (title) {
    layer.bindTooltip(String(title), { sticky: true });
  }

  // Click handler - GANTI bindPopup dengan setSelectedLayer
  if (key !== 'assets') {
    layer.on('click', () => {
      setSelectedLayer({ id: featureId, feature, layer });
    });
  } else {
    // Untuk assets, tetap gunakan popup atau buat handler khusus
    const code = p?.code as string | undefined;
    const cat = p?.category as string | undefined;
    const status = p?.status as string | undefined;
    const ket = p?.keterangan as string | undefined;
    const safeTitle = sanitizeText(title);
    const safeCode = sanitizeText(code ?? '-');
    const safeCat = sanitizeText(cat ?? '-');
    const safeStatus = sanitizeText(status ?? '-');
    const safeKet = sanitizeText(ket ?? '-');
    
    layer.bindPopup(`
      <div style="min-width:200px">
        <div style="font-weight:600;margin-bottom:4px">${safeTitle}</div>
        <div><strong>Kode:</strong> ${safeCode}</div>
        <div><strong>Kategori:</strong> ${safeCat}</div>
        <div><strong>Status:</strong> ${safeStatus}</div>
        <div><strong>Keterangan:</strong> ${safeKet}</div>
      </div>
    `);
  }

  // Cleanup
  layer.on('remove', () => {
    unregisterLayer(featureId);
  });
}}
```

## 6. Render LayerDetailDrawer (Tambahkan sebelum closing tag MapContainer)

```tsx
{/* Layer Detail Drawer */}
<LayerDetailDrawer
  isOpen={!!selectedLayer}
  onClose={() => setSelectedLayer(null)}
  feature={selectedLayer?.feature || null}
  onZoomToFeature={handleZoomToLayer}
  blockList={['objectid', 'shape_length', 'shape_area', 'shape_leng', 'shape__area', 'shape__length', 'fid', 'gid']}
/>
```

## 7. Listen untuk zoom-to-bounds event (Tambahkan useEffect)

```tsx
useEffect(() => {
  const handleZoomToBounds = (e: CustomEvent) => {
    const { bounds } = e.detail;
    if (mapInstance && bounds) {
      mapInstance.fitBounds(bounds);
    }
  };

  window.addEventListener('zoom-to-bounds', handleZoomToBounds as EventListener);
  return () => window.removeEventListener('zoom-to-bounds', handleZoomToBounds as EventListener);
}, [mapInstance]);
```

## HASIL AKHIR:

✅ Klik layer GeoJSON → Drawer muncul di kanan (desktop) / bawah (mobile)
✅ Layer yang dipilih di-highlight dengan warna cyan
✅ Tombol "Zoom to Feature" untuk fokus ke layer
✅ Tabel key-value dinamis untuk semua properties
✅ Glassmorphism styling konsisten dengan tema
✅ Tidak ada backdrop gelap (non-blocking)
