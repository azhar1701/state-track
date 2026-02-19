# Glassmorphism Design System - State Track

## 🎨 Fondasi Glassmorphism

### Utility Classes Tersedia

#### 1. Glass Base Classes
```tsx
// Default glass effect
<div className="glass">...</div>

// Strong glass (lebih opaque, blur lebih kuat)
<div className="glass-strong">...</div>

// Subtle glass (lebih transparan, blur lebih ringan)
<div className="glass-subtle">...</div>
```

#### 2. Glass Components

**GlassCard** - Container utama dengan efek glass
```tsx
import { GlassCard } from "@/components/ui/glass-card";

<GlassCard variant="default" hover>
  <h3>Judul Card</h3>
  <p>Konten dengan background glass yang indah</p>
</GlassCard>

// Variants: "default" | "strong" | "subtle"
// hover: boolean (menambahkan scale effect saat hover)
```

**GlassButton** - Tombol dengan efek glass dan gradient
```tsx
import { GlassButton } from "@/components/ui/glass-button";

<GlassButton variant="primary">
  Submit Laporan
</GlassButton>

// Variants: "default" | "primary" | "secondary" | "destructive"
```

**GlassInput** - Input field dengan glass effect
```tsx
import { GlassInput } from "@/components/ui/glass-input";

<GlassInput 
  type="text" 
  placeholder="Masukkan lokasi..."
/>
```

**GlassModal** - Modal dialog dengan backdrop blur
```tsx
import { GlassModal } from "@/components/ui/glass-modal";

<GlassModal 
  isOpen={isOpen} 
  onClose={() => setIsOpen(false)}
  title="Detail Laporan"
>
  <p>Konten modal...</p>
</GlassModal>
```

## 🗺️ Leaflet Map Controls - Glassmorphism

Kontrol Leaflet sudah otomatis menggunakan glassmorphism. Tidak perlu konfigurasi tambahan!

### Yang Sudah Ter-style:
- ✅ Zoom controls (+/-)
- ✅ Scale bar
- ✅ Popup/Tooltip
- ✅ Custom controls (otomatis inherit)

### Override Manual (jika diperlukan):
```tsx
// Di komponen map Anda
<MapContainer className="leaflet-glass-theme">
  {/* Map content */}
</MapContainer>
```

## 🎭 Background Strategy

Body sudah menggunakan **mesh gradient** yang halus untuk membuat efek glass lebih menonjol.

### Untuk halaman tanpa peta:
```tsx
// Login page, dashboard, dll
<div className="min-h-screen flex items-center justify-center">
  <GlassCard variant="strong" className="max-w-md w-full">
    <h1>Login</h1>
    {/* Form content */}
  </GlassCard>
</div>
```

### Untuk overlay di atas peta:
```tsx
// Sidebar, modal detail, dll
<div className="absolute top-4 left-4 z-10">
  <GlassCard variant="default">
    <h2>Filter Laporan</h2>
    {/* Filter controls */}
  </GlassCard>
</div>
```

## 🎨 Karakteristik Glassmorphism

### Light Mode:
- Background: `rgba(255, 255, 255, 0.1)` - 10% putih
- Blur: `backdrop-blur-lg` (16px)
- Border: `rgba(255, 255, 255, 0.2)` - highlight terang
- Shadow: Soft lifted shadow

### Dark Mode:
- Background: `rgba(30, 41, 59, 0.3)` - 30% slate-900
- Blur: `backdrop-blur-lg` (16px)
- Border: `rgba(255, 255, 255, 0.1)` - highlight subtle
- Shadow: Soft lifted shadow

## 📝 Best Practices

### 1. Kontras Teks
Selalu gunakan teks dengan kontras tinggi:
```tsx
<GlassCard>
  <h2 className="text-foreground font-bold">Judul Jelas</h2>
  <p className="text-foreground/80">Deskripsi dengan opacity 80%</p>
</GlassCard>
```

### 2. Layering
Gunakan z-index untuk hierarki visual:
```tsx
// Map layer (z-0)
<MapContainer className="z-0">

// Controls layer (z-10)
<div className="absolute top-4 right-4 z-10">
  <GlassCard>...</GlassCard>
</div>

// Modal layer (z-50)
<GlassModal>...</GlassModal>
```

### 3. Hover States
Tambahkan interaksi untuk feedback visual:
```tsx
<GlassCard 
  hover 
  className="cursor-pointer"
  onClick={handleClick}
>
  Klik saya!
</GlassCard>
```

### 4. Form Elements
Kombinasikan glass input dengan glass card:
```tsx
<GlassCard variant="strong">
  <form className="space-y-4">
    <GlassInput placeholder="Nama" />
    <GlassInput placeholder="Email" type="email" />
    <GlassButton variant="primary" type="submit">
      Submit
    </GlassButton>
  </form>
</GlassCard>
```

## 🚀 Migration Guide

### Dari komponen lama ke glass:

**Card biasa → GlassCard**
```tsx
// Before
<div className="bg-white rounded-lg shadow-md p-6">

// After
<GlassCard>
```

**Button biasa → GlassButton**
```tsx
// Before
<button className="bg-primary text-white px-4 py-2 rounded">

// After
<GlassButton variant="primary">
```

**Input biasa → GlassInput**
```tsx
// Before
<input className="border rounded px-3 py-2" />

// After
<GlassInput />
```

## 🎯 Contoh Lengkap

```tsx
import { GlassCard } from "@/components/ui/glass-card";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassInput } from "@/components/ui/glass-input";
import { MapPin } from "lucide-react";

export function ReportFormGlass() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GlassCard variant="strong" className="max-w-lg w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 glass rounded-xl">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Buat Laporan Baru
          </h1>
        </div>

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Lokasi Kejadian
            </label>
            <GlassInput placeholder="Masukkan alamat..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-2">
              Deskripsi
            </label>
            <textarea 
              className="glass-input w-full min-h-[120px] resize-none"
              placeholder="Jelaskan kondisi infrastruktur..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <GlassButton variant="default" type="button" className="flex-1">
              Batal
            </GlassButton>
            <GlassButton variant="primary" type="submit" className="flex-1">
              Kirim Laporan
            </GlassButton>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
```

## 🔧 Troubleshooting

**Efek blur tidak terlihat?**
- Pastikan ada background yang "hidup" di belakang elemen glass
- Cek apakah browser mendukung `backdrop-filter`

**Teks sulit dibaca?**
- Gunakan `variant="strong"` untuk background lebih opaque
- Tambahkan `text-foreground` untuk kontras maksimal
- Gunakan `font-semibold` atau `font-bold` untuk teks penting

**Performance issue?**
- Batasi jumlah elemen glass yang overlap
- Gunakan `will-change: backdrop-filter` untuk animasi smooth
- Pertimbangkan `glass-subtle` untuk elemen yang tidak krusial
