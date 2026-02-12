# Fitur Geospasial Lanjutan - SIPASDA

Dokumentasi lengkap untuk fitur-fitur geospasial yang telah diimplementasikan pada aplikasi SIPASDA.

## 📋 Daftar Fitur

### 1. **Analisis Spasial** 🎯
Modul analisis spasial komprehensif dengan berbagai metode:

#### Buffer Zone Analysis
- Membuat zona buffer di sekitar titik dengan radius yang dapat disesuaikan
- Mendukung satuan kilometer dan meter
- Identifikasi laporan dalam zona buffer
- **Lokasi**: `src/lib/spatialAnalysis.ts`
- **Komponen UI**: `src/components/map/SpatialAnalysisPanel.tsx`

#### Density Analysis
- **Hexagonal Binning**: Grid heksagonal untuk visualisasi densitas
- **Kernel Density Estimation (KDE)**: Estimasi densitas menggunakan kernel Gaussian
- Ukuran grid dan bandwidth dapat disesuaikan
- **Implementasi**: `calculateDensity()`, `kernelDensity()`

#### Proximity Analysis
- Cari laporan dalam radius tertentu dari titik referensi
- Urutkan berdasarkan jarak
- Hitung bearing (arah) ke setiap titik
- **Implementasi**: `findWithinRadius()`, `calculateNearestNeighbors()`

#### Spatial Statistics
- **Nearest Neighbor Index (NNI)**: Mengukur pola distribusi spasial
  - NNI < 1: Pola mengelompok (clustered)
  - NNI = 1: Pola acak (random)
  - NNI > 1: Pola tersebar (dispersed)
- Mean distance dan standard deviation
- **Implementasi**: `calculateNearestNeighborIndex()`

### 2. **Clustering Lanjutan** 🔵
Clustering berbasis severity dengan breakdown statistik:

- Cluster icon menampilkan breakdown severity (Ringan/Sedang/Berat)
- Pie chart visual untuk cluster dengan severity campuran
- Warna dinamis berdasarkan severity dominan
- Custom cluster radius dari settings
- **Lokasi**: `src/components/map/AdvancedClustering.tsx`

### 3. **Multi-Layer Heatmap** 🔥
Heatmap per kategori dengan kontrol individual:

- Toggle per kategori (jalan, jembatan, irigasi, dll)
- Gradient warna unik per kategori
- Kontrol radius, blur, dan intensitas
- Weight berdasarkan severity
- **Lokasi**: `src/components/map/MultiLayerHeatmap.tsx`

### 4. **Draw & Measure Tools** ✏️
Alat gambar dan pengukuran interaktif:

#### Fitur:
- **Gambar Polygon**: Untuk area query atau analisis
- **Ukur Jarak**: Pengukuran jarak multi-point
- **Ukur Luas**: Kalkulasi luas area dalam km²
- Label otomatis dengan hasil pengukuran
- **Lokasi**: `src/components/map/DrawMeasureTools.tsx`

#### Cara Penggunaan:
1. Pilih mode (Polygon/Jarak/Luas)
2. Klik pada peta untuk menambah titik
3. Klik ganda untuk menyelesaikan (polygon/luas)
4. Hasil ditampilkan sebagai label permanen

### 5. **Route Optimization** 🚗
Optimasi rute inspeksi menggunakan algoritma TSP:

#### Algoritma:
- **Greedy Nearest Neighbor**: Solusi cepat untuk TSP
- **2-Opt Improvement**: Optimasi lokal untuk memperbaiki rute
- Prioritas berdasarkan severity (opsional)

#### Fitur:
- Pilih laporan untuk inspeksi
- Hitung rute optimal otomatis
- Turn-by-turn directions dalam Bahasa Indonesia
- Estimasi waktu tempuh (default 40 km/jam)
- Total jarak dan jumlah titik
- **Lokasi**: `src/lib/routeOptimization.ts`, `src/components/map/RouteOptimizationPanel.tsx`

#### Output:
```typescript
{
  points: RoutePoint[],
  totalDistance: number, // km
  segments: [{
    from: string,
    to: string,
    distance: number,
    bearing: number
  }]
}
```

### 6. **Spatial Query Builder** 🔍
Query geometrik lanjutan dengan kombinasi filter:

#### Tipe Query:
- **Buffer**: Laporan dalam radius dari titik
- **Within**: Laporan dalam polygon
- **Intersects**: Laporan yang berpotongan dengan geometri
- **Near**: Laporan dekat dengan titik (dengan radius)

