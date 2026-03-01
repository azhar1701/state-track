# BAB III: METODOLOGI PENELITIAN

## 3.1 Metode Penelitian

Penelitian ini menggunakan metode Research and Development (R&D) dengan pendekatan Agile Development. Metode R&D dipilih karena penelitian ini bertujuan menghasilkan produk berupa sistem informasi yang dapat digunakan secara praktis, bukan hanya menghasilkan teori atau konsep.

### 3.1.1 Tahapan Penelitian

Penelitian dilakukan melalui lima tahapan utama:

1. **Analisis Kebutuhan**
   - Studi literatur tentang sistem pelaporan infrastruktur
   - Observasi sistem pelaporan konvensional yang ada
   - Wawancara dengan stakeholder (masyarakat, petugas lapangan, administrator)
   - Identifikasi kebutuhan fungsional dan non-fungsional

2. **Perancangan Sistem**
   - Perancangan arsitektur sistem
   - Perancangan database dan skema data
   - Perancangan antarmuka pengguna (UI/UX)
   - Perancangan alur kerja sistem

3. **Implementasi**
   - Setup development environment
   - Pengembangan fitur secara iteratif
   - Integrasi komponen sistem
   - Code review dan refactoring

4. **Pengujian**
   - Unit testing untuk fungsi-fungsi kritis
   - Integration testing untuk API dan database
   - End-to-end testing untuk user flows
   - Performance testing dan optimization

5. **Evaluasi dan Deployment**
   - User acceptance testing
   - Perbaikan berdasarkan feedback
   - Deployment ke production environment
   - Dokumentasi sistem

### 3.1.2 Metode Pengembangan Agile

Pengembangan sistem menggunakan metodologi Agile dengan sprint duration 2 minggu. Setiap sprint mencakup:

- **Sprint Planning**: Menentukan fitur yang akan dikembangkan
- **Daily Development**: Pengembangan dan testing harian
- **Sprint Review**: Demo fitur kepada stakeholder
- **Sprint Retrospective**: Evaluasi proses dan improvement

## 3.2 Arsitektur Sistem

### 3.2.1 Arsitektur Umum

Sistem SIPASDA menggunakan arsitektur three-tier yang terdiri dari:

```
┌─────────────────────────────────────────────────┐
│           PRESENTATION TIER                      │
│  ┌──────────────────────────────────────────┐  │
│  │   React 18 + TypeScript                  │  │
│  │   - MapView (Leaflet)                    │  │
│  │   - ReportForm                           │  │
│  │   - AdminDashboard                       │  │
│  │   - Service Worker (PWA)                 │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                      ↕ HTTPS/WSS
┌─────────────────────────────────────────────────┐
│           APPLICATION TIER                       │
│  ┌──────────────────────────────────────────┐  │
│  │   Supabase Backend                       │  │
│  │   - Authentication (JWT)                 │  │
│  │   - RESTful API                          │  │
│  │   - Realtime Subscriptions               │  │
│  │   - Storage API                          │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                      ↕ SQL
┌─────────────────────────────────────────────────┐
│           DATA TIER                              │
│  ┌──────────────────────────────────────────┐  │
│  │   PostgreSQL + PostGIS                   │  │
│  │   - reports table                        │  │
│  │   - profiles table                       │  │
│  │   - geo_layers table                     │  │
│  │   - audit logs                           │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 3.2.2 Feature-Based Architecture

Kode aplikasi diorganisir berdasarkan fitur bisnis:

```
src/
├── features/
│   ├── auth/              # Autentikasi & autorisasi
│   │   ├── Auth.tsx
│   │   ├── AuthContext.tsx
│   │   └── useAuth.ts
│   ├── map/               # Peta interaktif
│   │   ├── MapView.tsx
│   │   ├── BasemapSwitcher.tsx
│   │   ├── FilterPanel.tsx
│   │   ├── Legend.tsx
│   │   └── spatialAnalysis.ts
│   ├── reports/           # Pelaporan
│   │   ├── ReportForm.tsx
│   │   ├── MyReports.tsx
│   │   └── useOutboxSync.ts
│   └── admin/             # Dashboard admin
│       ├── AdminDashboard.tsx
│       └── AdminSettings.tsx
├── components/
│   ├── ui/                # Komponen UI primitif
│   └── common/            # Komponen shared
├── lib/                   # Utilities
└── services/              # API clients
```

### 3.2.3 Data Flow Architecture

Alur data dalam sistem mengikuti pola unidirectional data flow:

```
User Action → Component → API Call → Supabase → Database
                ↓                        ↓
            Local State ← Response ← Realtime ← Database Change
