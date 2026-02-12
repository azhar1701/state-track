# Panduan Integrasi Fitur Geospasial ke MapView

Panduan step-by-step untuk mengintegrasikan semua fitur geospasial baru ke dalam `MapView.tsx`.

## 1. Import Dependencies

Tambahkan import berikut di bagian atas `MapView.tsx`:

```typescript
// Advanced Geospatial Components
import { AdvancedMapToolbar } from '@/components/map/AdvancedMapToolbar';
import { SpatialAnalysisPanel } from '@/components/map/SpatialAnalysisPanel';
import { RouteOptimizationPanel } from '@/components/map/RouteOptimizationPanel';
import { SpatialQueryBuilder, applySpatialQueries, type SpatialQuery } from '@/components/map/SpatialQueryBuilder';
import { DrawMeasureTools } from '@/components/map/DrawMeasureTools';
import { MultiLayerHeatmap } from '@/components/map/MultiLayerHeatmap';
import { ExportPanel } from '@/components/map/ExportPanel';
import { AdvancedClustering, type ClusterReport } from '@/components/map/AdvancedClustering';

// Geospatial Libraries
import { exportToGeoJSON, exportToKML, exportToCSV, type ExportReport } from '@/lib/geoExport';
import { type DensityCell } from '@/lib/spatialAnalysis';
import { type OptimizedRoute } from '@/lib/routeOptimization';
```

## 2. State Management

Tambahkan state baru di dalam komponen MapView:

```typescript
// Panel visibility states
const [showSpatialAnalysis, setShowSpatialAnalysis] = useState(false);
const [showRouteOptimization, setShowRouteOptimization] = useState(false);
const [showSpatialQuery, setShowSpatialQuery] = useState(false);
const [showDrawTools, setShowDrawTools] = useState(false);
const [showExportPanel, setShowExportPanel] = useState(false);

// Feature states
const [multiLayerHeatmap, setMultiLayerHeatmap] = useState(false);
const [densityView, setDensityView] = useState(false);
const [spatialQueries, setSpatialQueries] = useState<SpatialQuery[]>([]);
const [densityCells, setDensityCells] = useState<DensityCell[]>([]);
const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
const [bufferZones, setBufferZones] = useState<L.Layer[]>([]);
```

## 3. Render Advanced Toolbar

Ganti atau tambahkan toolbar di dalam return statement MapView:

```typescript
{/* Advanced Map Toolbar */}
<AdvancedMapToolbar
  onOpenSpatialAnalysis={() => {
    setShowSpatialAnalysis(true);
    setShowRouteOptimization(false);
    setShowSpatialQuery(false);
    setShowExportPanel(false);
  }}
  onOpenRouteOptimization={() => {
    setShowRouteOptimization(true);
    setShowSpatialAnalysis(false);
    setShowSpatialQuery(false);
    setShowExportPanel(false);
  }}
  onOpenExport={() => {
    setShowExportPanel(true);
    setShowSpatialAnalysis(false);
    setShowRouteOptimization(false);
    setShowSpatialQuery(false);
  }}
  onOpenSpatialQuery={() => {
    setShowSpatialQuery(true);
    setShowSpatialAnalysis(false);
    setShowRouteOptimization(false);
    setShowExportPanel(false);
  }}
  onOpenDrawTools={() => setShowDrawTools(!showDrawTools)}
  onToggleHeatmap={() => setMultiLayerHeatmap(!multiLayerHeatmap)}
  onToggleDensity={() => setDensityView(!densityView)}
  onToggleLayers={() => setShowOverlayPanel(!showOverlayPanel)}
  heatmapActive={multiLayerHeatmap}
  densityActive={densityView}
/>
```

## 4. Render Panels

Tambahkan panel-panel di dalam MapContainer atau sebagai sibling:

```typescript
{/* Spatial Analysis Panel */}
{showSpatialAnalysis && (
  <SpatialAnalysisPanel
    reports={filteredReports.map(r => ({
      id: r.id,
      coords: [r.latitude, r.longitude],
      category: r.category,
      status: r.status,
    }))}
    onBufferCreated={(buffer) => {
      // Add buffer to map
      const layer = L.geoJSON(buffer, {
        style: { color: '#3b82f6', weight: 2, fillOpacity: 0.1 }
      }).addTo(mapInstance!);
      setBufferZones(prev => [...prev, layer]);
      toast.success('Buffer zone berhasil dibuat');
    }}
    onDensityCalculated={(cells) => {
      setDensityCells(cells);
      setDensityView(true);
      toast.success(`${cells.length} density cells dihitung`);
    }}
    onStatsCalculated={(stats) => {
      toast.success('Analisis statistik selesai', {
        description: `NNI: ${stats.nni.toFixed(3)} - ${stats.clustered ? 'Clustered' : 'Dispersed'}`
      });
    }}
    onClose={() => setShowSpatialAnalysis(false)}
  />
)}

{/* Route Optimization Panel */}
{showRouteOptimization && (
  <RouteOptimizationPanel
    reports={filteredReports.map(r => ({
      id: r.id,
      title: r.title,
      coords: [r.latitude, r.longitude],
      category: r.category,
      status: r.status,
      severity: r.severity,
    }))}
    onRouteGenerated={(route) => {
      setOptimizedRoute(route);
      // Draw route on map
      if (mapInstance) {
        const coords = route.points.map(p => [p.coords[0], p.coords[1]] as [number, number]);
        const routeLine = L.polyline(coords, {
          color: '#10b981',
          weight: 4,
          opacity: 0.8,
        }).addTo(mapInstance);
        
        // Add markers with numbers
        route.points.forEach((point, idx) => {
          const marker = L.marker([point.coords[0], point.coords[1]], {
            icon: L.divIcon({
              html: `<div style="background: #10b981; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">${idx + 1}</div>`,
              className: 'route-marker',
              iconSize: [24, 24],
            })
          }).addTo(mapInstance);
        });
      }
    }}
    onClose={() => setShowRouteOptimization(false)}
  />
)}

{/* Spatial Query Builder */}
{showSpatialQuery && (
  <SpatialQueryBuilder
    onQueryChange={(queries) => {
      setSpatialQueries(queries);
      // Apply queries to filter reports
      const matchingIds = applySpatialQueries(
        filteredReports.map(r => ({
          id: r.id,
          coords: [r.latitude, r.longitude],
          category: r.category,
          status: r.status,
          severity: r.severity,
        })),
        queries
      );
      // Highlight matching reports
      toast.success(`${matchingIds.length} laporan cocok dengan query`);
    }}
    onClose={() => setShowSpatialQuery(false)}
  />
)}

{/* Export Panel */}
{showExportPanel && (
  <ExportPanel
    reports={filteredReports as ExportReport[]}
    mapInstance={mapInstance}
    onClose={() => setShowExportPanel(false)}
  />
)}

{/* Draw & Measure Tools */}
{showDrawTools && (
  <DrawMeasureTools
    onPolygonDrawn={(polygon) => {
      setDrawnPolygon(polygon);
      toast.success('Polygon berhasil digambar');
    }}
    onMeasurement={(measurement) => {
      if (measurement.distance) {
        toast.success(`Jarak: ${measurement.distance.toFixed(2)} km`);
      }
      if (measurement.area) {
        toast.success(`Luas: ${measurement.area.toFixed(3)} km²`);
      }
    }}
  />
)}

{/* Multi-Layer Heatmap */}
{multiLayerHeatmap && (
  <MultiLayerHeatmap
    points={filteredReports.map(r => ({
      coords: [r.latitude, r.longitude],
      category: r.category,
      severity: r.severity,
    }))}
    enabled={multiLayerHeatmap}
    categories={Array.from(new Set(reports.map(r => r.category)))}
  />
)}

{/* Density Visualization */}
{densityView && densityCells.length > 0 && (
  <Pane name="density-cells" style={{ zIndex: 370 }}>
    {densityCells.map(cell => (
      <RLGeoJSON
        key={cell.id}
        data={{
          type: 'Feature',
          geometry: cell.geometry,
          properties: { count: cell.count }
        }}
        style={() => {
          const opacity = Math.min(cell.count / 10, 1);
          return {
            fillColor: '#ef4444',
            fillOpacity: opacity * 0.6,
            color: '#dc2626',
            weight: 1,
          };
        }}
        onEachFeature={(feature, layer) => {
          layer.bindTooltip(`${cell.count} laporan`, { sticky: true });
        }}
      />
    ))}
  </Pane>
)}
```

## 5. Replace Standard Clustering

Ganti clustering standar dengan AdvancedClustering:

```typescript
{/* Replace existing clustering code with: */}
{overlays.clustering && (
  <AdvancedClustering
    reports={filteredReports.map(r => ({
      id: r.id,
      coords: [r.latitude, r.longitude],
      severity: r.severity || 'ringan',
      category: r.category,
      status: r.status,
    }))}
    enabled={overlays.clustering}
    radius={80} // or from settings
    onClusterClick={(reports) => {
      if (reports.length === 1) {
        const report = filteredReports.find(r => r.id === reports[0].id);
        if (report) setSelectedReport(report);
      } else {
        toast.info(`Cluster berisi ${reports.length} laporan`);
      }
    }}
    createMarkerIcon={createCustomIcon}
  />
)}
```

