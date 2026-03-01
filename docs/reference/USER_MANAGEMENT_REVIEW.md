# Review User Management - Troubleshooting

## Status Implementasi

✅ **Kode AdminSettings sudah benar**
- Query profiles: `SELECT id, full_name, phone, created_at FROM profiles`
- Query user_roles: `SELECT user_id, role FROM user_roles`
- Debug logging sudah ditambahkan di loadUsers()

✅ **Migrasi RLS sudah dibuat**
- File: `20240101000005_fix_admin_profiles_access.sql`
- Policy baru: Admin bisa view semua profiles
- Policy baru: Admin bisa delete user_roles

## Kemungkinan Masalah

### 1. Migrasi belum diterapkan ke database
**Gejala**: User list kosong meskipun ada user di auth.users

**Solusi**: Terapkan migrasi secara manual di Supabase SQL Editor

```sql
-- Jalankan query ini di Supabase SQL Editor
BEGIN;

-- Drop existing restrictive policies on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Recreate policies with admin override
CREATE POLICY "Users can view own profile or admins can view all" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id 
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Ensure admin can delete user_roles (for demoting admin to user)
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

COMMIT;
```

### 2. Data profiles tidak ada (user sudah signup tapi profile tidak terbuat)
**Gejala**: auth.users ada data, tapi profiles kosong

**Cek manual**:
```sql
-- Cek jumlah user di auth vs profiles
SELECT 
  (SELECT COUNT(*) FROM auth.users) as total_auth_users,
  (SELECT COUNT(*) FROM public.profiles) as total_profiles,
  (SELECT COUNT(*) FROM public.user_roles) as total_roles;
```

**Solusi**: Insert manual profiles yang hilang
```sql
-- Insert profiles untuk user yang belum punya profile
INSERT INTO public.profiles (id, full_name, phone, created_at)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email) as full_name,
  u.raw_user_meta_data->>'phone' as phone,
  u.created_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);
```

### 3. User roles tidak ada
**Gejala**: profiles ada, tapi user_roles kosong (semua user jadi "user")

**Cek manual**:
```sql
-- Lihat semua user dan role mereka
SELECT 
  p.id,
  p.full_name,
  p.phone,
  COALESCE(ur.role::text, 'user') as role,
  p.created_at
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'admin'
ORDER BY p.created_at DESC;
```

**Solusi**: Tambahkan role admin secara manual
```sql
-- Jadikan user tertentu sebagai admin (ganti dengan email yang sesuai)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'ti3.ari170197@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

### 4. Admin yang login tidak punya role admin
**Gejala**: Bisa login tapi tidak bisa lihat user list (akses ditolak)

**Cek siapa yang login**:
```sql
-- Jalankan di browser console saat sudah login
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user?.email, user?.id);
```

**Cek role user yang login**:
```sql
-- Ganti <USER_ID> dengan ID dari console log di atas
SELECT * FROM public.user_roles WHERE user_id = '<USER_ID>';
```

**Solusi**: Tambahkan role admin
```sql
-- Ganti <USER_ID> dengan ID user yang login
INSERT INTO public.user_roles (user_id, role)
VALUES ('<USER_ID>', 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;
```

## Langkah Debugging

### Step 1: Buka browser console
1. Login ke aplikasi sebagai admin
2. Buka Developer Tools (F12)
3. Pergi ke tab "Console"
4. Buka halaman Admin Settings > Tab Pengguna

### Step 2: Lihat debug log
Cari log berikut di console:
```
[AdminSettings] Profiles loaded: <jumlah> <array data>
[AdminSettings] Roles loaded: <jumlah> <array data>
[AdminSettings] Final user list: <array data>
```

### Step 3: Analisis hasil

**Jika Profiles loaded: 0**
→ Masalah: RLS policy profiles atau data profiles kosong
→ Solusi: Terapkan migrasi + insert manual profiles

**Jika Profiles loaded: >0 tapi Roles loaded: 0**
→ Masalah: user_roles kosong atau RLS policy user_roles
→ Solusi: Insert manual user_roles untuk admin

**Jika ada error di console**
→ Masalah: RLS policy menolak akses
→ Solusi: Terapkan migrasi fix RLS

## Query Lengkap untuk Cek Status

Jalankan query ini di Supabase SQL Editor untuk melihat status lengkap:

```sql
-- 1. Cek total data
SELECT 
  'auth.users' as table_name,
  COUNT(*) as total
FROM auth.users
UNION ALL
SELECT 
  'profiles' as table_name,
  COUNT(*) as total
FROM public.profiles
UNION ALL
SELECT 
  'user_roles' as table_name,
  COUNT(*) as total
FROM public.user_roles;

-- 2. Lihat semua user dengan detail lengkap
SELECT 
  u.id,
  u.email,
  u.created_at as auth_created_at,
  p.full_name,
  p.phone,
  p.created_at as profile_created_at,
  COALESCE(
    (SELECT role::text FROM public.user_roles WHERE user_id = u.id AND role = 'admin'),
    'user'
  ) as role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at DESC;

-- 3. Cek RLS policies yang aktif
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'user_roles')
ORDER BY tablename, policyname;
```

## Expected Users

Berdasarkan conversation history, user yang diharapkan:

1. **ti3.ari170197@gmail.com** → Role: admin
2. **psdaciamis2025@gmail.com** → Role: user

## Checklist Verifikasi

- [ ] Migrasi 20240101000005 sudah diterapkan
- [ ] Query #1 menunjukkan jumlah profiles = jumlah auth.users
- [ ] Query #2 menunjukkan ti3.ari170197@gmail.com dengan role = 'admin'
- [ ] Query #2 menunjukkan psdaciamis2025@gmail.com dengan role = 'user'
- [ ] Query #3 menunjukkan policy "Users can view own profile or admins can view all"
- [ ] Browser console menunjukkan Profiles loaded > 0
- [ ] User list tampil di UI Admin Settings

## Solusi Cepat (All-in-One)

Jika ingin fix semua sekaligus, jalankan script ini:

```sql
BEGIN;

-- 1. Fix RLS policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view own profile or admins can view all" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id 
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- 2. Insert missing profiles
INSERT INTO public.profiles (id, full_name, phone, created_at)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email) as full_name,
  u.raw_user_meta_data->>'phone' as phone,
  u.created_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- 3. Set admin role untuk ti3.ari170197@gmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'ti3.ari170197@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Verifikasi hasil
SELECT 
  u.email,
  p.full_name,
  COALESCE(
    (SELECT role::text FROM public.user_roles WHERE user_id = u.id AND role = 'admin'),
    'user'
  ) as role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at;

COMMIT;
```

## Kesimpulan

Implementasi kode sudah benar. Masalah kemungkinan besar ada di:
1. **Migrasi RLS belum diterapkan** → Terapkan SQL di atas
2. **Data profiles/user_roles kosong** → Insert manual dengan SQL di atas
3. **User yang login bukan admin** → Tambahkan role admin dengan SQL di atas

Setelah menjalankan "Solusi Cepat (All-in-One)", refresh halaman dan cek apakah user sudah tampil.