```

## 3.3 Perancangan Database

### 3.3.1 Entity Relationship Diagram

```
┌─────────────┐         ┌──────────────┐
│   users     │         │   profiles   │
├─────────────┤         ├──────────────┤
│ id (PK)     │────────<│ id (PK,FK)   │
│ email       │         │ full_name    │
│ created_at  │         │ avatar_url   │
└─────────────┘         └──────────────┘
       │
       │ 1:N
       ↓
┌─────────────────────────────────────┐
│           reports                    │
├─────────────────────────────────────┤
│ id (PK)                             │
│ user_id (FK)                        │
│ title                               │
│ description                         │
│ category (ENUM)                     │
│ status (ENUM)                       │
│ severity (ENUM)                     │
│ latitude                            │
│ longitude                           │
│ location_name                       │
│ photo_urls (ARRAY)                  │
│ incident_date                       │
│ reporter_name                       │
│ phone                               │
│ kecamatan                           │
│ desa                                │
│ resolution                          │
│ created_at                          │
│ updated_at                          │
└─────────────────────────────────────┘
       │
       │ 1:N
       ↓
┌─────────────────────────────────────┐
│         report_logs                  │
├─────────────────────────────────────┤
│ id (PK)                             │
│ report_id (FK)                      │
│ action                              │
│ before (JSONB)                      │
│ after (JSONB)                       │
│ actor_id (FK)                       │
│ actor_email                         │
│ created_at                          │
└─────────────────────────────────────┘
```

### 3.3.2 Skema Tabel Utama

**Tabel reports:**
```sql
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL CHECK (length(title) >= 5),
  description TEXT NOT NULL CHECK (length(description) >= 10),
  category report_category NOT NULL,
  status report_status DEFAULT 'baru',
  severity report_severity,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  location_name TEXT,
  photo_urls TEXT[],
  incident_date DATE,
  reporter_name TEXT,
  phone TEXT,
  kecamatan TEXT,
  desa TEXT,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes untuk optimasi query
CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_category ON reports(category);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_reports_location ON reports 
  USING GIST (ST_MakePoint(longitude, latitude));
```

**Tabel geo_layers:**
```sql
CREATE TABLE public.geo_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  geometry_type TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_geo_layers_key ON geo_layers(key);
CREATE INDEX idx_geo_layers_data ON geo_layers USING GIN (data);
```

### 3.3.3 Row Level Security Policies

```sql
-- Policy untuk membaca semua laporan
CREATE POLICY "Public read access"
  ON public.reports FOR SELECT
  USING (true);

-- Policy untuk insert laporan sendiri
CREATE POLICY "Users can insert own reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy untuk update laporan sendiri
CREATE POLICY "Users can update own reports"
  ON public.reports FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy untuk admin (full access)
CREATE POLICY "Admins full access"
  ON public.reports
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

## 3.4 Perancangan Antarmuka Pengguna

### 3.4.1 Prinsip Desain

Desain antarmuka mengikuti prinsip:

1. **Mobile-First**: Desain dimulai dari layar kecil, kemudian diperluas ke desktop
2. **Accessibility**: WCAG 2.1 AA compliant untuk pengguna dengan disabilitas
3. **Consistency**: Komponen UI konsisten di seluruh aplikasi
4. **Feedback**: Setiap aksi pengguna mendapat feedback visual
5. **Progressive Disclosure**: Informasi kompleks ditampilkan bertahap

### 3.4.2 Wireframe Halaman Utama

**Halaman Peta (MapView):**
```
┌────────────────────────────────────────┐
│  [Logo] SIPASDA          [User] [Menu] │
├────────────────────────────────────────┤
│                                        │
│         [Interactive Map]              │
│                                        │
│  [Search] [Filter] [Layers] [Tools]   │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ Legend:                          │ │
│  │ ● Baru  ● Diproses  ● Selesai   │ │
│  └──────────────────────────────────┘ │
│                                        │
├────────────────────────────────────────┤
│ [Home] [Map] [Report] [Profile]       │
└────────────────────────────────────────┘
```