#### Filter Atribut:
- Kategori
- Status
- Severity

#### Logika:
- Multiple queries dengan AND logic
- Kombinasi filter spasial dan atribut
- **Lokasi**: `src/components/map/SpatialQueryBuilder.tsx`

### 7. **Export Geospatial** 📥
Ekspor data dalam berbagai format:

#### Format Vector:
- **GeoJSON**: Format standar untuk web GIS
- **KML**: Untuk Google Earth/Maps
- **CSV**: Untuk konversi ke Shapefile via QGIS

#### Format Raster:
- **PNG**: Ekspor peta sebagai gambar
- Kualitas 1x, 2x, 3x
- Opsi sertakan/hilangkan kontrol

#### Fitur:
- Filter data sebelum ekspor (kategori, status)
- Custom filename
- Metadata lengkap dalam export
- **Lokasi**: `src/lib/geoExport.ts`, `src/components/map/ExportPanel.tsx`

### 8. **Advanced Map Toolbar** 🛠️
Toolbar terpusat untuk akses cepat semua fitur:

- Icon-based dengan tooltip
- Grouping logis (Analysis, Draw, Visualization, Export)
- Visual feedback untuk fitur aktif
- Responsive design
- **Lokasi**: `src/components/map/AdvancedMapToolbar.tsx`

## 🗄️ Database Schema

### Tabel: `spatial_analysis_results`
Menyimpan hasil analisis spasial:

```sql
- id: UUID (PK)
- user_id: UUID (FK)
- analysis_type: TEXT (buffer|density|proximity|statistics|route)
- name: TEXT
- description: TEXT
- parameters: JSONB
- results: JSONB
- geometry: GEOMETRY
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### Tabel: `optimized_routes`
Menyimpan rute optimal:

```sql
- id: UUID (PK)
- user_id: UUID (FK)
- name: TEXT
- description: TEXT
- report_ids: TEXT[]
- route_points: JSONB
- total_distance: NUMERIC
- estimated_time_minutes: INTEGER
- geometry: GEOMETRY(LineString)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

**Migrasi**: `supabase/migrations/20250220_spatial_analysis_tables.sql`

## 🚀 Cara Penggunaan

### 1. Mengaktifkan Fitur di MapView

Fitur-fitur baru terintegrasi melalui Advanced Map Toolbar:

```typescript
import { AdvancedMapToolbar } from '@/components/map/AdvancedMapToolbar';

// Di dalam MapView component
<AdvancedMapToolbar
  onOpenSpatialAnalysis={() => setShowSpatialAnalysis(true)}
  onOpenRouteOptimization={() => setShowRouteOptimization(true)}
  onOpenExport={() => setShowExport(true)}
  // ... props lainnya
/>
```

### 2. Spatial Analysis

```typescript
import { SpatialAnalysisPanel } from '@/components/map/SpatialAnalysisPanel';

<SpatialAnalysisPanel
  reports={reports}
  onBufferCreated={(buffer) => {
    // Tampilkan buffer di peta
  }}
  onDensityCalculated={(cells) => {
    // Visualisasi density cells
  }}
  onStatsCalculated={(stats) => {
    // Tampilkan statistik
  }}
  onClose={() => setShowSpatialAnalysis(false)}
/>
```

### 3. Route Optimization

```typescript
import { RouteOptimizationPanel } from '@/components/map/RouteOptimizationPanel';

<RouteOptimizationPanel
  reports={reports}
  onRouteGenerated={(route) => {
    // Gambar rute di peta
    const lineCoords = route.points.map(p => p.coords);
    const routeLine = L.polyline(lineCoords, { color: 'blue' });
    routeLine.addTo(map);
  }}
  onClose={() => setShowRouteOptimization(false)}
/>
```

### 4. Multi-Layer Heatmap

```typescript
import { MultiLayerHeatmap } from '@/components/map/MultiLayerHeatmap';

<MultiLayerHeatmap
  points={reports.map(r => ({
    coords: [r.latitude, r.longitude],
    category: r.category,
    severity: r.severity
  }))}
  enabled={heatmapEnabled}
  categories={['jalan', 'jembatan', 'irigasi', 'drainase', 'sungai']}
/>
```

### 5. Draw & Measure Tools

