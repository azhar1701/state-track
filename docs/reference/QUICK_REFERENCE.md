# UI/UX Quick Reference

## 🎨 CSS Classes

### Shadows
```tsx
className="shadow-soft"    // Subtle depth
className="shadow-float"   // Elevated elements
className="shadow-lifted"  // Modals/overlays
```

### Effects
```tsx
className="glass-panel"    // Glassmorphism
className="btn-haptic"     // Button press feedback
className="page-transition" // Page enter animation
```

### Icons
```tsx
className="icon-xs"  // 12px
className="icon-sm"  // 16px
className="icon-md"  // 20px
className="icon-lg"  // 24px
```

## 📦 Components

### Loading States
```tsx
import { ReportCardSkeleton, MapSkeleton } from '@/components/common/Skeleton';

<ReportCardSkeleton />
<MapSkeleton />
```

### Map Components
```tsx
import { CustomPopup } from '@/components/map/CustomPopup';
import { MobileMapControls } from '@/components/map/MobileMapControls';

<CustomPopup report={report} onViewDetail={() => {}} />
<MobileMapControls 
  onZoomIn={() => {}} 
  onZoomOut={() => {}}
  onLocate={() => {}}
/>
```

### PWA Components
```tsx
import { OfflineState } from '@/components/OfflineState';
import { InstallPrompt } from '@/components/InstallPrompt';
import { BottomNav } from '@/components/BottomNav';

<OfflineState onRetry={() => {}} />
<InstallPrompt />
<BottomNav />
```

### Form Components
```tsx
import { WizardStep } from '@/components/report/WizardStep';
import { PhotoUploadProgress } from '@/components/report/PhotoUploadProgress';

<WizardStep 
  currentStep={1} 
  totalSteps={4}
  onNext={() => {}}
  onBack={() => {}}
  onSubmit={() => {}}
>
  {/* Step content */}
</WizardStep>

<PhotoUploadProgress files={[
  { name: 'photo.jpg', status: 'uploading', progress: 50 }
]} />
```

## 🎯 Toast Patterns

```tsx
// Success with description
toast.success('Action completed!', {
  description: 'Additional context here',
});

// Error with action
toast.error('Something went wrong', {
  description: 'Error details',
  action: {
    label: 'Retry',
    onClick: () => handleRetry(),
  },
});

// Info with icon
import { Info } from 'lucide-react';
toast.message('Information', {
  description: 'Details',
  icon: <Info className="w-5 h-5" />,
});
```

## 📱 Mobile Patterns

### Conditional Rendering
```tsx
import { useIsMobile } from '@/hooks/use-mobile';

const isMobile = useIsMobile();

{isMobile ? <MobileView /> : <DesktopView />}
```

### Touch Targets
```tsx
// Minimum 48px for mobile
<Button className="h-12 w-12 btn-haptic">
  <Icon className="w-5 h-5" />
</Button>
```

## 🎨 Color Tokens

### Status Colors
```tsx
// Baru (New)
className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"

// Diproses (In Progress)
className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"

// Selesai (Done)
className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
```

### Severity Colors
```tsx
// Ringan (Light)
className="text-emerald-600"

// Sedang (Medium)
className="text-orange-600"

// Berat (Heavy)
className="text-red-600"
```

## 🔧 Utility Patterns

### Spacing
```tsx
// Form spacing
<form className="space-y-8">  // Generous vertical spacing
  <div className="space-y-2">  // Field group
    <Label />
    <Input />
  </div>
</form>
```

### Cards
```tsx
<Card className="glass-panel shadow-float p-6 md:p-8">
  <CardContent>
    {/* Content with breathing room */}
  </CardContent>
</Card>
```

### Buttons
```tsx
<Button className="btn-haptic">
  <Icon className="w-4 h-4 mr-2" />
  Label
</Button>
```

## 🚀 Performance Tips

1. **Lazy load heavy components**
```tsx
const HeavyComponent = lazy(() => import('./HeavyComponent'));
```

2. **Use skeleton loaders**
```tsx
{loading ? <ReportCardSkeleton /> : <ReportCard />}
```

3. **Optimize images**
```tsx
<img 
  src={url} 
  loading="lazy"
  className="w-full h-full object-cover"
/>
```

## ✅ Accessibility Checklist

- [ ] All buttons have `btn-haptic` class
- [ ] Touch targets ≥ 48px on mobile
- [ ] Color contrast ≥ 4.5:1
- [ ] Focus indicators visible
- [ ] Alt text on images
- [ ] ARIA labels on icon-only buttons
- [ ] Semantic HTML (nav, main, section)
- [ ] Keyboard navigation works

## 🐛 Common Issues

### Glassmorphism not working
```tsx
// Ensure parent has position context
<div className="relative">
  <div className="glass-panel">Content</div>
</div>
```

### Bottom nav overlapping content
```tsx
// Add padding to main content
<main style={{ paddingBottom: isMobile ? '72px' : '0' }}>
```

### Haptic feedback not visible
```tsx
// Ensure transition classes are present
className="btn-haptic" // Includes active:scale-95
```

## 📚 Resources

- [Tailwind CSS Docs](https://tailwindcss.com)
- [Radix UI Docs](https://radix-ui.com)
- [Lucide Icons](https://lucide.dev)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
