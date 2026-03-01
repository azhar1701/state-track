# 🗺️ Fitur Geospasial Lanjutan - Quick Start

Panduan cepat untuk menggunakan fitur-fitur geospasial baru di SIPASDA.

## 📦 Apa yang Baru?

### 1. **Analisis Spasial** 🎯
- Buffer zone analysis
- Density mapping (Hexbin & KDE)
- Proximity search
- Spatial statistics (NNI)

### 2. **Route Optimization** 🚗
- TSP solver untuk rute inspeksi optimal
- Prioritas berdasarkan severity
- Turn-by-turn directions
- Estimasi waktu tempuh

### 3. **Draw & Measure** ✏️
- Gambar polygon
- Ukur jarak
- Ukur luas area

### 4. **Multi-Layer Heatmap** 🔥
- Heatmap per kategori
- Kontrol individual per layer
- Intensity berdasarkan severity

### 5. **Advanced Clustering** 🔵
- Breakdown severity dalam cluster
- Visual pie chart untuk mixed severity
- Custom cluster radius

### 6. **Spatial Query** 🔍
- Buffer queries
- Within polygon
- Proximity search
- Kombinasi filter

### 7. **Export Geospatial** 📥
- GeoJSON, KML, CSV
- PNG map export
- Filter sebelum export

## 🚀 Quick Start

### Instalasi

Semua dependencies sudah ada di `package.json`. Jalankan:

```bash
npm install
```

### Database Migration

Jalankan migrasi untuk tabel analisis spasial:

```bash
# Via Supabase Dashboard
# Upload file: supabase/migrations/20250220_spatial_analysis_tables.sql
```

### Integrasi ke MapView

Ikuti panduan lengkap di `docs/MAPVIEW_INTEGRATION_GUIDE.md`

Atau copy-paste snippet berikut ke `MapView.tsx`:

```typescript
// 1. Import
import { AdvancedMapToolbar } from '@/components/map/AdvancedMapToolbar';
import { SpatialAnalysisPanel } from '@/components/map/SpatialAnalysisPanel';
// ... imports lainnya

// 2. State
const [showSpatialAnalysis, setShowSpatialAnalysis] = useState(false);
// ... state lainnya

// 3. Render
<AdvancedMapToolbar
  onOpenSpatialAnalysis={() => setShowSpatialAnalysis(true)}
  // ... props lainnya
/>

{showSpatialAnalysis && (
  <SpatialAnalysisPanel
    reports={filteredReports}
    onClose={() => setShowSpatialAnalysis(false)}
  />
)}
```

## 🎮 Cara Menggunakan

### Spatial Analysis

1. Klik icon **Activity** di toolbar
2. Pilih tab (Buffer/Density/Stats/Proximity)
3. Atur parameter
4. Klik tombol analisis
5. Hasil ditampilkan di peta

### Route Optimization

1. Klik icon **Route** di toolbar
2. Pilih laporan untuk inspeksi
3. Aktifkan opsi (prioritas severity, 2-opt)
4. Klik "Optimasi Rute"
5. Lihat rute dan directions

### Draw & Measure

1. Klik icon **Pencil** di toolbar
2. Pilih mode (Polygon/Jarak/Luas)
3. Klik pada peta untuk menambah titik
4. Klik ganda untuk selesai
5. Hasil ditampilkan sebagai label

### Multi-Layer Heatmap

1. Klik icon **Flame** di toolbar
2. Klik "Heatmap Controls"
3. Toggle kategori yang diinginkan
4. Atur radius, blur, intensitas
5. Heatmap ditampilkan per kategori

### Export Data

1. Klik icon **Download** di toolbar
2. Pilih tab Vector/Raster
3. Atur filter dan nama file
4. Pilih format (GeoJSON/KML/CSV/PNG)
5. Klik tombol export

## ⌨️ Keyboard Shortcuts

- `Ctrl/Cmd + Shift + A`: Spatial Analysis
- `Ctrl/Cmd + Shift + R`: Route Optimization
- `Ctrl/Cmd + Shift + E`: Export Panel
- `Ctrl/Cmd + Shift + D`: Draw Tools

## 📁 Struktur File

```
src/
├── lib/
│   ├── spatialAnalysis.ts      # Core spatial functions
│   ├── routeOptimization.ts    # TSP solver
│   └── geoExport.ts            # Export utilities
├── components/map/
│   ├── AdvancedMapToolbar.tsx
│   ├── SpatialAnalysisPanel.tsx
│   ├── RouteOptimizationPanel.tsx
│   ├── SpatialQueryBuilder.tsx
│   ├── DrawMeasureTools.tsx
│   ├── MultiLayerHeatmap.tsx
│   ├── AdvancedClustering.tsx
│   └── ExportPanel.tsx
└── pages/
    └── MapView.tsx              # Main map component

supabase/migrations/
└── 20250220_spatial_analysis_tables.sql

docs/
├── GEOSPATIAL_FEATURES.md      # Full documentation
├── MAPVIEW_INTEGRATION_GUIDE.md # Integration guide
└── GEOSPATIAL_QUICKSTART.md    # This file
```

## 🔧 Konfigurasi

### Map Settings (Admin Dashboard)

Atur di Admin Dashboard > Map Settings:
- Cluster radius
- Heatmap radius
- Default overlays
- Geolocation

### Layer Styles

Styles disimpan di `sessionStorage` dan dapat diatur via GeoData Manager.

## 📊 Use Cases

### 1. Identifikasi Hotspot
```
Spatial Analysis > Density > Hexagonal Grid > Hitung
```

### 2. Rute Inspeksi
```
Route Optimization > Pilih Laporan > Optimasi Rute
```

### 3. Analisis Buffer
```
Spatial Analysis > Buffer > Atur Radius > Buat Buffer
```

### 4. Export untuk GIS
```
Export > Vector > GeoJSON > Download
```

## 🐛 Troubleshooting

**Q: Analisis lambat?**  
A: Kurangi jumlah data atau ukuran grid

**Q: Route tidak optimal?**  
A: Aktifkan "2-Opt Improvement"

**Q: Heatmap tidak muncul?**  
A: Pastikan ada data dengan kategori yang dipilih

**Q: Export gagal?**  
A: Cek filter, pastikan ada data

## 📚 Dokumentasi Lengkap

- [Full Features Documentation](./GEOSPATIAL_FEATURES.md)
- [Integration Guide](./MAPVIEW_INTEGRATION_GUIDE.md)
- [API Reference](./API_REFERENCE.md) *(coming soon)*

## 🎯 Next Steps

1. ✅ Baca dokumentasi lengkap
2. ✅ Jalankan migrasi database
3. ✅ Integrasikan ke MapView
4. ✅ Test semua fitur
5. ✅ Deploy ke production

## 💡 Tips

- Gunakan keyboard shortcuts untuk akses cepat
- Save hasil analisis ke database untuk referensi
- Export data sebelum analisis kompleks
- Gunakan filter untuk performa lebih baik
- Test di mobile untuk memastikan responsive

## 🤝 Contributing

Untuk menambah fitur atau fix bugs:

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📞 Support

- GitHub Issues: [state-track/issues](https://github.com/azhar1701/state-track/issues)
- Documentation: `docs/`
- Email: support@sipasda.id *(example)*

---

**Happy Mapping! 🗺️✨**
