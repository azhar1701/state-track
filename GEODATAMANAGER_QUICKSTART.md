# GeoDataManager v2.0 - Quick Start Guide

## 🚀 Fitur Baru

### 1. Filter & Sorting
- **Filter by Geometry Type**: Pilih Point, Polygon, LineString, dll
- **Filter by Status**: Valid atau Error
- **Sort by**: Nama, Tanggal, Jumlah Fitur

### 2. Quick Actions
- **🗺️ View on Map**: Klik untuk lihat layer di peta
- **👁️ Toggle Visibility**: Show/hide layer di peta
- **🔄 Refresh**: Reload data dari Supabase
- **💾 Export All**: Download semua layer

### 3. Real-time Stats
- Jumlah fitur per layer
- Status validasi (Valid/Error)
- Bounding box calculation

## 📋 Cara Menggunakan

### Import Layer
1. Pilih file (GeoJSON, Shapefile, KML)
2. Isi Key dan Nama layer
3. Klik "Simpan Layer"

### Filter Layer
1. Gunakan search box untuk cari nama/key
2. Pilih tipe geometri dari dropdown
3. Filter by status (Valid/Error)
4. Pilih sorting (Nama/Tanggal/Fitur)

### Lihat di Peta
1. Klik icon 🗺️ pada baris layer
2. Aplikasi akan navigate ke /peta
3. Layer akan di-zoom dan di-highlight

### Toggle Visibilitas
1. Klik icon 👁️ untuk show/hide
2. Perubahan langsung terlihat di peta
3. Status tersimpan di metadata

## 🔧 Integrasi dengan Peta

### Step 1: Import Hook
```typescript
import { useLayerEvents } from '@/hooks/useLayerEvents';
```

### Step 2: Setup Listeners
```typescript
useLayerEvents({
  onLayerVisibilityChanged: async (detail) => {
    if (detail.visible) {
      // Show layer
    } else {
      // Hide layer
    }
  },
  onLayerUpdated: async (detail) => {
    // Reload layer
  },
  onLayerDeleted: (detail) => {
    // Remove layer
  },
});
```

### Step 3: Handle Focus Layer
```typescript
useEffect(() => {
  const focusLayer = localStorage.getItem('focusLayer');
  if (focusLayer) {
    // Load and zoom to layer
    localStorage.removeItem('focusLayer');
  }
}, []);
```

## 🐛 Troubleshooting

### Layer tidak muncul di peta
- Pastikan komponen peta menggunakan `useLayerEvents`
- Check console untuk error
- Verify layer visibility di metadata

### Validasi terlalu lambat
- Hanya 10 layer pertama yang divalidasi
- Gunakan filter untuk kurangi jumlah layer

### Export gagal
- Check ukuran data (max 50MB per layer)
- Gunakan export individual untuk layer besar

## 📚 Dokumentasi Lengkap

Lihat `GEODATAMANAGER_UPGRADE.md` untuk dokumentasi detail.

## 🔄 Rollback

Jika ada masalah:
```powershell
copy src\pages\GeoDataManager.backup.tsx src\pages\GeoDataManager.tsx
```

---

**Version**: 2.0.0  
**Last Updated**: ${new Date().toLocaleDateString('id-ID')}
