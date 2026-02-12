# Admin Settings - Dokumentasi Fitur

## Overview
Tab Pengaturan di Admin Dashboard telah diupgrade dengan 13 kategori pengaturan yang komprehensif untuk mengelola seluruh aspek aplikasi.

## Struktur Tab

### 1. **Peta** (Map Settings)
**Icon:** Settings  
**Warna:** Primary Blue

**Fitur:**
- Konfigurasi koordinat pusat peta (Latitude/Longitude)
- Pengaturan level zoom default
- Pilihan basemap (OSM, Satelit, Terrain, Dark Mode)
- Toggle tampilan batas administrasi
- Penyimpanan preferensi di localStorage

**Use Case:** Mengatur tampilan default peta untuk semua pengguna

---

### 2. **GeoLayer** (Geographic Layer Settings)
**Icon:** Database  
**Warna:** Blue

**Fitur:**
- Validasi CRS EPSG:4326
- Auto-publish layer ke peta
- Pengaturan CRS default
- Batas ukuran upload (MB)
- Requirement metadata layer

**Use Case:** Mengelola validasi dan publikasi data geografis

---

### 3. **Tema** (Theme & Appearance) ✨ NEW
**Icon:** Palette  
**Warna:** Purple

**Fitur:**
- Color picker untuk warna primer
- Color picker untuk warna aksen
- Toggle mode gelap default
- Branding customization

**Use Case:** Kustomisasi tampilan aplikasi sesuai identitas organisasi

---

### 4. **Email** (Email & Communication) ✨ NEW
**Icon:** Mail  
**Warna:** Blue

**Fitur:**
- Konfigurasi SMTP (Host, Port, Username, Password)
- Toggle email notifikasi
- Test koneksi SMTP
- Template email management

**Use Case:** Setup komunikasi email otomatis untuk notifikasi laporan

---

### 5. **Laporan** (Reports & Export) ✨ NEW
**Icon:** FileText  
**Warna:** Green

**Fitur:**
- Jadwal auto-export (Harian/Mingguan/Bulanan)
- Pilihan format ekspor (CSV/PDF/Excel)
- Pengaturan retensi data (hari)
- Scheduled report delivery

**Use Case:** Otomasi pembuatan dan pengiriman laporan berkala

---

### 6. **Wilayah** (Location & Region) ✨ NEW
**Icon:** MapPin  
**Warna:** Red

**Fitur:**
- Upload boundary GeoJSON
- Koordinat default per kecamatan
- Toggle geocoding otomatis
- Location aliases management

**Use Case:** Mengelola data wilayah dan boundary administratif

---

### 7. **Kategori** (Categories & Status) ✨ NEW
**Icon:** Tags  
**Warna:** Orange

**Fitur:**
- Tambah/hapus kategori laporan custom
- Manajemen workflow status
- Pengaturan SLA per kategori
- Auto-assignment rules

**Use Case:** Kustomisasi kategori dan workflow sesuai kebutuhan organisasi

---

### 8. **Notifikasi** (Notifications)
**Icon:** Bell  
**Warna:** Amber

**Fitur:**
- Toggle notifikasi Email
- Toggle notifikasi Push
- Toggle ringkasan harian
- Notification preferences

**Sub-section: Audit Log**
- Riwayat aktivitas sistem
- Filter by actor dan action
- Real-time activity monitor

**Use Case:** Mengatur preferensi notifikasi dan monitoring aktivitas

---

### 9. **Keamanan** (Security)
**Icon:** Lock  
**Warna:** Red

**Fitur:**
- Toggle MFA requirement
- Session timeout configuration
- IP allowlist management
- Security warnings

**Use Case:** Meningkatkan keamanan akses sistem

---

### 10. **Sistem** (System & Performance) ✨ NEW
**Icon:** Wrench  
**Warna:** Gray

**Fitur:**
- Metrics dashboard (Uptime, Response Time, Storage, API Calls)
- Clear cache button
- Database optimization
- Health check runner

**Use Case:** Monitoring dan optimasi performa sistem

---

### 11. **API** (Integration & API) ✨ NEW
**Icon:** Plug  
**Warna:** Cyan

**Fitur:**
- API key management (Generate, Copy, Rotate)
- Webhook URL configuration
- Rate limiting settings
- CORS configuration

