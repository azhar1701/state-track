# Perbaikan Masalah Refresh Halaman

## Masalah yang Ditemukan

Aplikasi sering melakukan refresh halaman secara otomatis, terutama saat:
1. Pindah ke program/window lain
2. Kembali ke browser setelah minimize
3. Service Worker melakukan update
4. Token authentication di-refresh

## Penyebab Utama

### 1. PWA Auto-Update yang Agresif
- `registerType: 'autoUpdate'` di vite.config.ts menyebabkan halaman otomatis reload saat ada service worker baru
- `self.skipWaiting()` di service worker membuat SW baru langsung aktif tanpa menunggu user

### 2. Window.location.reload() di PWA Update
- Hook `usePWAUpdateToast` memanggil `window.location.reload()` setelah update SW
- Ini menyebabkan refresh paksa yang mengganggu user experience

### 3. Auth State Change Listener
- Setiap kali Supabase refresh token, listener `onAuthStateChange` dipanggil
- Tidak ada early return untuk event `TOKEN_REFRESHED`, menyebabkan re-render tidak perlu

### 4. Realtime Channel Cleanup
- Cleanup Supabase channel tidak menggunakan `void` untuk async operation
- Bisa menyebabkan warning dan behavior tidak konsisten

## Solusi yang Diterapkan

### 1. Ubah PWA ke Mode Prompt (vite.config.ts)
```typescript
registerType: "prompt",  // Dari "autoUpdate"
```
- User sekarang bisa memilih kapan mau update
- Tidak ada refresh otomatis

### 2. Nonaktifkan skipWaiting (src/sw.ts)
```typescript
// self.skipWaiting();  // Dinonaktifkan
clientsClaim();
```
- Service Worker baru menunggu sampai semua tab ditutup
- Atau user klik tombol "Muat Ulang" di toast notification

### 3. Hapus window.location.reload() (usePWAUpdateToast.tsx)
```typescript
onClick: async () => {
  await updateServiceWorker(true);  // Tidak ada reload paksa
},
duration: Infinity,  // Toast tidak hilang otomatis
```
- Update SW tanpa reload paksa
- Toast tetap muncul sampai user klik atau dismiss

### 4. Early Return untuk TOKEN_REFRESHED (AuthContext.tsx)
```typescript
if (event === 'TOKEN_REFRESHED') {
  console.log('Token refreshed successfully');
  return;  // Tidak lanjut ke setState
}
```
- Mencegah re-render saat token refresh
- Hanya log untuk debugging

### 5. Hook usePreventRefresh Baru
```typescript
// src/hooks/usePreventRefresh.ts
export function usePreventRefresh() {
  // Mencegah refresh saat visibility change
  // Logging untuk debugging
}
```
- Monitor visibility change tanpa trigger refresh
- Bisa dikembangkan untuk handle edge cases lain

### 6. Proper Async Cleanup (MapView.tsx)
```typescript
return () => {
  void supabase.removeChannel(channel);
};
```
- Cleanup channel dengan proper async handling
- Mencegah memory leak

## Cara Testing

### 1. Test PWA Update
```bash
npm run build
npm run preview
```
- Buka di browser
- Build lagi dengan perubahan kecil
- Refresh halaman
- Seharusnya muncul toast "Versi baru tersedia"
- Halaman TIDAK refresh otomatis

### 2. Test Window Switch
- Buka aplikasi
- Pindah ke program lain (Alt+Tab)
- Kembali ke browser
- Halaman TIDAK refresh

### 3. Test Auth Token Refresh
- Login ke aplikasi
- Tunggu 1 jam (atau set token expiry lebih pendek di Supabase)
- Token akan auto-refresh
- Halaman TIDAK refresh, hanya console log

### 4. Test Realtime Updates
- Buka 2 tab aplikasi
- Buat laporan baru di tab 1
- Tab 2 akan update data TANPA refresh halaman

## Breaking Changes

### Tidak Ada
Semua perubahan backward compatible:
- User experience lebih baik (tidak ada refresh tiba-tiba)
- Fitur tetap berfungsi normal
- PWA tetap bisa update, tapi dengan kontrol user

## Rekomendasi Tambahan

### 1. Monitoring
Tambahkan analytics untuk track:
- Berapa kali user klik "Muat Ulang" di toast
- Berapa lama user delay update
- Apakah masih ada refresh tidak terduga

### 2. User Education
Tambahkan tooltip/help text:
- Jelaskan kenapa perlu update
- Apa yang baru di versi terbaru
- Kapan waktu terbaik untuk update

### 3. Force Update (Optional)
Untuk critical security updates:
```typescript
// Tambahkan flag di manifest
if (updateIsCritical) {
  await updateServiceWorker(true);
  window.location.reload(); // OK untuk critical update
}
```

## Rollback Plan

Jika ada masalah, rollback dengan:
```bash
git revert HEAD
npm run build
npm run deploy
```

Atau manual edit:
1. vite.config.ts: `registerType: "autoUpdate"`
2. src/sw.ts: Uncomment `self.skipWaiting()`
3. usePWAUpdateToast.tsx: Tambahkan kembali `window.location.reload()`

## Kesimpulan

Perbaikan ini mengatasi masalah refresh yang mengganggu dengan:
- ✅ Tidak ada auto-refresh saat update PWA
- ✅ Tidak ada refresh saat pindah window
- ✅ Tidak ada refresh saat token refresh
- ✅ User tetap bisa update kapan saja
- ✅ Realtime updates tetap berfungsi
- ✅ Offline mode tetap berfungsi

User experience jauh lebih baik karena aplikasi tidak "loncat-loncat" saat digunakan.
