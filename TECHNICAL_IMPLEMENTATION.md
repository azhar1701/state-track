# IMPLEMENTASI TEKNIS - DETAIL LAPORAN MODERN

## 1. STATE MANAGEMENT BERBASIS URL (Deep Linking) ✅

### Hook: `useReportDetailURL.ts`
```typescript
import { useSearchParams } from 'react-router-dom';

export const useReportDetailURL = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const reportId = searchParams.get('reportId');
  
  const openReport = (id: string) => {
    setSearchParams({ reportId: id });
  };
  
  const closeReport = () => {
    searchParams.delete('reportId');
    setSearchParams(searchParams);
  };
  
  return { reportId, openReport, closeReport };
};
```

### Penggunaan di MapView:
```typescript
const { reportId, openReport, closeReport } = useReportDetailURL();

// Sync URL dengan state
useEffect(() => {
  if (reportId) {
    const report = reports.find(r => r.id === reportId);
    if (report) setSelectedReport(report);
  }
}, [reportId, reports]);

// Update event handlers
<Marker onClick={() => openReport(report.id)} />
<ReportDetailDrawer onClose={closeReport} />
```

**Fitur:**
- ✅ URL berubah saat buka detail: `/map?reportId=123`
- ✅ Share link langsung buka detail
- ✅ Tombol Back browser menutup modal
- ✅ History navigation support

---

## 2. ANIMATION & GESTURES (Framer Motion) ✅

### Dependencies:
```bash
npm install framer-motion
```

### Implementasi di `ReportDetailView.tsx`:
```typescript
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';

const y = useMotionValue(0);
const opacity = useTransform(y, [0, 100], [1, 0.5]);

const handleDragEnd = (_: any, info: PanInfo) => {
  if (info.offset.y > 100) onClose();
};

<motion.div
  initial={{ x: '100%' }}
  animate={{ x: 0 }}
  exit={{ x: '100%' }}
  transition={{ type: 'spring', damping: 30 }}
  drag="y"
  dragConstraints={{ top: 0, bottom: 0 }}
  dragElastic={{ top: 0, bottom: 0.5 }}
  onDragEnd={handleDragEnd}
  style={{ y, opacity }}
>
  {/* Content */}
</motion.div>
```

**Fitur:**
- ✅ Slide-in animation dari kanan (desktop)
- ✅ Drag to dismiss (mobile) - swipe down > 100px
- ✅ Opacity fade saat drag
- ✅ Spring physics untuk smooth animation

---

## 3. IMAGE OPTIMIZATION (Carousel & Lightbox) ✅

### Dependencies:
```bash
npm install embla-carousel-react yet-another-react-lightbox
```

### Carousel dengan Embla:
```typescript
import useEmblaCarousel from 'embla-carousel-react';

const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
const [selectedIndex, setSelectedIndex] = useState(0);

useEffect(() => {
  if (!emblaApi) return;
  emblaApi.on('select', () => setSelectedIndex(emblaApi.selectedScrollSnap()));
}, [emblaApi]);

<div className="overflow-hidden" ref={emblaRef}>
  <div className="flex">
    {photos.map((photo, i) => (
      <div key={i} className="flex-[0_0_100%]">
        <img src={photo} onClick={() => openLightbox(i)} />
      </div>
    ))}
  </div>
</div>
```

### Lightbox:
```typescript
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

<Lightbox
  open={lightboxOpen}
  close={() => setLightboxOpen(false)}
  index={lightboxIndex}
  slides={photos.map(src => ({ src }))}
/>
```

**Fitur:**
- ✅ Swipeable carousel (touch & mouse)
- ✅ Dot indicators
- ✅ Arrow navigation
- ✅ Zoom fullscreen dengan lightbox
- ✅ Keyboard navigation (ESC, arrows)

---

## 4. ACCESSIBILITY (Radix UI) ⚠️ OPSIONAL

### Jika ingin upgrade ke Radix Dialog:
```bash
npm install @radix-ui/react-dialog
```

```typescript
import * as Dialog from '@radix-ui/react-dialog';

<Dialog.Root open={!!selectedReport} onOpenChange={(open) => !open && closeReport()}>
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 bg-black/20" />
    <Dialog.Content className="fixed right-0 top-0 h-full w-[400px]">
      {/* Content */}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

**Keuntungan:**
- ✅ Auto focus trap
- ✅ Screen reader support
- ✅ ESC key handling
- ✅ ARIA attributes otomatis

---

## 5. LOADING STATE (Skeleton UI) ✅

### Komponen: `ReportDetailSkeleton.tsx`
```typescript
export const ReportDetailSkeleton = () => (
  <div className="fixed right-0 top-0 h-full w-[400px] bg-white">
    {/* Header */}
    <div className="p-4 space-y-2">
      <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4" />
      <div className="flex gap-2">
        <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" />
        <div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse" />
      </div>
    </div>
    
    {/* Image */}
    <div className="aspect-video bg-gray-200 animate-pulse" />
    
    {/* Content */}
    <div className="p-4 space-y-2">
      <div className="h-4 bg-gray-200 rounded animate-pulse" />
      <div className="h-4 bg-gray-200 rounded animate-pulse" />
      <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
    </div>
  </div>
);
```

### Penggunaan dengan AnimatePresence:
```typescript
import { AnimatePresence } from 'framer-motion';

<AnimatePresence>
  {loadingDetail && <ReportDetailSkeleton />}
  {selectedReport && !loadingDetail && (
    <ReportDetailDrawer report={selectedReport} onClose={closeReport} />
  )}
</AnimatePresence>
```

**Fitur:**
- ✅ Skeleton meniru layout asli
- ✅ Tailwind `animate-pulse` untuk shimmer effect
- ✅ Smooth transition dengan AnimatePresence
- ✅ No spinner, lebih modern

---

## INSTALASI DEPENDENCIES

```bash
npm install framer-motion embla-carousel-react yet-another-react-lightbox
```

## CHECKLIST IMPLEMENTASI

- [x] URL state management dengan useSearchParams
- [x] Framer Motion animations (slide-in, drag-to-dismiss)
- [x] Embla Carousel untuk swipe gambar
- [x] Yet Another React Lightbox untuk zoom
- [x] Skeleton loader dengan animate-pulse
- [x] AnimatePresence untuk smooth transitions
- [x] Responsive (side drawer desktop, bottom sheet mobile)
- [x] Dark mode support
- [x] Touch gestures (swipe, drag)

## HASIL AKHIR

✅ **Desktop**: Side drawer slide-in dari kanan, backdrop blur
✅ **Mobile**: Bottom sheet draggable, swipe down to close
✅ **Images**: Swipeable carousel + fullscreen lightbox
✅ **Loading**: Skeleton UI yang smooth
✅ **URL**: Deep linking support, browser back button works
✅ **Animation**: Spring physics, 60fps smooth
