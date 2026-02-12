# Sinkronisasi Kategori - Dokumentasi

## Overview

Sistem kategori telah disinkronkan secara menyeluruh antara database enum `report_category` dan tabel `custom_categories`. Tabel `custom_categories` adalah **single source of truth** untuk semua kategori.

## Arsitektur

### 1. Database Layer

**Tabel: `custom_categories`**
```sql
- id (UUID, PK)
- value (TEXT, UNIQUE) -- nilai enum
- label (TEXT) -- label tampilan
- icon (TEXT) -- emoji icon
- color (TEXT) -- hex color
- description (TEXT, nullable)
- is_active (BOOLEAN) -- status aktif/nonaktif
- created_by (UUID, FK)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

**Enum: `report_category`**
- Tetap ada untuk backward compatibility
- Nilai enum disinkronkan dengan `custom_categories.value`
- Validasi dilakukan via trigger, bukan enum constraint

**View: `active_categories`**
- View read-only untuk kategori aktif
- Digunakan untuk query cepat tanpa filter `is_active`

### 2. Validasi Layer

**Trigger: `validate_category_trigger`**
- Berjalan BEFORE INSERT/UPDATE pada tabel `reports`
- Memvalidasi bahwa `category` ada di `custom_categories` dan `is_active = true`
- Mencegah penggunaan kategori yang dinonaktifkan

**Function: `validate_report_category()`**
```sql
-- Cek apakah kategori valid dan aktif
IF NOT EXISTS (
  SELECT 1 FROM custom_categories 
  WHERE value = NEW.category AND is_active = true
) THEN
  RAISE EXCEPTION 'Invalid or inactive category'
END IF;
```

### 3. Application Layer

**Hook: `useCategoryConfig`**
```typescript
const { 
  categories,           // Semua kategori
  activeCategories,     // Hanya yang aktif
  getCategoryByValue,   // Get by value
  getCategoryIcon,      // Get icon
  getCategoryColor,     // Get color
  getCategoryLabel      // Get label
} = useCategoryConfig();
```

**Realtime Subscription**
- Auto-reload saat ada perubahan di `custom_categories`
- Menggunakan Supabase Realtime
- Fallback ke default categories jika gagal load

## Integrasi dengan Komponen

### ReportForm.tsx
```typescript
// Load categories dari database
const { data } = await supabase
  .from('custom_categories')
  .select('value, label')
  .eq('is_active', true)
  .order('label');

// Fallback jika gagal
const categories = data || defaultCategories;
```

### CategorySettings.tsx
- CRUD lengkap untuk kategori
- Edit icon, color, description via Sheet drawer
- Toggle aktif/nonaktif tanpa hapus data
- Validasi: tidak bisa hapus kategori yang punya laporan
- Statistik real-time per kategori

### AdminDashboard / MapView
```typescript
const { getCategoryIcon, getCategoryColor } = useCategoryConfig();

// Render badge dengan icon & color
<Badge style={{ backgroundColor: getCategoryColor(report.category) }}>
  {getCategoryIcon(report.category)} {report.category}
</Badge>
```

## Migration Files

1. **20240101000004_custom_categories.sql**
   - Create tabel `custom_categories`
   - RLS policies untuk admin
   - Insert default categories

2. **20250116_enhance_custom_categories.sql**
   - Add kolom `icon`, `color`, `description`
   - Update default icons & colors

3. **20250116_sync_categories.sql** (NEW)
   - Sync enum ↔ custom_categories
   - Create validation trigger
   - Create `active_categories` view
   - Mark old categories (lampu, taman) as inactive

## Workflow

### Menambah Kategori Baru
1. Admin tambah via CategorySettings
2. Insert ke `custom_categories` dengan `is_active = true`
3. Migration otomatis sync ke enum (jika perlu)
4. Trigger validasi memastikan hanya kategori aktif yang bisa digunakan
5. Realtime subscription update UI di semua tab

### Menonaktifkan Kategori
1. Admin toggle switch di CategorySettings
2. Update `is_active = false` di `custom_categories`
3. Kategori tidak muncul di form baru
4. Laporan lama dengan kategori ini tetap valid (historical data)
5. Tidak bisa dihapus jika ada laporan yang menggunakan

### Mengedit Kategori
1. Admin klik Edit → Sheet drawer terbuka
2. Edit icon, color, description
3. Update ke database
4. Realtime sync ke semua komponen yang menggunakan `useCategoryConfig`

## Validasi & Error Handling

### Client-side
- Form validation: kategori harus dipilih dari list aktif
- Dropdown hanya menampilkan kategori aktif
- Fallback ke default categories jika database error

### Server-side
- Trigger validation: cek `is_active = true`
- RLS policies: hanya admin yang bisa CRUD
- Foreign key: kategori tidak bisa dihapus jika ada laporan

### Error Messages
```typescript
// Kategori tidak aktif
"Invalid or inactive category: lampu. Please use an active category."

// Kategori tidak ada
"Category not found in custom_categories table."

// Tidak bisa hapus
"Tidak dapat menghapus kategori yang memiliki 15 laporan"
```

## Testing Checklist

- [x] Load categories dari database di ReportForm
- [x] Fallback ke default jika database error
- [x] CRUD kategori di CategorySettings
- [x] Toggle aktif/nonaktif
- [x] Validasi: tidak bisa hapus kategori dengan laporan
- [x] Realtime update saat kategori berubah
- [x] Icon & color tampil di badge
- [x] Statistik per kategori akurat
- [x] Trigger validation mencegah kategori nonaktif
- [x] View `active_categories` berfungsi
- [x] Migration sync enum ↔ custom_categories

## Best Practices

1. **Jangan hapus kategori**, gunakan `is_active = false`
2. **Gunakan `useCategoryConfig` hook** untuk akses kategori di komponen
3. **Selalu load dari `custom_categories`**, bukan hardcode
4. **Fallback ke default** jika database error
5. **Subscribe realtime** untuk auto-update UI
6. **Validasi di client & server** untuk keamanan

## Troubleshooting

### Kategori tidak muncul di form
- Cek `is_active = true` di database
- Cek RLS policies untuk tabel `custom_categories`
- Cek console untuk error loading

### Error saat submit laporan
- Cek kategori masih aktif di `custom_categories`
- Cek trigger `validate_category_trigger` aktif
- Cek enum `report_category` memiliki nilai tersebut

### Realtime tidak update
- Cek Supabase Realtime enabled untuk tabel
- Cek subscription di browser console
- Refresh manual jika perlu

## Future Enhancements

- [ ] Kategori hierarki (parent-child)
- [ ] Custom fields per kategori
- [ ] Import/export kategori
- [ ] Kategori template untuk wilayah berbeda
- [ ] Analytics per kategori (trend, response time)
