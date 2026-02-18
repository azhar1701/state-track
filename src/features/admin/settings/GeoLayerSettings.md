# GeoLayer Settings - Dokumentasi

## Overview

Modul GeoLayer Settings adalah fitur pengaturan sistem yang lengkap untuk mengelola konfigurasi layer geografis dalam aplikasi. Fitur ini dirancang dengan UI/UX yang clean dan mudah dipahami oleh admin.

## Fitur Utama

### 1. Tab Umum (General)
Pengaturan dasar untuk validasi dan publikasi layer:

- **Validasi & Publikasi**
  - Wajibkan CRS EPSG:4326: Memastikan semua layer menggunakan koordinat standar WGS84
  - Publikasi otomatis: Layer baru langsung tersedia di peta tanpa perlu aktivasi manual
  - Wajibkan metadata: Memastikan informasi deskriptif terisi saat impor
  - Visible by default: Layer baru otomatis terlihat di peta

- **Konfigurasi Default**
  - CRS Default: Sistem koordinat referensi default (EPSG:4326)
  - Batas ukuran unggah: Maksimal ukuran file yang dapat diunggah (1-500 MB)
  - Tipe layer default: Pilihan antara GeoJSON, WMS, Cluster, Heatmap, atau Tile
  - Z-Index default: Urutan tumpukan layer (0-1000)
  - Opacity default: Transparansi layer (0.0 - 1.0) dengan slider interaktif

### 2. Tab Style
Pengaturan tampilan visual default untuk layer:

- **Warna & Garis**
  - Warna garis: Color picker untuk border/outline layer
  - Warna isi: Color picker untuk fill area polygon
  - Ketebalan garis: 1-10 pixel
  - Dash array: Pattern garis putus-putus (opsional)

- **Opacity**
  - Opacity garis: Transparansi border (0.0 - 1.0)
  - Opacity isi: Transparansi fill area (0.0 - 1.0)

- **Preview Style**
  - Tampilan preview real-time dari konfigurasi style yang dipilih

### 3. Tab Lanjutan (Advanced)
Fitur clustering dan heatmap untuk visualisasi data:

- **Clustering**
  - Enable clustering: Aktifkan pengelompokan marker yang berdekatan
  - Radius cluster: Jarak pengelompokan dalam pixel (20-200px)

- **Heatmap**
  - Enable heatmap: Aktifkan peta panas untuk visualisasi densitas
  - Radius heatmap: Ukuran area pengaruh setiap titik (10-100px)
  - Blur heatmap: Tingkat blur/smoothing (5-50px)
  - Max zoom heatmap: Level zoom maksimal untuk menampilkan heatmap (10-22)

## Integrasi dengan Sistem

### Database Schema
Pengaturan ini terintegrasi dengan tabel `geo_layers` yang memiliki kolom:
- `layer_type`: Tipe layer (geojson, wms, cluster, heatmap, tile)
- `style_config`: Konfigurasi style dalam format JSONB
- `popup_config`: Konfigurasi popup
- `legend_config`: Konfigurasi legend
- `z_index`: Urutan layer
- `opacity`: Transparansi layer
- `visible`: Status visibility
- `metadata`: Metadata tambahan

### Storage
Pengaturan disimpan di:
1. **LocalStorage**: `admin:geoLayerSettings` dan `admin:geoLayerStyle`
2. **Supabase**: Melalui hook `useSystemSettings` dengan key `geo.layer_settings` dan `geo.style_config`

### Hooks Integration
- `useSystemSettings`: Untuk menyimpan dan mengambil pengaturan dari database
- `useLayerManager`: Menggunakan pengaturan ini saat upload dan render layer

## UI/UX Design

### Layout
- Responsive design dengan grid system
- Tab navigation untuk memisahkan kategori pengaturan
- Card-based layout dengan shadow dan border yang subtle
- Color-coded icons untuk setiap kategori

### Interaksi
- Switch toggle untuk boolean settings
- Slider untuk nilai continuous (opacity)
- Color picker terintegrasi dengan input text
- Input number dengan validasi min/max
- Preview real-time untuk style configuration

### Feedback
- Toast notification untuk success/error
- Loading state pada tombol simpan
- Disabled state untuk input yang bergantung pada toggle
- Info badge dan description text untuk setiap setting

## Validasi

Sistem melakukan validasi untuk:
- Batas ukuran unggah > 0 MB
- Opacity antara 0-1
- Z-Index tidak negatif
- Radius cluster 20-200px
- Radius heatmap 10-100px
- Blur heatmap 5-50px
- Max zoom heatmap 10-22

## Best Practices

1. **CRS Enforcement**: Selalu aktifkan untuk memastikan konsistensi koordinat
2. **Metadata Requirement**: Aktifkan untuk dokumentasi layer yang lebih baik
3. **Auto Publish**: Nonaktifkan jika perlu review manual sebelum publikasi
4. **Clustering**: Aktifkan untuk dataset dengan banyak marker (>100 points)
5. **Heatmap**: Gunakan untuk visualisasi densitas, bukan detail individual
6. **Z-Index**: Gunakan range 400-600 untuk layer custom, hindari konflik dengan base layers

## Troubleshooting

### Layer tidak muncul setelah upload
- Cek apakah "Publikasi otomatis" aktif
- Cek apakah "Visible by default" aktif
- Verifikasi CRS sesuai dengan enforcement setting

### Style tidak sesuai harapan
- Cek preview di tab Style sebelum simpan
- Pastikan opacity tidak terlalu rendah
- Verifikasi warna fill dan stroke berbeda untuk visibility

### Clustering tidak bekerja
- Pastikan "Enable clustering" aktif
- Cek apakah layer type adalah 'cluster'
- Verifikasi radius cluster tidak terlalu kecil

## Changelog

### Version 1.0.0 (2025-01-16)
- Initial release dengan 3 tab (Umum, Style, Lanjutan)
- Integrasi dengan database schema yang enhanced
- Support untuk 5 tipe layer (geojson, wms, cluster, heatmap, tile)
- Real-time style preview
- Validasi input yang comprehensive
- Responsive design untuk mobile dan desktop
