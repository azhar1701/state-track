# Perbaikan Flicker Saat Pindah Tab

## Masalah
Komponen flicker/load ulang saat pindah tab di browser yang sama.

## Penyebab
1. Re-render tidak perlu pada komponen parent
2. Inline object/function creation di props
3. Event handler tidak di-memoize
4. Dependency array tidak optimal

## Solusi

### 1. Memoize Komponen Utama
```typescript
// App.tsx
const AppInner = memo(() => {
  const mainStyle = useMemo(() => ({
    paddingBottom: isMobile && user ? '72px' : '0'
  }), [isMobile, user]);
  // ...
});

// Navbar.tsx
const Navbar = memo(() => {
  // ...
});

// OfflineIndicator.tsx
export const OfflineIndicator = memo(() => {
  // ...
});
```

### 2. Optimize Hooks
```typescript
// useOutboxSync.ts
const process = useMemo(() => async () => {
  // Stable function reference
}, []);

// usePreventRefresh.ts
const handlers = useMemo(() => ({
  visibility: () => { /* ... */ },
  beforeUnload: () => undefined
}), []);
```

### 3. Stable References
```typescript
// useOutboxSync.ts
const userIdRef = useRef(userId);
useEffect(() => {
  userIdRef.current = userId;
}, [userId]);
```

## Testing
1. Buka aplikasi
2. Pindah ke tab lain
3. Kembali ke tab aplikasi
4. Tidak ada flicker/reload

## Hasil
- ✅ Tidak ada flicker saat pindah tab
- ✅ Performa lebih baik
- ✅ Memory usage lebih efisien