```typescript
import { DrawMeasureTools } from '@/components/map/DrawMeasureTools';

<DrawMeasureTools
  onPolygonDrawn={(polygon) => {
    // Gunakan polygon untuk spatial query
    setDrawnPolygon(polygon);
  }}
  onMeasurement={(measurement) => {
    // Tampilkan hasil pengukuran
    if (measurement.distance) {
      toast.success(`Jarak: ${measurement.distance.toFixed(2)} km`);
    }
    if (measurement.area) {
      toast.success(`Luas: ${measurement.area.toFixed(3)} km²`);
    }
  }}
/>
```

## 📊 Contoh Use Cases

### Use Case 1: Analisis Hotspot
1. Buka Spatial Analysis Panel
2. Pilih tab "Density"
3. Pilih metode "Hexagonal Grid"
4. Atur ukuran grid (misal 1 km)
5. Klik "Hitung Densitas"
6. Hasil: Grid heksagonal dengan warna berdasarkan jumlah laporan

### Use Case 2: Rute Inspeksi Optimal
1. Buka Route Optimization Panel
2. Pilih laporan yang akan diinspeksi
3. Aktifkan "Prioritaskan Keparahan"
4. Klik "Optimasi Rute"
5. Hasil: Rute optimal dengan turn-by-turn directions

### Use Case 3: Buffer Zone Analysis
1. Klik pada peta untuk pilih titik pusat
2. Buka Spatial Analysis Panel
3. Pilih tab "Buffer"
4. Atur radius (misal 5 km)
5. Klik "Buat Buffer Zone"
6. Hasil: Zona buffer ditampilkan, laporan dalam zona ter-highlight

### Use Case 4: Export untuk GIS Desktop
1. Buka Export Panel
2. Pilih tab "Vector"
3. Filter data (kategori/status)
4. Pilih format "GeoJSON"
5. Klik "GeoJSON"
6. File diunduh, bisa dibuka di QGIS/ArcGIS

## 🔧 Konfigurasi

### Map Preferences (localStorage)
```typescript
{
  centerLat: string,
  centerLng: string,
  zoom: string,
  basemap: BasemapType,
  showAdminBoundaries: boolean,
  enableClustering: boolean,
  clusterRadius: number,
  enableHeatmap: boolean,
  heatmapRadius: number,
  // ... dll
}
```

### Layer Styles (sessionStorage)
```typescript
{
  [layerKey: string]: {
    color?: string,
    weight?: number,
    opacity?: number,
    fillColor?: string,
    fillOpacity?: number,
    dashArray?: string,
    radius?: number
  }
}
```

## 🎨 Styling & Theming

Semua komponen menggunakan:
- Tailwind CSS untuk styling
- shadcn/ui components
- Dark mode support
- Glassmorphism effects
- Responsive design

## 📱 Mobile Support

Fitur-fitur dioptimalkan untuk mobile:
- Touch-friendly controls
- Responsive panels
- Simplified UI pada layar kecil
- Gesture support untuk draw tools

## ⚡ Performance

### Optimasi:
- Lazy loading untuk layer data
- Memoization untuk perhitungan berat
- Web Workers untuk processing (future)
- Spatial indexing di database
- Caching hasil analisis

### Batasan:
- Max 10,000 points untuk density analysis
- Max 100 points untuk route optimization
- Timeout 30 detik untuk analisis kompleks

## 🐛 Troubleshooting

### Issue: Analisis lambat
**Solusi**: Kurangi jumlah data atau ukuran grid

### Issue: Route tidak optimal
**Solusi**: Aktifkan "2-Opt Improvement"

### Issue: Heatmap tidak muncul
**Solusi**: Pastikan ada data dengan kategori yang dipilih

### Issue: Export gagal
**Solusi**: Cek filter, pastikan ada data yang akan diekspor

## 📚 Dependencies

```json
{
  "@turf/turf": "^7.2.0",
  "leaflet": "^1.9.4",
  "leaflet.heat": "^0.2.0",
  "leaflet.markercluster": "^1.5.3",
  "proj4": "^2.19.10"
}
```

## 🔮 Future Enhancements

- [ ] WebGL rendering dengan Deck.gl
- [ ] Offline vector tiles (PMTiles)
- [ ] 3D terrain visualization
- [ ] AR mode untuk mobile
- [ ] Real-time collaboration
- [ ] Machine learning untuk prediksi hotspot
- [ ] Integration dengan OSRM untuk routing
- [ ] Shapefile export langsung
- [ ] Isochrone analysis
- [ ] Network analysis

## 📞 Support

Untuk pertanyaan atau issue, silakan buka issue di GitHub repository atau hubungi tim development.

---

**Version**: 1.0.0  
**Last Updated**: 2025-02-20  
**Author**: SIPASDA Development Team