**Halaman Formulir Laporan:**
```
┌────────────────────────────────────────┐
│  ← Buat Laporan Baru                   │
├────────────────────────────────────────┤
│                                        │
│  Judul Laporan *                       │
│  [_____________________________]       │
│                                        │
│  Kategori *        Severity *          │
│  [Dropdown ▼]      [Dropdown ▼]        │
│                                        │
│  Deskripsi *                           │
│  [_____________________________]       │
│  [_____________________________]       │
│  [_____________________________]       │
│                                        │
│  Lokasi *                              │
│  [Map Preview with Marker]             │
│  [📍 Gunakan Lokasi Saya]              │
│                                        │
│  Foto (Opsional)                       │
│  [📷 Ambil Foto] [📁 Upload]           │
│                                        │
│  [Batal]              [Kirim Laporan]  │
│                                        │
└────────────────────────────────────────┘
```

### 3.4.3 Design System

**Color Palette:**
- Primary: `#0ea5e9` (Sky Blue)
- Secondary: `#8b5cf6` (Purple)
- Success: `#10b981` (Green)
- Warning: `#f59e0b` (Amber)
- Danger: `#ef4444` (Red)
- Background: `#0f172a` (Dark) / `#ffffff` (Light)

**Typography:**
- Font Family: `system-ui, -apple-system, sans-serif`
- Heading: 24px/32px (Desktop), 20px/28px (Mobile)
- Body: 16px/24px
- Caption: 14px/20px

**Spacing Scale:**
- xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, 2xl: 48px

## 3.5 Alur Kerja Sistem

### 3.5.1 Alur Pelaporan oleh Masyarakat

```
START
  ↓
[User membuka aplikasi]
  ↓
[Login/Register] ← (Jika belum login)
  ↓
[Klik "Buat Laporan"]
  ↓
[Isi formulir:]
  - Judul
  - Kategori & Severity
  - Deskripsi
  - Lokasi (GPS/Manual)
  - Foto (Opsional)
  ↓
[Validasi form] → (Gagal) → [Tampilkan error]
  ↓ (Berhasil)
[Cek koneksi internet]
  ↓
  ├─ (Online) → [Upload foto ke Storage]
  │               ↓
  │             [Insert data ke Database]
  │               ↓
  │             [Tampilkan halaman sukses]
  │
  └─ (Offline) → [Simpan ke IndexedDB]
                  ↓
                [Tampilkan notifikasi offline]
                  ↓
                [Background sync saat online]
  ↓
END
```

### 3.5.2 Alur Verifikasi oleh Admin

```
START
  ↓
[Admin login ke dashboard]
  ↓
[Lihat daftar laporan]
  ↓
[Filter berdasarkan:]
  - Status
  - Kategori
  - Lokasi
  - Tanggal
  ↓
[Pilih laporan untuk ditinjau]
  ↓
[Lihat detail:]
  - Informasi pelapor
  - Lokasi di peta
  - Foto dokumentasi
  - Riwayat perubahan
  ↓
[Verifikasi laporan]
  ↓
[Update status:]
  - Baru → Diproses
  - Diproses → Selesai
  ↓
[Tambah catatan resolusi] (Opsional)
  ↓
[Simpan perubahan]
  ↓
[Notifikasi realtime ke pelapor]
  ↓
END
```

### 3.5.3 Alur Analisis Geospasial

```
START
  ↓
[Admin membuka peta]
  ↓
[Pilih layer yang akan dianalisis]
  ↓
[Pilih tool analisis:]
  ├─ Buffer Zone
  ├─ Density Analysis
  ├─ Route Optimization
  └─ Spatial Query
  ↓
[Tentukan parameter]
  ↓
[Jalankan analisis]
  ↓
[Tampilkan hasil di peta]
  ↓
[Export hasil] (Opsional)
  - PNG (Screenshot)
  - CSV (Data tabular)
  - GeoJSON (Data spasial)
  ↓
END
```

## 3.6 Teknologi dan Tools yang Digunakan

### 3.6.1 Development Environment

