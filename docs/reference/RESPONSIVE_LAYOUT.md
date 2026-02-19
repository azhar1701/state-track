# Responsive Layout Implementation Guide

## 1. TAILWIND CONFIG UPDATES

### Safe Area Insets (Notch Support)
```tsx
// Gunakan untuk padding yang aman dari notch/home indicator
<div className="pt-safe pb-safe">
  Content aman dari notch
</div>
```

### Dynamic Viewport Height
```tsx
// GANTI h-screen dengan h-dvh
<div className="h-dvh">  // ✅ Responsive ke address bar
  <div className="h-screen">  // ❌ Fixed, bisa overflow
```

### Fluid Typography
```tsx
// Ukuran teks otomatis scale
<h1 className="text-fluid-3xl">Judul Besar</h1>
<h2 className="text-fluid-2xl">Subjudul</h2>
<p className="text-fluid-base">Paragraf</p>
```

## 2. MAIN LAYOUT USAGE

### Basic Implementation
```tsx
import { MainLayout } from '@/components/layout/MainLayout';
import { useState } from 'react';

function MapPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <MainLayout
      sidebar={
        <div className="p-fluid">
          <h2 className="text-fluid-xl mb-4">Sidebar Content</h2>
          {/* Sidebar content */}
        </div>
      }
      sidebarOpen={sidebarOpen}
      onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
      sidebarPosition="left"
    >
      {/* Map content */}
      <MapContainer />
    </MainLayout>
  );
}
```

### Behavior by Screen Size
- **Desktop (lg+)**: Sidebar fixed 384px, slide in/out
- **Tablet (md)**: Sidebar overlay, collapsible
- **Mobile (sm)**: Bottom sheet dengan backdrop

## 3. MAP RESIZE HANDLING

### Auto Resize Hook
```tsx
import { useMapResize } from '@/hooks/useMapResize';

function MapComponent() {
  const [map, setMap] = useState<L.Map | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto invalidate saat sidebar toggle atau window resize
  useMapResize(map, [sidebarOpen]);

  return (
    <MapContainer ref={setMap}>
      {/* Map layers */}
    </MapContainer>
  );
}
```

### With Responsive Container
```tsx
import { ResponsiveMapContainer } from '@/components/map/ResponsiveMapContainer';

<ResponsiveMapContainer 
  mapInstance={map} 
  sidebarOpen={sidebarOpen}
>
  <MapContainer ref={setMap} className="h-full w-full">
    {/* Map content */}
  </MapContainer>
</ResponsiveMapContainer>
```

## 4. FLUID SPACING

### Responsive Padding
```tsx
// Desktop: 2rem, Mobile: 1rem (smooth transition)
<div className="p-fluid">
  Content dengan padding responsif
</div>

// Horizontal only
<div className="px-fluid">
  Padding kiri-kanan responsif
</div>

// Vertical only
<div className="py-fluid">
  Padding atas-bawah responsif
</div>
```

### Responsive Gap
```tsx
<div className="flex gap-fluid">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

## 5. MIGRATION CHECKLIST

### Replace Fixed Heights
```tsx
// ❌ Before
<div className="h-screen">

// ✅ After
<div className="h-dvh">
```

### Replace Fixed Typography
```tsx
// ❌ Before
<h1 className="text-3xl">

// ✅ After
<h1 className="text-fluid-3xl">
```

### Replace Fixed Padding
```tsx
// ❌ Before
<div className="p-8 md:p-4">

// ✅ After
<div className="p-fluid">
```

### Add Safe Area
```tsx
// ❌ Before
<nav className="fixed top-0">

// ✅ After
<nav className="fixed top-0 pt-safe">
```

## 6. COMMON PATTERNS

### Full Height Map Page
```tsx
<div className="h-dvh flex flex-col">
  <nav className="pt-safe">Navbar</nav>
  <main className="flex-1 relative">
    <ResponsiveMapContainer mapInstance={map}>
      <MapContainer />
    </ResponsiveMapContainer>
  </main>
  <footer className="pb-safe">Footer</footer>
</div>
```

### Sidebar with Map
```tsx
<MainLayout
  sidebar={<Sidebar />}
  sidebarOpen={open}
  onSidebarToggle={() => setOpen(!open)}
>
  <ResponsiveMapContainer mapInstance={map} sidebarOpen={open}>
    <MapContainer />
  </ResponsiveMapContainer>
</MainLayout>
```

### Bottom Sheet (Mobile Only)
```tsx
{isMobile && (
  <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe-bottom">
    <div className="glass-strong rounded-t-3xl p-fluid">
      Content
    </div>
  </div>
)}
```

## 7. PERFORMANCE TIPS

### Debounce Map Resize
Hook `useMapResize` sudah include debounce 300ms untuk performa optimal.

### ResizeObserver
`ResponsiveMapContainer` menggunakan ResizeObserver untuk detect perubahan container size secara efisien.

### Transition Duration
Semua transition menggunakan 300ms untuk smooth animation tanpa lag.

## 8. BROWSER SUPPORT

- **dvh**: Chrome 108+, Safari 15.4+, Firefox 110+
- **safe-area-inset**: iOS Safari 11+, Chrome Android 69+
- **clamp()**: All modern browsers
- **ResizeObserver**: All modern browsers

Fallback otomatis ke `100vh` untuk browser lama.