## 6. Keyboard Shortcuts

Tambahkan keyboard shortcuts untuk akses cepat:

```typescript
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    // Ctrl/Cmd + Shift + A: Spatial Analysis
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      setShowSpatialAnalysis(true);
    }
    
    // Ctrl/Cmd + Shift + R: Route Optimization
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
      e.preventDefault();
      setShowRouteOptimization(true);
    }
    
    // Ctrl/Cmd + Shift + E: Export
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      setShowExportPanel(true);
    }
    
    // Ctrl/Cmd + Shift + D: Draw Tools
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      setShowDrawTools(!showDrawTools);
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [showDrawTools]);
```

## 7. Cleanup on Unmount

Tambahkan cleanup untuk layer-layer baru:

```typescript
useEffect(() => {
  return () => {
    // Cleanup buffer zones
    bufferZones.forEach(layer => {
      if (mapInstance) mapInstance.removeLayer(layer);
    });
    
    // Cleanup route
    if (optimizedRoute && mapInstance) {
      mapInstance.eachLayer((layer) => {
        if (layer instanceof L.Polyline && (layer as any)._isRoute) {
          mapInstance.removeLayer(layer);
        }
      });
    }
  };
}, [mapInstance, bufferZones, optimizedRoute]);
```

## 8. Update filteredReports

Modifikasi filteredReports untuk mendukung spatial queries:

```typescript
const filteredReports = useMemo(() => {
  let filtered = reports.filter((report) => {
    // Existing filters...
    if (filters.category && report.category !== filters.category) return false;
    if (filters.status && report.status !== filters.status) return false;
    // ... date filters, etc.
    
    return true;
  });
  
  // Apply spatial queries
  if (spatialQueries.length > 0) {
    const matchingIds = applySpatialQueries(
      filtered.map(r => ({
        id: r.id,
        coords: [r.latitude, r.longitude],
        category: r.category,
        status: r.status,
        severity: r.severity,
      })),
      spatialQueries
    );
    filtered = filtered.filter(r => matchingIds.includes(r.id));
  }
  
  return filtered;
}, [reports, filters, drawnPolygon, spatialQueries]);
```

## 9. Mobile Optimization

Tambahkan kondisi untuk mobile:

```typescript
{!isMobile && (
  <AdvancedMapToolbar
    // ... props
  />
)}

{isMobile && (
  <div className="absolute bottom-20 right-4 z-[1000]">
    <Button
      size="sm"
      className="rounded-full w-12 h-12 p-0"
      onClick={() => setShowMobileMenu(true)}
    >
      <Activity className="w-5 h-5" />
    </Button>
  </div>
)}
```

## 10. Testing

Setelah integrasi, test fitur-fitur berikut:

- [ ] Spatial Analysis Panel terbuka dan berfungsi
- [ ] Route Optimization menghasilkan rute valid
- [ ] Draw Tools dapat menggambar dan mengukur
- [ ] Multi-Layer Heatmap menampilkan per kategori
- [ ] Export berhasil untuk semua format
- [ ] Spatial Query memfilter dengan benar
- [ ] Advanced Clustering menampilkan breakdown severity
- [ ] Keyboard shortcuts berfungsi
- [ ] Mobile responsive
- [ ] Tidak ada memory leak

## 11. Performance Tips

```typescript
// Debounce expensive operations
const debouncedDensityCalc = useMemo(
  () => debounce((reports) => {
    // Calculate density
  }, 500),
  []
);

// Limit data for heavy operations
const limitedReports = useMemo(() => {
  return reports.slice(0, 1000); // Max 1000 for analysis
}, [reports]);

// Use Web Workers for heavy calculations (future)
// const worker = new Worker(new URL('./spatial.worker.ts', import.meta.url));
```

## 12. Error Handling

```typescript
try {
  // Spatial operation
} catch (error) {
  console.error('Spatial analysis error:', error);
  toast.error('Gagal melakukan analisis spasial', {
    description: 'Coba kurangi jumlah data atau ukuran grid'
  });
}
```

## Selesai! 🎉

Setelah mengikuti panduan ini, MapView akan memiliki semua fitur geospasial lanjutan yang terintegrasi dengan baik.

Untuk dokumentasi lengkap, lihat `docs/GEOSPATIAL_FEATURES.md`.