| Kategori | Tool | Versi |
|----------|------|-------|
| Code Editor | Visual Studio Code | 1.85+ |
| Version Control | Git | 2.40+ |
| Package Manager | npm | 9.0+ |
| Node.js Runtime | Node.js | 18.0+ |

### 3.6.2 Frontend Stack

| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| React | 18.3.1 | UI Framework |
| TypeScript | 5.8+ | Type Safety |
| Vite | 7.0+ | Build Tool |
| Tailwind CSS | 3.4+ | Styling |
| Leaflet | 1.9.4 | Mapping |
| React-Leaflet | 4.2.1 | React Bindings |
| Turf.js | 7.2.0 | Spatial Analysis |
| Zod | 3.25+ | Validation |

### 3.6.3 Backend & Services

| Service | Fungsi |
|---------|--------|
| Supabase Auth | Autentikasi pengguna |
| PostgreSQL | Database relasional |
| PostGIS | Extension geospasial |
| Supabase Storage | Penyimpanan foto |
| Supabase Realtime | WebSocket subscriptions |

### 3.6.4 Testing & Quality Assurance

| Tool | Fungsi |
|------|--------|
| Vitest | Unit Testing |
| Playwright | E2E Testing |
| ESLint | Code Linting |
| TypeScript Compiler | Type Checking |
| Knip | Dead Code Detection |
| Lighthouse | Performance Audit |

### 3.6.5 Deployment & CI/CD

| Platform | Fungsi |
|----------|--------|
| Vercel | Hosting & CDN |
| GitHub Actions | CI/CD Pipeline |
| GitHub | Code Repository |

## 3.7 Metode Pengujian

### 3.7.1 Unit Testing

Unit testing dilakukan untuk fungsi-fungsi utility dan business logic:

```typescript
// Contoh unit test untuk validasi
describe('Report Validation', () => {
  it('should validate title length', () => {
    const result = reportSchema.safeParse({
      title: 'Test',
      // ... other fields
    });
    expect(result.success).toBe(false);
  });
});
```

### 3.7.2 Integration Testing

Integration testing untuk memastikan komponen bekerja bersama:

```typescript
// Contoh integration test untuk API
describe('Report API', () => {
  it('should create report successfully', async () => {
    const { data, error } = await supabase
      .from('reports')
      .insert({ /* data */ });
    
    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});
```

### 3.7.3 End-to-End Testing

E2E testing menggunakan Playwright untuk simulasi user journey:

```typescript
test('User can submit report', async ({ page }) => {
  await page.goto('/report');
  await page.fill('[name="title"]', 'Test Report');
  await page.selectOption('[name="category"]', 'irigasi');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/report/success');
});
```

### 3.7.4 Performance Testing

Performance testing menggunakan Lighthouse untuk mengukur:
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)
- Total Blocking Time (TBT)
- Cumulative Layout Shift (CLS)

Target metrik:
- Performance Score: ≥ 90/100
- Accessibility Score: ≥ 95/100
- Best Practices Score: ≥ 95/100
- SEO Score: ≥ 90/100

### 3.7.5 User Acceptance Testing

UAT dilakukan dengan melibatkan:
- 10 pengguna umum (masyarakat)
- 3 admin/operator sistem
- 2 petugas lapangan

Kriteria penerimaan:
- 90% pengguna dapat menyelesaikan task tanpa bantuan
- Rata-rata waktu submit laporan < 3 menit
- Tingkat kepuasan pengguna ≥ 4/5

## 3.8 Jadwal Penelitian

| No | Kegiatan | Bulan 1 | Bulan 2 | Bulan 3 | Bulan 4 |
|----|----------|---------|---------|---------|---------|
| 1 | Analisis Kebutuhan | ████ | | | |
| 2 | Perancangan Sistem | ████ | ████ | | |
| 3 | Implementasi Frontend | | ████ | ████ | |
| 4 | Implementasi Backend | | ████ | ████ | |
| 5 | Integrasi & Testing | | | ████ | ████ |
| 6 | Deployment & UAT | | | | ████ |
| 7 | Dokumentasi | ████ | ████ | ████ | ████ |

---

**Catatan:** Metodologi ini bersifat iteratif dan dapat disesuaikan berdasarkan feedback dan temuan selama proses pengembangan.