**Use Case:** Integrasi dengan sistem eksternal dan third-party services

---

### 12. **Backup** (Backup & Restore)
**Icon:** DownloadCloud  
**Warna:** Green

**Fitur:**
- Backup geo layers ke JSON
- Restore dari file backup
- Scheduled backup
- Archive management

**Use Case:** Proteksi data dan disaster recovery

---

### 13. **Pengguna** (User Management)
**Icon:** Users  
**Warna:** Primary

**Fitur:**
- Daftar semua pengguna
- Badge counter (Total Users, Admin Count)
- Role management (User/Admin)
- User activity tracking
- Refresh data button

**Use Case:** Mengelola akses dan role pengguna sistem

---

## Komponen Reusable

### SettingsSection
```tsx
<SettingsSection
  icon={<Icon />}
  title="Judul"
  description="Deskripsi"
  badge="Optional Badge"
>
  {children}
</SettingsSection>
```

### SettingsRow
```tsx
<SettingsRow
  label="Setting Name"
  description="Helper text"
  control={<Switch />}
/>
```

### DangerZone
```tsx
<DangerZone>
  <Button variant="destructive">Delete All Data</Button>
</DangerZone>
```

---

## UI/UX Improvements

### Navigation
- **Scrollable horizontal tabs** untuk menampung 13 kategori
- **Icon + Label** untuk setiap tab
- **Responsive design** dengan whitespace-nowrap

### Visual Design
- **Shadow effects** pada hover untuk interaksi yang lebih baik
- **Color-coded icons** untuk identifikasi cepat
- **Consistent spacing** dengan Separator component
- **Badge indicators** untuk status dan metrics

### User Experience
- **Grouped settings** berdasarkan fungsi
- **Clear descriptions** untuk setiap pengaturan
- **Validation feedback** sebelum save
- **Loading states** untuk async operations
- **Toast notifications** untuk feedback

---

## Storage Strategy

### LocalStorage Keys
- `admin:mapPreferences` - Preferensi peta
- `admin:geoLayerSettings` - Pengaturan geo layer
- `admin:notificationSettings` - Preferensi notifikasi
- `admin:securitySettings` - Pengaturan keamanan

### Database Tables
- `user_roles` - Role management
- `report_logs` - Audit trail
- `geo_layers` - Geographic data
- `profiles` - User information

---

## Future Enhancements

### Phase 1 (Implemented) ✅
- [x] Tab navigation dengan 13 kategori
- [x] Reusable components (SettingsSection, SettingsRow, DangerZone)
- [x] User management dengan role switching
- [x] Audit log viewer
- [x] Backup & restore functionality

### Phase 2 (Recommended)
- [ ] Maintenance mode toggle
- [ ] Advanced notification rules engine
- [ ] Email template editor (WYSIWYG)
- [ ] Custom CSS injection
- [ ] Logo upload functionality
- [ ] Real-time system metrics
- [ ] API documentation viewer
- [ ] Webhook event logs
- [ ] Category icon picker
- [ ] SLA tracking dashboard

### Phase 3 (Advanced)
- [ ] Multi-language support
- [ ] Custom field builder
- [ ] Workflow automation
- [ ] Advanced analytics
- [ ] Role-based permissions (granular)
- [ ] Two-factor authentication
- [ ] SSO integration
- [ ] Audit log export
- [ ] Scheduled maintenance windows
- [ ] Performance profiling tools

---

## Technical Stack

- **React 18** + TypeScript
- **shadcn/ui** components
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Supabase** for backend
- **localStorage** for client-side settings
- **Sonner** for toast notifications

---

## Best Practices

1. **Always validate** input sebelum save
2. **Provide feedback** dengan toast notifications
3. **Use loading states** untuk async operations
4. **Implement error boundaries** untuk error handling
5. **Keep settings organized** by category
6. **Document changes** in audit log
7. **Test thoroughly** sebelum deploy
8. **Backup regularly** untuk disaster recovery

---

## Maintenance Notes

- Settings disimpan di localStorage untuk performa
- Audit logs limited to 10 entries (dapat dikonfigurasi)
- API keys harus di-rotate secara berkala
- Backup geo layers sebelum major updates
- Monitor system metrics untuk early warning
- Review security settings setiap bulan

---

**Last Updated:** 2024
**Version:** 2.0.0
**Status:** Production Ready ✅
